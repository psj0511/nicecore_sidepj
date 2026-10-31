-- 광고 성과 이상 감지 시스템 스키마 (Task 006)

create table data_syncs (
  id uuid primary key default gen_random_uuid(),
  notion_database_id text not null unique,
  title text not null,
  status text not null check (status in ('success', 'failed')),
  row_count integer not null default 0,
  synced_at timestamptz not null default now()
);

create table ad_metrics (
  id uuid primary key default gen_random_uuid(),
  sync_id uuid not null references data_syncs(id) on delete cascade,
  date date not null,
  channel text not null check (channel in ('google', 'naver')),
  campaign text not null,
  ad_group text,
  spend numeric not null check (spend >= 0),
  impressions bigint not null check (impressions >= 0),
  clicks bigint not null check (clicks >= 0),
  conversions numeric not null check (conversions >= 0),
  revenue numeric not null check (revenue >= 0)
);
create index ad_metrics_date_idx on ad_metrics (date);
create index ad_metrics_sync_id_idx on ad_metrics (sync_id);

create table detection_rules (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique check (rule_code in ('R1','R2','R3','R4','R5','R6','R7','R8')),
  type text not null,
  severity text not null check (severity in ('critical', 'high', 'medium')),
  threshold jsonb not null default '{}'::jsonb,
  target_value numeric,
  target_type text check (target_type in ('cpa', 'roas')),
  is_active boolean not null default true,
  stage smallint not null check (stage in (1, 2)),
  -- 2단계 규칙은 활성화 불가
  check (stage = 1 or is_active = false)
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references detection_rules(id),
  sync_id uuid not null references data_syncs(id) on delete cascade,
  target text not null,
  target_date date not null,
  detection_key text not null unique,
  severity text not null check (severity in ('critical', 'high', 'medium')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'ignored')),
  baseline_value numeric not null,
  actual_value numeric not null,
  weekend_note text,
  memo text,
  detected_at timestamptz not null default now(),
  notion_url text
);
create index issues_target_date_idx on issues (target_date);
create index issues_sync_id_idx on issues (sync_id);
create index issues_status_severity_idx on issues (status, severity);

create table notion_configs (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  parent_page_id text not null,
  database_id text not null
);

-- RLS: 정책 없이 활성화 → anon/authenticated 접근 차단, 서버(service_role)만 접근
alter table data_syncs enable row level security;
alter table ad_metrics enable row level security;
alter table detection_rules enable row level security;
alter table issues enable row level security;
alter table notion_configs enable row level security;

-- Notion 설정은 단일 행만 허용
create unique index notion_configs_singleton on notion_configs ((true));
