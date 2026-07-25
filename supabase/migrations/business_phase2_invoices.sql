create extension if not exists "pgcrypto";

alter table public.business_profiles
  add column if not exists default_invoice_series text not null default 'GENERAL',
  add column if not exists default_due_days integer not null default 30,
  add column if not exists default_invoice_notes text,
  add column if not exists default_payment_terms text,
  add column if not exists default_internal_notes text,
  add column if not exists default_invoice_footer text,
  add column if not exists default_payment_method text;

create table if not exists public.business_document_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid not null references public.business_profiles(id) on delete cascade,
  document_type text not null check (document_type in ('invoice')),
  series text not null default 'GENERAL',
  document_year integer not null check (document_year >= 2000),
  last_number integer not null default 0 check (last_number >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, business_profile_id, document_type, series, document_year)
);

create table if not exists public.business_tax_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null,
  country_code text,
  rate numeric(7,4) not null default 0 check (rate >= 0),
  is_default boolean not null default false,
  is_withholding boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.business_products_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid not null references public.business_profiles(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'service')),
  name text not null,
  description text,
  reference text,
  unit text not null default 'unidad',
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  tax_rate_id uuid references public.business_tax_rates(id) on delete set null,
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.business_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid not null references public.business_profiles(id) on delete cascade,
  client_id uuid not null references public.business_clients(id) on delete restrict,
  financial_account_id uuid references public.business_financial_accounts(id) on delete set null,
  invoice_number text,
  sequence_series text not null default 'GENERAL',
  sequence_year integer,
  sequence_number integer,
  issue_date date not null default current_date,
  due_date date not null default current_date,
  currency text not null default 'MAD',
  invoice_language text not null default 'Español' check (invoice_language in ('Español', 'Francés', 'Árabe', 'Inglés')),
  status text not null default 'draft' check (status in ('draft', 'issued', 'pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  payment_method text,
  reference text,
  notes text,
  payment_terms text,
  internal_notes text,
  footer_text text,
  subtotal_amount numeric(14,2) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  taxable_base_amount numeric(14,2) not null default 0 check (taxable_base_amount >= 0),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  withholding_amount numeric(14,2) not null default 0 check (withholding_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  balance_due_amount numeric(14,2) not null default 0 check (balance_due_amount >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  cancelled_at timestamptz,
  check (due_date >= issue_date),
  check (
    (invoice_number is null and sequence_number is null and sequence_year is null)
    or (invoice_number is not null and sequence_number is not null and sequence_year is not null)
  )
);

create table if not exists public.business_invoice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid not null references public.business_profiles(id) on delete cascade,
  invoice_id uuid not null references public.business_invoices(id) on delete cascade,
  product_service_id uuid references public.business_products_services(id) on delete set null,
  position integer not null default 1 check (position > 0),
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null default 'unidad',
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  discount_rate numeric(7,4) not null default 0 check (discount_rate >= 0),
  tax_rate_id uuid references public.business_tax_rates(id) on delete set null,
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  withholding_rate numeric(7,4) not null default 0 check (withholding_rate >= 0),
  line_subtotal_amount numeric(14,2) not null default 0 check (line_subtotal_amount >= 0),
  line_taxable_base_amount numeric(14,2) not null default 0 check (line_taxable_base_amount >= 0),
  line_tax_amount numeric(14,2) not null default 0 check (line_tax_amount >= 0),
  line_withholding_amount numeric(14,2) not null default 0 check (line_withholding_amount >= 0),
  line_total_amount numeric(14,2) not null default 0 check (line_total_amount >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid not null references public.business_profiles(id) on delete cascade,
  invoice_id uuid not null references public.business_invoices(id) on delete cascade,
  financial_account_id uuid references public.business_financial_accounts(id) on delete set null,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'MAD',
  payment_method text,
  reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_tax_rates_user_name_unique_idx
  on public.business_tax_rates (user_id, lower(name))
  where deleted_at is null;

create unique index if not exists business_products_services_user_name_unique_idx
  on public.business_products_services (user_id, lower(name))
  where deleted_at is null;

create unique index if not exists business_invoices_user_invoice_number_unique_idx
  on public.business_invoices (user_id, lower(invoice_number))
  where invoice_number is not null and deleted_at is null;

create unique index if not exists business_invoice_items_invoice_position_unique_idx
  on public.business_invoice_items (invoice_id, position);

create index if not exists business_document_sequences_profile_idx
  on public.business_document_sequences (business_profile_id, document_type, series, document_year);

create index if not exists business_tax_rates_profile_idx
  on public.business_tax_rates (business_profile_id, status);

create index if not exists business_products_services_profile_idx
  on public.business_products_services (business_profile_id, status);

create index if not exists business_invoices_profile_idx
  on public.business_invoices (business_profile_id, status, issue_date desc);

create index if not exists business_invoices_client_idx
  on public.business_invoices (client_id, issue_date desc);

create index if not exists business_invoices_due_date_idx
  on public.business_invoices (due_date, status);

create index if not exists business_invoice_items_invoice_idx
  on public.business_invoice_items (invoice_id, position);

create index if not exists business_invoice_payments_invoice_idx
  on public.business_invoice_payments (invoice_id, payment_date desc);

drop trigger if exists trg_business_document_sequences_updated_at on public.business_document_sequences;
create trigger trg_business_document_sequences_updated_at
before update on public.business_document_sequences
for each row execute function public.tacoplan_set_updated_at();

drop trigger if exists trg_business_tax_rates_updated_at on public.business_tax_rates;
create trigger trg_business_tax_rates_updated_at
before update on public.business_tax_rates
for each row execute function public.tacoplan_set_updated_at();

drop trigger if exists trg_business_products_services_updated_at on public.business_products_services;
create trigger trg_business_products_services_updated_at
before update on public.business_products_services
for each row execute function public.tacoplan_set_updated_at();

drop trigger if exists trg_business_invoices_updated_at on public.business_invoices;
create trigger trg_business_invoices_updated_at
before update on public.business_invoices
for each row execute function public.tacoplan_set_updated_at();

drop trigger if exists trg_business_invoice_items_updated_at on public.business_invoice_items;
create trigger trg_business_invoice_items_updated_at
before update on public.business_invoice_items
for each row execute function public.tacoplan_set_updated_at();

drop trigger if exists trg_business_invoice_payments_updated_at on public.business_invoice_payments;
create trigger trg_business_invoice_payments_updated_at
before update on public.business_invoice_payments
for each row execute function public.tacoplan_set_updated_at();

create or replace function public.business_round_money(p_amount numeric)
returns numeric
language sql
immutable
as $$
  select round(coalesce(p_amount, 0), 2);
$$;

create or replace function public.business_resolve_invoice_status(
  p_current_status text,
  p_due_date date,
  p_total_amount numeric,
  p_paid_amount numeric
)
returns text
language plpgsql
stable
as $$
declare
  v_total numeric(14,2) := public.business_round_money(coalesce(p_total_amount, 0));
  v_paid numeric(14,2) := public.business_round_money(coalesce(p_paid_amount, 0));
  v_balance numeric(14,2) := public.business_round_money(v_total - v_paid);
begin
  if p_current_status = 'draft' then
    return 'draft';
  end if;

  if p_current_status = 'cancelled' then
    return 'cancelled';
  end if;

  if v_balance <= 0 and v_total > 0 then
    return 'paid';
  end if;

  if v_paid > 0 and v_balance > 0 then
    return 'partially_paid';
  end if;

  if p_due_date < current_date and v_balance > 0 then
    return 'overdue';
  end if;

  return 'pending';
end;
$$;

create or replace function public.business_allocate_invoice_number(
  p_business_profile_id uuid,
  p_series text default null,
  p_issue_date date default current_date
)
returns table (
  invoice_number text,
  sequence_series text,
  sequence_year integer,
  sequence_number integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.business_profiles%rowtype;
  v_series text := coalesce(nullif(trim(p_series), ''), 'GENERAL');
  v_year integer := extract(year from coalesce(p_issue_date, current_date))::integer;
  v_allocated integer;
  v_prefix text;
begin
  if v_user_id is null then
    raise exception 'Sesión no válida para asignar numeración.';
  end if;

  select *
  into v_profile
  from public.business_profiles
  where id = p_business_profile_id
    and user_id = v_user_id
    and deleted_at is null;

  if not found then
    raise exception 'No se encontró el perfil del negocio.';
  end if;

  v_prefix := coalesce(nullif(trim(v_profile.invoice_prefix), ''), 'FAC');

  insert into public.business_document_sequences (
    user_id,
    business_profile_id,
    document_type,
    series,
    document_year,
    last_number,
    created_by
  )
  values (
    v_user_id,
    p_business_profile_id,
    'invoice',
    v_series,
    v_year,
    greatest(coalesce(v_profile.next_invoice_number, 1), 1),
    v_user_id
  )
  on conflict (user_id, business_profile_id, document_type, series, document_year)
  do update
    set last_number = public.business_document_sequences.last_number + 1,
        updated_at = now()
  returning public.business_document_sequences.last_number
  into v_allocated;

  update public.business_profiles
  set next_invoice_number = greatest(v_allocated + 1, next_invoice_number)
  where id = p_business_profile_id
    and user_id = v_user_id;

  invoice_number := case
    when v_series = 'GENERAL' then format('%s-%s-%s', v_prefix, v_year, lpad(v_allocated::text, 4, '0'))
    else format('%s-%s-%s-%s', v_prefix, v_series, v_year, lpad(v_allocated::text, 4, '0'))
  end;
  sequence_series := v_series;
  sequence_year := v_year;
  sequence_number := v_allocated;

  return next;
end;
$$;

create or replace function public.business_refresh_invoice_totals(
  p_invoice_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice public.business_invoices%rowtype;
  v_subtotal numeric(14,2) := 0;
  v_discount numeric(14,2) := 0;
  v_taxable numeric(14,2) := 0;
  v_tax numeric(14,2) := 0;
  v_withholding numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_paid numeric(14,2) := 0;
  v_balance numeric(14,2) := 0;
begin
  select *
  into v_invoice
  from public.business_invoices
  where id = p_invoice_id
    and user_id = auth.uid()
    and deleted_at is null;

  if not found then
    raise exception 'No se encontró la factura.';
  end if;

  select
    coalesce(sum(line_subtotal_amount), 0),
    coalesce(sum(discount_amount), 0),
    coalesce(sum(line_taxable_base_amount), 0),
    coalesce(sum(line_tax_amount), 0),
    coalesce(sum(line_withholding_amount), 0),
    coalesce(sum(line_total_amount), 0)
  into
    v_subtotal,
    v_discount,
    v_taxable,
    v_tax,
    v_withholding,
    v_total
  from public.business_invoice_items
  where invoice_id = p_invoice_id;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.business_invoice_payments
  where invoice_id = p_invoice_id;

  v_subtotal := public.business_round_money(v_subtotal);
  v_discount := public.business_round_money(v_discount);
  v_taxable := public.business_round_money(v_taxable);
  v_tax := public.business_round_money(v_tax);
  v_withholding := public.business_round_money(v_withholding);
  v_total := public.business_round_money(v_total);
  v_paid := public.business_round_money(v_paid);
  v_balance := public.business_round_money(v_total - v_paid);

  update public.business_invoices
  set subtotal_amount = v_subtotal,
      discount_amount = v_discount,
      taxable_base_amount = v_taxable,
      tax_amount = v_tax,
      withholding_amount = v_withholding,
      total_amount = v_total,
      paid_amount = v_paid,
      balance_due_amount = greatest(v_balance, 0),
      status = public.business_resolve_invoice_status(v_invoice.status, v_invoice.due_date, v_total, v_paid)
  where id = p_invoice_id;
end;
$$;

create or replace function public.business_create_invoice(
  p_business_profile_id uuid,
  p_client_id uuid,
  p_issue_date date default current_date,
  p_due_date date default null,
  p_currency text default null,
  p_invoice_language text default null,
  p_series text default null,
  p_payment_method text default null,
  p_financial_account_id uuid default null,
  p_reference text default null,
  p_notes text default null,
  p_payment_terms text default null,
  p_internal_notes text default null,
  p_footer_text text default null,
  p_save_mode text default 'draft',
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.business_profiles%rowtype;
  v_client public.business_clients%rowtype;
  v_invoice_id uuid;
  v_number record;
  v_due_date date;
  v_status text;
  v_line jsonb;
  v_position integer := 0;
  v_product public.business_products_services%rowtype;
  v_tax_rate public.business_tax_rates%rowtype;
  v_description text;
  v_quantity numeric(14,3);
  v_unit text;
  v_unit_price numeric(14,2);
  v_discount_amount numeric(14,2);
  v_discount_rate numeric(7,4);
  v_tax_rate_value numeric(7,4);
  v_withholding_rate numeric(7,4);
  v_line_subtotal numeric(14,2);
  v_line_taxable numeric(14,2);
  v_line_tax numeric(14,2);
  v_line_withholding numeric(14,2);
  v_line_total numeric(14,2);
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear facturas.';
  end if;

  if p_save_mode not in ('draft', 'issue') then
    raise exception 'Modo de guardado no válido. Usa draft o issue.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes indicar al menos una línea válida.';
  end if;

  select *
  into v_profile
  from public.business_profiles
  where id = p_business_profile_id
    and user_id = v_user_id
    and deleted_at is null;

  if not found then
    raise exception 'No se encontró el perfil del negocio.';
  end if;

  select *
  into v_client
  from public.business_clients
  where id = p_client_id
    and user_id = v_user_id
    and deleted_at is null;

  if not found then
    raise exception 'El cliente seleccionado no existe o no pertenece a tu negocio.';
  end if;

  if p_financial_account_id is not null and not exists (
    select 1
    from public.business_financial_accounts account
    where account.id = p_financial_account_id
      and account.user_id = v_user_id
      and account.deleted_at is null
  ) then
    raise exception 'La cuenta financiera seleccionada no es válida.';
  end if;

  v_due_date := coalesce(p_due_date, coalesce(p_issue_date, current_date) + coalesce(v_profile.default_due_days, 30));

  if v_due_date < coalesce(p_issue_date, current_date) then
    raise exception 'La fecha de vencimiento no puede ser anterior a la fecha de emisión.';
  end if;

  if p_save_mode = 'issue' then
    select *
    into v_number
    from public.business_allocate_invoice_number(
      p_business_profile_id => p_business_profile_id,
      p_series => coalesce(nullif(trim(p_series), ''), v_profile.default_invoice_series),
      p_issue_date => coalesce(p_issue_date, current_date)
    );

    v_status := 'pending';
  else
    v_status := 'draft';
  end if;

  insert into public.business_invoices (
    user_id,
    business_profile_id,
    client_id,
    financial_account_id,
    invoice_number,
    sequence_series,
    sequence_year,
    sequence_number,
    issue_date,
    due_date,
    currency,
    invoice_language,
    status,
    payment_method,
    reference,
    notes,
    payment_terms,
    internal_notes,
    footer_text,
    created_by
  )
  values (
    v_user_id,
    p_business_profile_id,
    p_client_id,
    p_financial_account_id,
    case when p_save_mode = 'issue' then v_number.invoice_number else null end,
    coalesce(case when p_save_mode = 'issue' then v_number.sequence_series end, coalesce(nullif(trim(p_series), ''), v_profile.default_invoice_series)),
    case when p_save_mode = 'issue' then v_number.sequence_year else null end,
    case when p_save_mode = 'issue' then v_number.sequence_number else null end,
    coalesce(p_issue_date, current_date),
    v_due_date,
    coalesce(nullif(trim(p_currency), ''), v_profile.currency),
    coalesce(nullif(trim(p_invoice_language), ''), v_profile.invoice_language),
    v_status,
    coalesce(nullif(trim(p_payment_method), ''), v_profile.default_payment_method),
    nullif(trim(p_reference), ''),
    coalesce(nullif(trim(p_notes), ''), v_profile.default_invoice_notes),
    coalesce(nullif(trim(p_payment_terms), ''), v_profile.default_payment_terms),
    coalesce(nullif(trim(p_internal_notes), ''), v_profile.default_internal_notes),
    coalesce(nullif(trim(p_footer_text), ''), v_profile.default_invoice_footer),
    v_user_id
  )
  returning id
  into v_invoice_id;

  for v_line in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_position := v_position + 1;

    if coalesce(v_line->>'product_service_id', '') <> '' then
      select *
      into v_product
      from public.business_products_services
      where id = (v_line->>'product_service_id')::uuid
        and user_id = v_user_id
        and deleted_at is null;

      if not found then
        raise exception 'Uno de los productos seleccionados no existe o no pertenece a tu negocio.';
      end if;
    else
      v_product := null;
    end if;

    if coalesce(v_line->>'tax_rate_id', '') <> '' then
      select *
      into v_tax_rate
      from public.business_tax_rates
      where id = (v_line->>'tax_rate_id')::uuid
        and user_id = v_user_id
        and deleted_at is null;

      if not found then
        raise exception 'Uno de los impuestos seleccionados no existe o no pertenece a tu negocio.';
      end if;
    else
      v_tax_rate := null;
    end if;

    v_description := coalesce(nullif(trim(v_line->>'description'), ''), v_product.description, v_product.name);
    v_quantity := coalesce((v_line->>'quantity')::numeric, 0);
    v_unit := coalesce(nullif(trim(v_line->>'unit'), ''), v_product.unit, 'unidad');
    v_unit_price := coalesce((v_line->>'unit_price')::numeric, v_product.unit_price, 0);
    v_discount_rate := coalesce((v_line->>'discount_rate')::numeric, 0);
    v_discount_amount := coalesce((v_line->>'discount_amount')::numeric, 0);
    v_tax_rate_value := coalesce((v_line->>'tax_rate')::numeric, v_tax_rate.rate, v_product.tax_rate, 0);
    v_withholding_rate := coalesce((v_line->>'withholding_rate')::numeric, 0);

    if v_description is null or trim(v_description) = '' then
      raise exception 'Cada línea debe tener una descripción.';
    end if;

    if v_quantity <= 0 then
      raise exception 'La cantidad de cada línea debe ser mayor que cero.';
    end if;

    if v_unit_price < 0 then
      raise exception 'El precio unitario no puede ser negativo.';
    end if;

    if v_discount_rate < 0 or v_discount_amount < 0 then
      raise exception 'El descuento no puede ser negativo.';
    end if;

    if v_tax_rate_value < 0 or v_withholding_rate < 0 then
      raise exception 'Los porcentajes fiscales no pueden ser negativos.';
    end if;

    v_line_subtotal := public.business_round_money(v_quantity * v_unit_price);

    if v_discount_amount = 0 and v_discount_rate > 0 then
      v_discount_amount := public.business_round_money(v_line_subtotal * v_discount_rate / 100);
    else
      v_discount_amount := public.business_round_money(v_discount_amount);
    end if;

    if v_discount_amount > v_line_subtotal then
      raise exception 'El descuento de una línea no puede superar el subtotal de esa línea.';
    end if;

    v_line_taxable := public.business_round_money(v_line_subtotal - v_discount_amount);
    v_line_tax := public.business_round_money(v_line_taxable * v_tax_rate_value / 100);
    v_line_withholding := public.business_round_money(v_line_taxable * v_withholding_rate / 100);
    v_line_total := public.business_round_money(v_line_taxable + v_line_tax - v_line_withholding);

    if v_line_total < 0 then
      raise exception 'El total de una línea no puede ser negativo.';
    end if;

    insert into public.business_invoice_items (
      user_id,
      business_profile_id,
      invoice_id,
      product_service_id,
      position,
      description,
      quantity,
      unit,
      unit_price,
      discount_amount,
      discount_rate,
      tax_rate_id,
      tax_rate,
      withholding_rate,
      line_subtotal_amount,
      line_taxable_base_amount,
      line_tax_amount,
      line_withholding_amount,
      line_total_amount,
      created_by
    )
    values (
      v_user_id,
      p_business_profile_id,
      v_invoice_id,
      v_product.id,
      v_position,
      v_description,
      v_quantity,
      v_unit,
      v_unit_price,
      v_discount_amount,
      v_discount_rate,
      v_tax_rate.id,
      v_tax_rate_value,
      v_withholding_rate,
      v_line_subtotal,
      v_line_taxable,
      v_line_tax,
      v_line_withholding,
      v_line_total,
      v_user_id
    );
  end loop;

  perform public.business_refresh_invoice_totals(v_invoice_id);

  insert into public.business_audit_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    details,
    created_by
  )
  values (
    v_user_id,
    'business_invoice',
    v_invoice_id,
    case when p_save_mode = 'issue' then 'create_issued' else 'create_draft' end,
    jsonb_build_object(
      'client_id', p_client_id,
      'business_profile_id', p_business_profile_id,
      'save_mode', p_save_mode
    ),
    v_user_id
  );

  return v_invoice_id;
end;
$$;

create or replace function public.business_register_invoice_payment(
  p_invoice_id uuid,
  p_payment_date date default current_date,
  p_amount numeric default null,
  p_financial_account_id uuid default null,
  p_payment_method text default null,
  p_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invoice public.business_invoices%rowtype;
  v_payment_id uuid;
  v_amount numeric(14,2);
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para registrar cobros.';
  end if;

  select *
  into v_invoice
  from public.business_invoices
  where id = p_invoice_id
    and user_id = v_user_id
    and deleted_at is null;

  if not found then
    raise exception 'La factura no existe o no pertenece a tu negocio.';
  end if;

  if v_invoice.status in ('draft', 'cancelled') then
    raise exception 'No se pueden registrar cobros en una factura en borrador o anulada.';
  end if;

  if p_financial_account_id is not null and not exists (
    select 1
    from public.business_financial_accounts account
    where account.id = p_financial_account_id
      and account.user_id = v_user_id
      and account.deleted_at is null
  ) then
    raise exception 'La cuenta financiera seleccionada no es válida.';
  end if;

  v_amount := public.business_round_money(coalesce(p_amount, v_invoice.balance_due_amount));

  if v_amount <= 0 then
    raise exception 'El importe del cobro debe ser mayor que cero.';
  end if;

  insert into public.business_invoice_payments (
    user_id,
    business_profile_id,
    invoice_id,
    financial_account_id,
    payment_date,
    amount,
    currency,
    payment_method,
    reference,
    notes,
    created_by
  )
  values (
    v_user_id,
    v_invoice.business_profile_id,
    p_invoice_id,
    p_financial_account_id,
    coalesce(p_payment_date, current_date),
    v_amount,
    v_invoice.currency,
    nullif(trim(p_payment_method), ''),
    nullif(trim(p_reference), ''),
    nullif(trim(p_notes), ''),
    v_user_id
  )
  returning id
  into v_payment_id;

  perform public.business_refresh_invoice_totals(p_invoice_id);

  insert into public.business_audit_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    details,
    created_by
  )
  values (
    v_user_id,
    'business_invoice_payment',
    v_payment_id,
    'create',
    jsonb_build_object(
      'invoice_id', p_invoice_id,
      'amount', v_amount
    ),
    v_user_id
  );

  return v_payment_id;
end;
$$;

alter table public.business_document_sequences enable row level security;
alter table public.business_tax_rates enable row level security;
alter table public.business_products_services enable row level security;
alter table public.business_invoices enable row level security;
alter table public.business_invoice_items enable row level security;
alter table public.business_invoice_payments enable row level security;

drop policy if exists "business_document_sequences_select_own" on public.business_document_sequences;
create policy "business_document_sequences_select_own"
on public.business_document_sequences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_document_sequences_insert_own" on public.business_document_sequences;
create policy "business_document_sequences_insert_own"
on public.business_document_sequences
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
);

drop policy if exists "business_document_sequences_update_own" on public.business_document_sequences;
create policy "business_document_sequences_update_own"
on public.business_document_sequences
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
);

drop policy if exists "business_tax_rates_select_own" on public.business_tax_rates;
create policy "business_tax_rates_select_own"
on public.business_tax_rates
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_tax_rates_insert_own" on public.business_tax_rates;
create policy "business_tax_rates_insert_own"
on public.business_tax_rates
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
);

drop policy if exists "business_tax_rates_update_own" on public.business_tax_rates;
create policy "business_tax_rates_update_own"
on public.business_tax_rates
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
);

drop policy if exists "business_products_services_select_own" on public.business_products_services;
create policy "business_products_services_select_own"
on public.business_products_services
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_products_services_insert_own" on public.business_products_services;
create policy "business_products_services_insert_own"
on public.business_products_services
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
);

drop policy if exists "business_products_services_update_own" on public.business_products_services;
create policy "business_products_services_update_own"
on public.business_products_services
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
);

drop policy if exists "business_invoices_select_own" on public.business_invoices;
create policy "business_invoices_select_own"
on public.business_invoices
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_invoices_insert_own" on public.business_invoices;
create policy "business_invoices_insert_own"
on public.business_invoices
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.business_clients client
    where client.id = client_id
      and client.user_id = auth.uid()
      and client.deleted_at is null
  )
  and (
    financial_account_id is null
    or exists (
      select 1
      from public.business_financial_accounts account
      where account.id = financial_account_id
        and account.user_id = auth.uid()
        and account.deleted_at is null
    )
  )
);

drop policy if exists "business_invoices_update_own" on public.business_invoices;
create policy "business_invoices_update_own"
on public.business_invoices
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.business_clients client
    where client.id = client_id
      and client.user_id = auth.uid()
      and client.deleted_at is null
  )
  and (
    financial_account_id is null
    or exists (
      select 1
      from public.business_financial_accounts account
      where account.id = financial_account_id
        and account.user_id = auth.uid()
        and account.deleted_at is null
    )
  )
);

drop policy if exists "business_invoice_items_select_own" on public.business_invoice_items;
create policy "business_invoice_items_select_own"
on public.business_invoice_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_invoice_items_insert_own" on public.business_invoice_items;
create policy "business_invoice_items_insert_own"
on public.business_invoice_items
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.business_invoices invoice
    where invoice.id = invoice_id
      and invoice.user_id = auth.uid()
      and invoice.deleted_at is null
  )
);

drop policy if exists "business_invoice_items_update_own" on public.business_invoice_items;
create policy "business_invoice_items_update_own"
on public.business_invoice_items
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.business_invoices invoice
    where invoice.id = invoice_id
      and invoice.user_id = auth.uid()
      and invoice.deleted_at is null
  )
);

drop policy if exists "business_invoice_payments_select_own" on public.business_invoice_payments;
create policy "business_invoice_payments_select_own"
on public.business_invoice_payments
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "business_invoice_payments_insert_own" on public.business_invoice_payments;
create policy "business_invoice_payments_insert_own"
on public.business_invoice_payments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.business_invoices invoice
    where invoice.id = invoice_id
      and invoice.user_id = auth.uid()
      and invoice.deleted_at is null
  )
  and (
    financial_account_id is null
    or exists (
      select 1
      from public.business_financial_accounts account
      where account.id = financial_account_id
        and account.user_id = auth.uid()
        and account.deleted_at is null
    )
  )
);

drop policy if exists "business_invoice_payments_update_own" on public.business_invoice_payments;
create policy "business_invoice_payments_update_own"
on public.business_invoice_payments
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.business_profiles profile
    where profile.id = business_profile_id
      and profile.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.business_invoices invoice
    where invoice.id = invoice_id
      and invoice.user_id = auth.uid()
      and invoice.deleted_at is null
  )
  and (
    financial_account_id is null
    or exists (
      select 1
      from public.business_financial_accounts account
      where account.id = financial_account_id
        and account.user_id = auth.uid()
        and account.deleted_at is null
    )
  )
);
