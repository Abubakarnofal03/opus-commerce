import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');
    if (!firebaseServerKey) {
      throw new Error('FIREBASE_SERVER_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order } = await req.json();
    
    if (!order) {
      throw new Error('Order data is required');
    }

    console.log('Sending push notification for order:', order.order_number);

    // Get all admin device tokens
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admins found');
      return new Response(JSON.stringify({ success: true, message: 'No admins to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminUserIds = adminRoles.map(r => r.user_id);

    // Get device tokens for admins
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('fcm_token')
      .in('user_id', adminUserIds);

    if (tokensError) {
      console.error('Error fetching device tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No device tokens found for admins');
      return new Response(JSON.stringify({ success: true, message: 'No devices registered' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Sending notification to ${tokens.length} devices`);

    // Calculate order total
    const totalAmount = order.total_amount || 0;

    // Send FCM notification to all admin devices
    const fcmPromises = tokens.map(async (tokenData) => {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${firebaseServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: tokenData.fcm_token,
          notification: {
            title: `New Order #${order.order_number}`,
            body: `${order.first_name} ${order.last_name} - Rs. ${totalAmount.toLocaleString()}`,
            icon: '/logo.jpg',
            click_action: 'OPEN_ADMIN_ORDERS',
          },
          data: {
            orderId: order.id,
            orderNumber: order.order_number.toString(),
            type: 'new_order',
          },
        }),
      });

      const result = await response.json();
      console.log('FCM response:', result);
      return result;
    });

    const results = await Promise.all(fcmPromises);

    return new Response(JSON.stringify({ 
      success: true, 
      notificationsSent: tokens.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending push notification:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
