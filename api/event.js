// POST /api/event  — anonymous funnel analytics for Email Contact Analyzer.
// Stores: event name, random install id, extension version, a few counts/flags.
// Never receives or stores email addresses, names, subjects or message content.
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ALLOWED_EVENTS = new Set([
  'first_open', 'app_open', 'signed_in',
  'scan_started', 'scan_completed', 'limit_hit',
  'trial_started',
  'upgrade_prompt_shown', 'upgrade_plan_selected', 'upgrade_clicked',
  'checkout_opened', 'checkout_failed', 'promo_clicked', 'upgrade_dismissed',
  'pro_activated',
  'feature_search', 'feature_create_contact', 'feature_bulk_delete',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { install_id, event, ext_version, props } = req.body || {};

    if (!UUID_RE.test(install_id || '')) return res.status(400).json({ error: 'bad install_id' });
    if (!ALLOWED_EVENTS.has(event)) return res.status(400).json({ error: 'unknown event' });

    // Keep only primitive values, short strings, small payload.
    const clean = {};
    for (const [k, v] of Object.entries(props || {}).slice(0, 12)) {
      if (typeof v === 'number' || typeof v === 'boolean') clean[k] = v;
      else if (typeof v === 'string') clean[k] = v.slice(0, 80);
    }

    const { error } = await supabase.from('events').insert({
      install_id,
      event,
      ext_version: String(ext_version || '').slice(0, 20),
      props: clean,
    });
    if (error) {
      console.error('events insert error:', error.message);
      return res.status(500).json({ error: 'db' });
    }
    return res.status(204).end();
  } catch (err) {
    console.error('event error:', err);
    return res.status(500).json({ error: 'server' });
  }
};
