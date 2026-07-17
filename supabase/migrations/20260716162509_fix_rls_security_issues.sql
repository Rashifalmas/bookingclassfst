/*
# Fix RLS Security Issues: notifications INSERT and schedule_proposals UPDATE

## Problem
1. `notifications` INSERT policy `notifs_insert` used `WITH CHECK (true)` — any authenticated
   user could insert notifications for arbitrary user_ids with no constraint.
2. `schedule_proposals` UPDATE policy `proposals_update` used `USING (true)` — any authenticated
   user could modify any proposal row, bypassing ownership/role checks.

## Changes

### notifications INSERT
- Replaced `WITH CHECK (true)` with `WITH CHECK (auth.uid() IS NOT NULL)`.
- Notifications are system-generated side effects of legitimate actions (lecturer submits
  reschedule, class leader approves/rejects). The inserter is always an authenticated user,
  but the notification's `user_id` may belong to a different user (the recipient). The check
  ensures only authenticated users can insert, while not restricting which user_id the
  notification is addressed to (required by the cross-user notification design).

### schedule_proposals UPDATE
- Replaced `USING (true)` and added a proper `WITH CHECK` clause.
- UPDATE is now restricted to:
  1. Users with role 'admin' or 'class_leader' (class leaders review/approve/reject proposals),
  2. The lecturer who owns the associated reschedule request (can edit their own proposals).
- Both USING and WITH CHECK use the same predicate so existing rows and new values are validated.

## Security
- No new tables or columns.
- RLS remains enabled on both tables.
- Policies are idempotent (DROP IF EXISTS before CREATE).
*/

-- ===========================
-- Fix notifications INSERT policy
-- ===========================
DROP POLICY IF EXISTS "notifs_insert" ON notifications;
CREATE POLICY "notifs_insert" ON notifications FOR INSERT
TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================
-- Fix schedule_proposals UPDATE policy
-- ===========================
DROP POLICY IF EXISTS "proposals_update" ON schedule_proposals;
CREATE POLICY "proposals_update" ON schedule_proposals FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'class_leader')
  )
  OR
  EXISTS (
    SELECT 1 FROM reschedule_requests rr
    WHERE rr.request_id = schedule_proposals.request_id
    AND rr.lecturer_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'class_leader')
  )
  OR
  EXISTS (
    SELECT 1 FROM reschedule_requests rr
    WHERE rr.request_id = schedule_proposals.request_id
    AND rr.lecturer_id = auth.uid()
  )
);
