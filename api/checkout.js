const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

const PRICE_MAP = {
  'email-contact-analyzer': {
    monthly: process.env.STRIPE_PRICE_ECA_MONTHLY,
    annual:  process.env.STRIPE_PRICE_ECA_ANNUAL,
  }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, product, plan } = req.body;

    if (!product || !plan) return res.status(400).json({ error: 'Missing product or plan' });

    const priceId = PRICE_MAP[product]?.[plan];
    if (!priceId) return res.status(400).json({ error: 'Invalid product or plan' });

    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      customer_email: email || undefined,
      metadata: { product, email: email || '' },
      subscription_data: {
        metadata: { product, email: email || '' }
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancel`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
