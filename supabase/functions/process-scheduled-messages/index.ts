import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const handler = async (req: Request): Promise<Response> => {
  try {
    console.log('Processing scheduled messages...');

    // Get scheduled messages that are due to be sent
    const now = new Date().toISOString();
    const { data: scheduledMessages, error: fetchError } = await supabase
      .from('communication_logs')
      .select(`
        *,
        tenants (*)
      `)
      .eq('status', 'scheduled')
      .lte('sent_at', now);

    if (fetchError) {
      throw new Error(`Error fetching scheduled messages: ${fetchError.message}`);
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      console.log('No scheduled messages found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No scheduled messages to process' 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${scheduledMessages.length} scheduled messages to process`);

    const results = [];

    for (const message of scheduledMessages) {
      try {
        const tenant = message.tenants;
        if (!tenant) {
          console.error(`Tenant not found for message ${message.id}`);
          continue;
        }

        let success = false;
        let errorMessage = '';

        if (message.type === 'email') {
          if (!tenant.email) {
            errorMessage = 'Tenant does not have an email address';
          } else {
            try {
              const emailResponse = await resend.emails.send({
                from: 'Property Management <noreply@resend.dev>',
                to: [tenant.email],
                subject: message.subject || 'Message from Property Management',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Hello ${tenant.name},</h2>
                    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="white-space: pre-wrap; line-height: 1.6;">${message.message}</p>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                      Best regards,<br>
                      Property Management Team
                    </p>
                  </div>
                `,
              });

              console.log('Scheduled email sent:', emailResponse);
              success = true;
            } catch (error: any) {
              console.error('Email error:', error);
              errorMessage = error.message;
            }
          }
        } else if (message.type === 'sms') {
          const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
          const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
          const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

          if (!accountSid || !authToken || !fromPhone) {
            errorMessage = 'Twilio credentials not configured';
          } else {
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
                  Body: message.message,
                }),
              });

              const result = await response.json();
              console.log('Scheduled SMS response:', result);

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
        }

        // Update message status
        const { error: updateError } = await supabase
          .from('communication_logs')
          .update({
            status: success ? 'sent' : 'failed',
            sent_at: new Date().toISOString()
          })
          .eq('id', message.id);

        if (updateError) {
          console.error('Error updating message status:', updateError);
        }

        results.push({
          messageId: message.id,
          success,
          error: errorMessage || null,
          tenant: tenant.name,
          type: message.type
        });

      } catch (error: any) {
        console.error(`Error processing message ${message.id}:`, error);
        results.push({
          messageId: message.id,
          success: false,
          error: error.message,
          tenant: message.tenants?.name || 'Unknown',
          type: message.type
        });
      }
    }

    console.log('Scheduled messages processing complete:', results);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in process-scheduled-messages function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);