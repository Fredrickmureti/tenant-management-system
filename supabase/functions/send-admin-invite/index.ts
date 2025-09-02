import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'

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
    
    const requestData = await req.json();
    console.log('Request data received:', JSON.stringify(requestData));
    
    const { inviteId, email, fullName, role, temporaryPassword } = requestData;
    console.log('Extracted fields:', { inviteId, email, fullName, role, hasPassword: !!temporaryPassword });

    if (!email || !fullName || !role || !temporaryPassword) {
      console.error('Missing required fields:', { email: !!email, fullName: !!fullName, role: !!role });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!resendApiKey) {
      console.error('Missing Resend API key');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Check if user already exists
    console.log('Checking for existing user with email:', email);
    const { data: existingUser, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error('Error listing users:', listUsersError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const existingUserData = existingUser.users?.find(user => user.email === email);
    
    if (existingUserData) {
      console.log('User already exists:', existingUserData.id);
      
      // Update their role if needed
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('user_id', existingUserData.id);
        
      if (updateError) {
        console.error('Error updating user role:', updateError);
      }

      // Send email with existing login credentials
      try {
        const emailResponse = await resend.emails.send({
          from: 'Mwanzo Flats Admin <onboarding@resend.dev>',
          to: [email],
          subject: `Your ${role} account is ready`,
          html: `
            <h1>Welcome back, ${fullName}!</h1>
            <p>Your account has been updated with ${role} privileges for Mwanzo Flats.</p>
            <p>You can log in using your existing credentials at:</p>
            <p><a href="https://fae818c2-826c-4cf6-bf3b-523dd7333715.sandbox.lovable.dev" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Log In Now</a></p>
            <p>If you've forgotten your password, you can reset it using the "Forgot Password" link.</p>
            <p>Best regards,<br>Mwanzo Flats Admin Team</p>
          `,
        });
        console.log('Email sent to existing user successfully:', emailResponse);
      } catch (emailError) {
        console.error('Error sending email to existing user:', emailError);
        return new Response(
          JSON.stringify({ error: 'Failed to send email notification' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User already exists - updated role and sent notification',
          userId: existingUserData.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create new user account with password
    console.log('Creating new user account...');
    
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: role
      }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User created successfully:', newUser.user.id);

    // Send email with login credentials
    try {
      const emailResponse = await resend.emails.send({
        from: 'Mwanzo Flats Admin <onboarding@resend.dev>',
        to: [email],
        subject: `Welcome! Your ${role} account is ready`,
        html: `
          <h1>Welcome, ${fullName}!</h1>
          <p>Your ${role} account has been created successfully for Mwanzo Flats.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          </div>
          <p><a href="https://fae818c2-826c-4cf6-bf3b-523dd7333715.sandbox.lovable.dev" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Log In Now</a></p>
          <p><strong>Important:</strong> Please change your password after your first login for security.</p>
          <p>Best regards,<br>Mwanzo Flats Admin Team</p>
        `,
      });
      console.log('Welcome email sent successfully:', emailResponse);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send welcome email' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const successResponse = {
      success: true,
      message: 'User account created and credentials sent',
      userId: newUser.user.id,
      debug: {
        inviteId,
        email,
        fullName,
        role
      }
    };
    
    console.log('Returning success response');

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