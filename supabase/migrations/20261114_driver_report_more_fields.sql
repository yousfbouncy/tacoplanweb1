-- Extend the allowed explicitly selected fields for new report types.
alter table public.driver_report_shares drop constraint if exists share_fields_valid;
alter table public.driver_report_shares add constraint share_fields_valid check (array_length(fields,1) between 1 and 20);
