-- Security fix: specialist_answers_update_own (0012) lets a responder update
-- any column on their own answer, including request_id — with no re-check
-- that they still qualify as a specialist for whichever request it now
-- points at.
--
-- The insert policy (specialist_answers_insert_matching_specialty) enforces
-- exactly that match: the whole point of the "Specialist Answer" badge is
-- that it means something ("this person is a specialist in this field"), not
-- just "this person clicked the cardiology button" (0012's own comment). But
-- WITH CHECK on UPDATE has no access to the row's old values, so a responder
-- who legitimately answered a request in their own specialty could send a
-- raw PATCH (bypassing the app's UI entirely — RLS is the actual boundary
-- here, same as everywhere else in this schema) moving that same answer row
-- onto a request in a specialty they have no standing in, and the badge
-- would keep showing next to it as if they'd answered *that*.
--
-- Fix: re-run the same specialty-match check the insert policy runs, as part
-- of the update's own WITH CHECK. This needs no old/new comparison — it just
-- means whatever request_id an update ends up with, on this responder,
-- must currently pass the same test a fresh answer to it would.

drop policy "specialist_answers_update_own" on public.specialist_answers;

create policy "specialist_answers_update_own"
  on public.specialist_answers for update
  using (auth.uid() = responder_id)
  with check (
    auth.uid() = responder_id
    and exists (
      select 1 from public.specialist_requests r
      where r.id = request_id
        and public.is_specialist_in(r.specialty)
    )
  );
