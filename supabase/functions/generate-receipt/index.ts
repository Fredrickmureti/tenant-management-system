import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptRequest {
  tenantId: string;
  billingCycleId: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const generateReceiptHTML = (tenant: any, billingCycle: any, payments: any[]) => {
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const billAmount = Number(billingCycle.bill_amount || 0);
  const balance = billAmount - totalPaid;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .row { display: flex; justify-content: space-between; margin: 10px 0; }
        .total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 10px; }
        .payments { margin: 20px 0; }
        .payment-item { padding: 10px; border-bottom: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>PAYMENT RECEIPT</h1>
          <p>Mwanzo Flats Management System</p>
        </div>
        
        <div class="content">
          <h3>Tenant Information</h3>
          <div class="row">
            <span>Name:</span>
            <span>${tenant.name}</span>
          </div>
          <div class="row">
            <span>Unit:</span>
            <span>${tenant.house_unit_number}</span>
          </div>
          <div class="row">
            <span>Meter Number:</span>
            <span>${tenant.meter_connection_number}</span>
          </div>
          
          <h3>Billing Period</h3>
          <div class="row">
            <span>Period:</span>
            <span>${billingCycle.month}/${billingCycle.year}</span>
          </div>
          <div class="row">
            <span>Previous Reading:</span>
            <span>${billingCycle.previous_reading}</span>
          </div>
          <div class="row">
            <span>Current Reading:</span>
            <span>${billingCycle.current_reading}</span>
          </div>
          <div class="row">
            <span>Units Consumed:</span>
            <span>${Number(billingCycle.current_reading) - Number(billingCycle.previous_reading)}</span>
          </div>
          <div class="row">
            <span>Rate per Unit:</span>
            <span>KES ${billingCycle.rate_per_unit}</span>
          </div>
          
          <h3>Payment Summary</h3>
          <div class="row">
            <span>Previous Balance:</span>
            <span>KES ${billingCycle.previous_balance}</span>
          </div>
          <div class="row">
            <span>Current Charges:</span>
            <span>KES ${(Number(billingCycle.current_reading) - Number(billingCycle.previous_reading)) * Number(billingCycle.rate_per_unit)}</span>
          </div>
          <div class="row">
            <span>Total Bill Amount:</span>
            <span>KES ${billAmount}</span>
          </div>
          
          <div class="payments">
            <h4>Payments Received</h4>
            ${payments.map(payment => `
              <div class="payment-item">
                <div class="row">
                  <span>${new Date(payment.payment_date).toLocaleDateString()}</span>
                  <span>KES ${payment.amount} (${payment.payment_method})</span>
                </div>
                ${payment.notes ? `<div style="font-size: 12px; color: #666;">${payment.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
          
          <div class="row total">
            <span>Total Paid:</span>
            <span>KES ${totalPaid.toFixed(2)}</span>
          </div>
          <div class="row total">
            <span>${balance >= 0 ? 'Outstanding Balance:' : 'Overpayment:'}</span>
            <span>KES ${Math.abs(balance).toFixed(2)}</span>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            <p>Receipt generated on ${new Date().toLocaleDateString()}</p>
            <p>Thank you for your payment!</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, billingCycleId }: ReceiptRequest = await req.json();

    console.log('Generating receipt for:', { tenantId, billingCycleId });

    // Get tenant information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found');
    }

    if (!tenant.email) {
      throw new Error('Tenant does not have an email address');
    }

    // Get billing cycle information
    const { data: billingCycle, error: cycleError } = await supabase
      .from('billing_cycles')
      .select('*')
      .eq('id', billingCycleId)
      .single();

    if (cycleError || !billingCycle) {
      throw new Error('Billing cycle not found');
    }

    // Get payments for this billing cycle
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('billing_cycle_id', billingCycleId)
      .order('payment_date', { ascending: true });

    if (paymentsError) {
      throw new Error('Error fetching payments');
    }

    // Generate receipt HTML
    const receiptHTML = generateReceiptHTML(tenant, billingCycle, payments || []);

    // Send email with receipt
    const emailResponse = await resend.emails.send({
      from: 'Mwanzo Flats <noreply@resend.dev>',
      to: [tenant.email],
      subject: `Payment Receipt - ${billingCycle.month}/${billingCycle.year}`,
      html: receiptHTML,
    });

    console.log('Receipt email sent:', emailResponse);

    // Get current user for logging
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (!userError && user) {
      // Log the receipt generation
      await supabase
        .from('communication_logs')
        .insert({
          tenant_id: tenantId,
          sent_by: user.id,
          type: 'email',
          subject: `Payment Receipt - ${billingCycle.month}/${billingCycle.year}`,
          message: 'Payment receipt generated and sent via email',
          status: 'sent',
          sent_at: new Date().toISOString()
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Receipt generated and sent successfully',
      emailId: emailResponse.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-receipt function:', error);
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