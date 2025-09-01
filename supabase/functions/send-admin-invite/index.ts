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
    console.log('=== FUNCTION STARTED ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    // Test endpoint - just return success without doing anything
    if (req.url.includes('test')) {
      console.log('Test endpoint hit');
      return new Response(
        JSON.stringify({ success: true, message: 'Test endpoint working' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let requestData;
    try {
      requestData = await req.json();
      console.log('Request data received:', JSON.stringify(requestData));
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error('Invalid JSON in request body');
    }
    
    const { inviteId, email, fullName, role } = requestData;
    console.log('Extracted fields:', { inviteId, email, fullName, role });

    if (!email || !fullName || !role) {
      console.error('Missing required fields:', { email: !!email, fullName: !!fullName, role: !!role });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('Environment check:');
    console.log('- RESEND_API_KEY present:', !!resendApiKey);
    console.log('- RESEND_API_KEY length:', resendApiKey ? resendApiKey.length : 0);
    console.log('- SUPABASE_URL present:', !!supabaseUrl);
    console.log('- SUPABASE_URL value:', supabaseUrl);
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'Email service not configured - missing RESEND_API_KEY' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!supabaseUrl) {
      console.error('SUPABASE_URL not found');
      return new Response(
        JSON.stringify({ error: 'SUPABASE_URL not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create the signup link
    const signupUrl = `${supabaseUrl}/auth/v1/signup`;
    const inviteLink = `${signupUrl}?email=${encodeURIComponent(email)}&full_name=${encodeURIComponent(fullName)}&role=${role}`;
    console.log('Generated invite link:', inviteLink);

    // Prepare email content
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

    console.log('Preparing to send email to:', email);
    console.log('Email subject:', emailSubject);

    // Send email via Resend
    const emailPayload = {
      from: 'Water Billing System <onboarding@resend.dev>',
      to: [email],
      subject: emailSubject,
      html: emailHtml,
    };
    
    console.log('Email payload:', JSON.stringify(emailPayload, null, 2));

    console.log('Making request to Resend API...');
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('Resend response status:', emailResponse.status);
    console.log('Resend response headers:', Object.fromEntries(emailResponse.headers.entries()));

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error response:', errorData);
      
      // Handle all Resend API errors gracefully - return 4xx instead of throwing
      let errorMessage = 'Email service error';
      let statusCode = 400;
      
      if (emailResponse.status === 403) {
        if (errorData.includes('verify a domain') || errorData.includes('testing emails')) {
          errorMessage = 'Email service requires domain verification. For testing, you can only send emails to dominicmugendi9@gmail.com, or verify a domain at resend.com/domains';
          statusCode = 403;
        } else if (errorData.includes('Client blocked')) {
          errorMessage = 'Email sending blocked by security filter. Please verify your domain at resend.com/domains';
          statusCode = 403;
        } else {
          errorMessage = 'Email sending permission denied. Verify your domain or API key.';
          statusCode = 403;
        }
      } else if (emailResponse.status === 429) {
        errorMessage = 'Email sending rate limit exceeded. Please try again later.';
        statusCode = 429;
      } else if (emailResponse.status === 422) {
        errorMessage = 'Invalid email address or content format.';
        statusCode = 422;
      } else {
        errorMessage = `Email service error (${emailResponse.status}): ${errorData}`;
        statusCode = 400;
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: emailResponse.status,
          details: errorData,
          suggestion: emailResponse.status === 403 ? 'Try using dominicmugendi9@gmail.com for testing' : undefined
        }),
        { 
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    const successResponse = {
      success: true,
      message: 'Invitation sent successfully',
      emailId: emailResult.id,
      debug: {
        inviteId,
        email,
        fullName,
        role,
        inviteLink
      }
    };
    
    console.log('Returning success response:', successResponse);

    return new Response(
      JSON.stringify(successResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    const errorResponse = {
      error: error.message || 'Internal server error',
      details: error.stack || 'No stack trace available'
    };
    
    console.log('Returning error response:', errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});