const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // CORS headers — extension needs to call this cross-origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, product } = req.query;

  if (!email || !product) {
    return res.status(400).json({ isPro: false, error: 'Missing email or product' });
  }

  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('status, plan, current_period_end')
      .eq('email', email.toLowerCase())
      .eq('product_id', product)
      .single();

    if (error || !data) {
      // No license found — free user
      return res.status(200).json({ isPro: false, plan: null });
    }

    // Active subscription OR canceled but still within paid period
    const isPro = data.status === 'active' ||
      (data.status === 'canceled' &&
       data.current_period_end &&
       new Date(data.current_period_end) > new Date());

    // Cache for 1 hour on CDN edge
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return res.status(200).json({
      isPro,
      plan: data.plan ?? null,
      expiresAt: data.current_period_end ?? null,
    });

  } catch (err) {
    console.error('License check error:', err);
    return res.status(500).json({ isPro: false, error: 'Server error' });
  }
};
