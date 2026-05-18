const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Required: tell Vercel not to parse the body so we can verify Stripe signature
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const sub = event.data.object;

  // Handle subscription events
  if ([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted'
  ].includes(event.type)) {

    const email = sub.metadata?.email;
    const product = sub.metadata?.product;

    if (!email || !product) {
      console.log('Missing email or product in metadata, skipping');
      return res.json({ received: true });
    }

    // Determine plan from lookup key
    const lookupKey = sub.items?.data?.[0]?.price?.lookup_key || '';
    const plan = lookupKey.includes('annual') ? 'annual' : 'monthly';

    // Map Stripe status to our status
    const status = sub.status; // active, past_due, canceled, etc.

    const { error } = await supabase.from('licenses').upsert({
      email: email.toLowerCase(),
      product_id: product,
      plan,
      status,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    }, {
      onConflict: 'email,product_id'
    });

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log(`License updated: ${email} / ${product} / ${status}`);
  }

  res.json({ received: true });
};

// Required config for Stripe webhook signature verification
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
