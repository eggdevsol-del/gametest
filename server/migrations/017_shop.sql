-- The family shop. Every XP bundle and Island Club month bought for a kid (lesson packs go in entitlements, since
-- they're the whole family's): what, for whom, how much XP, and whether it was an App Store or a test purchase. Each
-- App Store transaction is kept once, so it can't be granted twice; original_id ties an Island Club's monthly renewals
-- (and refunds) back to the kid it was bought for.
create table if not exists purchases (
  id text primary key,
  original_id text,
  family_id text not null references families(id) on delete cascade,
  kid_id text,
  product_id text not null,
  xp integer not null default 0,
  source text not null check (source in ('app_store', 'test', 'grant')),
  environment text,
  created_at timestamptz not null default now(),
  refunded_at timestamptz
);
create index if not exists purchases_family on purchases (family_id, created_at desc);
create index if not exists purchases_original on purchases (original_id);

-- Kids' wishes from the island shop ("Ask a grown-up" when they're short of XP), and when one was granted.
create table if not exists shop_wishes (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  item text not null,
  xp_needed integer not null default 0,
  wished_at timestamptz not null default now(),
  granted_at timestamptz
);
create index if not exists shop_wishes_family on shop_wishes (family_id, kid_id, wished_at desc);
