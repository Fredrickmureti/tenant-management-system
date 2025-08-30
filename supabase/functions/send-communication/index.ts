import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommunicationRequest {
  type: 'email' | 'sms';
  recipient: string; // tenant ID
  subject?: string;
  message: string;
  scheduledFor?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipient, subject, message, scheduledFor }: CommunicationRequest = await req.json();

    console.log('Sending communication:', { type, recipient, subject: subject || 'N/A', scheduledFor });

    // Get tenant information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', recipient)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found');
    }

    // Get current user from auth header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // If scheduled for later, just save to database and return
    if (scheduledFor) {
      const { error: logError } = await supabase
        .from('communication_logs')
        .insert({
          tenant_id: recipient,
          sent_by: user.id,
          type,
          subject: subject || null,
          message,
          status: 'scheduled',
          sent_at: scheduledFor
        });

      if (logError) throw logError;

      return new Response(JSON.stringify({ success: true, scheduled: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let success = false;
    let errorMessage = '';

    if (type === 'email') {
      if (!tenant.email) {
        throw new Error('Tenant does not have an email address');
      }

      try {
        const emailResponse = await resend.emails.send({
          from: 'Property Management <noreply@resend.dev>',
          to: [tenant.email],
          subject: subject || 'Message from Property Management',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hello ${tenant.name},</h2>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
              </div>
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                Property Management Team
              </p>
            </div>
          `,
        });

        console.log('Email sent:', emailResponse);
        success = true;
      } catch (error: any) {
        console.error('Email error:', error);
        errorMessage = error.message;
      }
    } else if (type === 'sms') {
      // SMS using Twilio
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (!accountSid || !authToken || !fromPhone) {
        throw new Error('Twilio credentials not configured');
      }

      try {
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: fromPhone,
            To: tenant.phone,
            Body: message,
          }),
        });

        const result = await response.json();
        console.log('SMS response:', result);

        if (response.ok) {
          success = true;
        } else {
          errorMessage = result.message || 'Failed to send SMS';
        }
      } catch (error: any) {
        console.error('SMS error:', error);
        errorMessage = error.message;
      }
    }

    // Log the communication attempt
    const { error: logError } = await supabase
      .from('communication_logs')
      .insert({
        tenant_id: recipient,
        sent_by: user.id,
        type,
        subject: subject || null,
        message,
        status: success ? 'sent' : 'failed',
        sent_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging communication:', logError);
    }

    if (!success) {
      throw new Error(errorMessage || 'Failed to send communication');
    }

    return new Response(JSON.stringify({ success: true, type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-communication function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);