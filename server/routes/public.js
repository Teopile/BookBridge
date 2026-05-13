import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { SearchSchema } from '../schemas.js';
import { getPublicStats, search, listApprovedSchools, getLeaderboard, getActivityFeed } from '../db/store.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime_s: Math.round(process.uptime()), node: process.version });
});

router.get('/stats', async (_req, res, next) => {
  try { res.json(await getPublicStats()); } catch (err) { next(err); }
});

router.get('/search', validate(SearchSchema, 'query'), async (req, res, next) => {
  try { res.json(await search(req.query)); } catch (err) { next(err); }
});

router.get('/site-content', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('site_content').select('*');
    if (error) throw error;
    const byKey = Object.fromEntries((data || []).map((r) => [r.key, { en: r.value_en, ka: r.value_ka }]));
    res.json(byKey);
  } catch (err) { next(err); }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
    res.json(await getLeaderboard(limit));
  } catch (err) { next(err); }
});

router.get('/activity', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 8));
    res.json(await getActivityFeed(limit));
  } catch (err) { next(err); }
});

router.get('/regions', async (_req, res, next) => {
  try {
    const schools = await listApprovedSchools({ limit: 500 });
    const regions = {};
    for (const s of schools) {
      if (!s.region) continue;
      regions[s.region] = (regions[s.region] || 0) + 1;
    }
    res.json(Object.entries(regions).map(([region, count]) => ({ region, count })));
  } catch (err) { next(err); }
});

export default router;
