-- The Search Room — searches.priority column + seed.
-- Applied to prod (nliftfmbsnplhrrdxqnx) on 2026-06-12 via Supabase MCP.
-- This file is the in-repo record / reproduction (no in-repo migration runner).
--
-- `priority` is the ops triage band that drives the /searchroom modules. It is
-- NOT derivable from status/deck_status, so it is a maintained field. Seeded
-- once from the 2026-06-11 board snapshot (data.json). Rows left NULL (new
-- searches) fall back to a status-derived band in the loader (see
-- src/app/searchroom/map.ts → priorityFor).

alter table public.searches add column if not exists priority text;
comment on column public.searches.priority is
  'Search Room triage band: needs_cut|offer|high|medium|hold. Owned by ops; drives /searchroom modules.';

update searches as s set priority = v.pri
from (values
  ('stada-bd','needs_cut'),('cgn-gca-ec','needs_cut'),('cgn-gca-wc','needs_cut'),('cgn-ma-bd','needs_cut'),
  ('borgwarner-sales','needs_cut'),('prenax-sales','needs_cut'),('norican-engineering','needs_cut'),('bfc-commercial','needs_cut'),
  ('triton-flokk','needs_cut'),('kennametal-tungsten','needs_cut'),('doncasters-securities','needs_cut'),('lea-finance','needs_cut'),
  ('doncasters-engineering','needs_cut'),('doncasters-facilities','needs_cut'),('doncasters-layout','needs_cut'),('borgwarner-torreon','needs_cut'),
  ('norican-hr','needs_cut'),('assertio-hr','needs_cut'),('norican-aftermarket','needs_cut'),('jll-riskmanager','needs_cut'),
  ('eb-hof','needs_cut'),('cgn-bd-corp','needs_cut'),('aon-totalrewardspartner','needs_cut'),('nor-vp-eng-fdy','needs_cut'),
  ('demo-cfo','medium'),('hlc-dir-ta','offer'),('aon-techgrowthleader','needs_cut'),('carbs-chair','needs_cut'),
  ('cgn-bdd','medium'),('pms-vp-hr','needs_cut'),('cgn-hr-bp-dir','offer'),('easybill-hof','needs_cut'),
  ('imp-cham-cam','medium'),('ktj-cor-ctl','needs_cut'),('don-ico-uk','medium'),('kar-opx','medium'),
  ('don-ci-na','medium'),('cgn-vp-bd-csm','needs_cut'),('ipro-pres-amcs','needs_cut'),('pnx-gm-se','needs_cut'),
  ('cgn-fd-mvn','needs_cut'),('don-itgc-na','offer'),('don-icof-na','medium'),('cvw-ops-dir','medium'),
  ('nor-swf-svp','needs_cut'),('ktj-corcon','needs_cut'),('don-gtc-mgr','needs_cut'),('htc-sem-ghq','hold'),
  ('prenax-cto','hold'),('triton-ocean','hold'),('hitachi-md-korea','hold'),('hitachi-re-se','hold'),
  ('hitachi-re-mea','hold'),('aon-partner','hold'),('doncasters-vp','hold'),('norican-sales','hold'),
  ('adama-finance','hold'),('kennametal-legal','hold'),('elopak-supply','hold'),('messer-plant','hold'),
  ('adapa-hr','hold'),('dywidag-pt','hold'),('regal-sales','hold'),('norican-product','hold'),
  ('norican-category','hold'),('pbv-comp-bens','hold'),('dywidag-ops','hold')
) as v(k,pri)
where s.search_key = v.k;
