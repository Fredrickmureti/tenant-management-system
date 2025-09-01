import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Initialize Supabase client with service role
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (existingUser.user) {
      console.log('User already exists:', existingUser.user.id);
      
      // Update their role if needed
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('user_id', existingUser.user.id);
        
      if (updateError) {
        console.error('Error updating user role:', updateError);
      }
      
      // Generate magic link for existing user
      const { data: magicLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${supabaseUrl.replace('.supabase.co', '')}.lovable.app`
        }
      });

      if (linkError) {
        console.error('Error generating magic link:', linkError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate login link' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Magic link generated for existing user');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User already exists - magic link ready',
          magicLink: magicLink.properties?.action_link,
          userId: existingUser.user.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create new user account
    console.log('Creating new user account...');
    
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
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

    // Generate magic link for the new user
    const { data: magicLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '')}.lovable.app`
      }
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'User created but failed to generate login link' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Magic link generated for new user');

    const successResponse = {
      success: true,
      message: 'User account created and invite ready',
      userId: newUser.user.id,
      magicLink: magicLink.properties?.action_link,
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