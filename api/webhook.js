const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify shared secret instead of Stripe signature (Vercel parses body before we can verify)
  const secret = req.query.secret || req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    console.error('Invalid webhook secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const event = req.body;
  const sub = event.data?.object;

  if (!sub) {
    return res.status(400).json({ error: 'Invalid event' });
  }

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

    // Determine plan from price interval
    const interval = sub.items?.data?.[0]?.price?.recurring?.interval || 'month';
    const plan = interval === 'year' ? 'annual' : 'monthly';

    const status = sub.status;

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
