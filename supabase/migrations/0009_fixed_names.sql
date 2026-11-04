-- Profile display names are sourced from the Discord account and are NOT
-- editable (user decision D25): drop the owner-update policies so the name
-- can never be changed through the API. Creation (owner insert) stays for
-- the automatic first-login provisioning with collision suffixes.

drop policy if exists "profiles: owner update" on public.profiles;
