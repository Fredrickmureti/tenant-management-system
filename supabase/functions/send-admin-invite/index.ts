import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Function started, parsing request...');
    const requestData = await req.json();
    console.log('Request data:', requestData);
    
    const { inviteId, email, fullName, role } = requestData;

    if (!email || !fullName || !role) {
      console.error('Missing required fields:', { email, fullName, role });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the Resend API key from environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('RESEND_API_KEY present:', !!resendApiKey);
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create the signup link with role metadata
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    console.log('SUPABASE_URL present:', !!supabaseUrl);
    
    const signupUrl = `${supabaseUrl}/auth/v1/signup`;
    const inviteLink = `${signupUrl}?email=${encodeURIComponent(email)}&full_name=${encodeURIComponent(fullName)}&role=${role}`;
    
    console.log('Generated invite link:', inviteLink);

    // Prepare the email content
    const emailSubject = `Invitation to join Water Billing System as ${role.charAt(0).toUpperCase() + role.slice(1)}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">You're Invited to Join Water Billing System</h2>
        
        <p>Hello ${fullName},</p>
        
        <p>You have been invited to join the Water Billing System as a <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong>.</p>
        
        <p>To accept this invitation and create your account, please click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
          ${inviteLink}
        </p>
        
        <p>This invitation will expire in 7 days.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    console.log('Attempting to send email via Resend...');

    // Send the email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Water Billing System <onboarding@resend.dev>',
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    console.log('Resend response status:', emailResponse.status);

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        emailId: emailResult.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-admin-invite function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});