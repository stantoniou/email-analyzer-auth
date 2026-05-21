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

  // Ignore events older than 24 hours to prevent stale retries overwriting current state
  const eventAge = Date.now() - (event.created * 1000);
  if (eventAge > 24 * 60 * 60 * 1000) {
    console.log('Ignoring stale event:', event.id, 'age:', Math.round(eventAge / 3600000), 'hours');
    return res.json({ received: true });
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

    const interval = sub.items?.data?.[0]?.price?.recurring?.interval || 'month';
    const plan = interval === 'year' ? 'annual' : 'monthly';
    const status = sub.status;

    // Safe date conversion
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    const { error } = await supabase.from('licenses').upsert({
      email: email.toLowerCase(),
      product_id: product,
      plan,
      status,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd,
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
