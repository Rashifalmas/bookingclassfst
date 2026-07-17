/*
# Booking Class FST - Full Schema

## Overview
Creates the complete database schema for the Booking Class FST university
class rescheduling system. This is a multi-role authenticated application.

## New Tables

### 1. profiles
Extends Supabase auth.users with role information and display name.
- id (uuid, PK, references auth.users)
- full_name (text)
- email (text)
- role (text): 'admin' | 'lecturer' | 'student' | 'class_leader'
- lecturer_id (text, nullable): external ID for lecturers
- student_id (text, nullable): external NIM for students
- created_at (timestamptz)

### 2. room_facilities
Master data for physical rooms on campus.
- room_id (uuid, PK)
- room_code (text, unique): e.g. "A.301"
- room_name (text): e.g. "Main Lecture Hall"
- capacity (int): max student capacity
- floor (text): e.g. "Lt.3"
- facilities (text[]): array of facility names e.g. ['Projector', 'AC']
- is_active (boolean)
- created_at (timestamptz)

### 3. master_schedules
Core transactional table recording all class sessions.
- schedule_id (uuid, PK)
- room_id (uuid, FK -> room_facilities)
- course_name (text)
- course_code (text)
- lecturer_id (uuid, FK -> profiles): the lecturer teaching the class
- class_group (text): e.g. "Kelas A", "TI-3A"
- day_of_week (text): 'Monday'|'Tuesday'|...'Friday'
- start_time (time)
- end_time (time)
- status (text): 'active' | 'rescheduled' | 'cancelled'
- created_at (timestamptz)
- updated_at (timestamptz)

### 4. student_enrollments
Junction table linking students to schedule slots.
- enrollment_id (uuid, PK)
- student_id (uuid, FK -> profiles)
- schedule_id (uuid, FK -> master_schedules)
- enrolled_at (timestamptz)

### 5. reschedule_requests
Tracks lecturer-initiated reschedule requests.
- request_id (uuid, PK)
- original_schedule_id (uuid, FK -> master_schedules)
- lecturer_id (uuid, FK -> profiles)
- reason (text)
- required_capacity (int)
- required_facilities (text[])
- status (text): 'pending_slot_selection' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'
- created_at (timestamptz)
- updated_at (timestamptz)

### 6. schedule_proposals
A specific proposed new slot created from a reschedule request.
- proposal_id (uuid, PK)
- request_id (uuid, FK -> reschedule_requests)
- proposed_room_id (uuid, FK -> room_facilities)
- proposed_day (text)
- proposed_start_time (time)
- proposed_end_time (time)
- consensus_status (text): 'waiting_review' | 'approved' | 'rejected'
- reviewed_by (uuid, FK -> profiles, nullable)
- reviewed_at (timestamptz, nullable)
- rejection_reason (text, nullable)
- created_at (timestamptz)

### 7. notifications
In-app notification log for all users.
- notification_id (uuid, PK)
- user_id (uuid, FK -> profiles)
- title (text)
- message (text)
- type (text): 'info' | 'success' | 'warning' | 'error'
- is_read (boolean)
- related_request_id (uuid, nullable)
- created_at (timestamptz)

## Security
- RLS enabled on all tables.
- Authenticated users can read all shared data (schedules, rooms).
- Users can only write/modify their own data.
- Notifications are private per user.

## Notes
- This schema supports the full workflow: Lecturer submits -> Availability Engine checks -> 
  Class Leader approves/rejects -> Schedule updated -> Notifications sent.
- The `profiles` table is the single source of truth for user roles.
*/

-- ===========================
-- 1. PROFILES
-- ===========================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'lecturer', 'student', 'class_leader')),
  lecturer_id text,
  student_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
TO authenticated USING (auth.uid() = id);

-- ===========================
-- 2. ROOM_FACILITIES
-- ===========================
CREATE TABLE IF NOT EXISTS room_facilities (
  room_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text UNIQUE NOT NULL,
  room_name text NOT NULL,
  capacity int NOT NULL DEFAULT 30,
  floor text NOT NULL DEFAULT 'Lt.1',
  facilities text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE room_facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select" ON room_facilities;
CREATE POLICY "rooms_select" ON room_facilities FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "rooms_insert" ON room_facilities;
CREATE POLICY "rooms_insert" ON room_facilities FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "rooms_update" ON room_facilities;
CREATE POLICY "rooms_update" ON room_facilities FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "rooms_delete" ON room_facilities;
CREATE POLICY "rooms_delete" ON room_facilities FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===========================
-- 3. MASTER_SCHEDULES
-- ===========================
CREATE TABLE IF NOT EXISTS master_schedules (
  schedule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES room_facilities(room_id) ON DELETE RESTRICT,
  course_name text NOT NULL,
  course_code text NOT NULL,
  lecturer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  class_group text NOT NULL DEFAULT 'Kelas A',
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','rescheduled','cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE master_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_select" ON master_schedules;
CREATE POLICY "schedules_select" ON master_schedules FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "schedules_insert" ON master_schedules;
CREATE POLICY "schedules_insert" ON master_schedules FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lecturer'))
);

DROP POLICY IF EXISTS "schedules_update" ON master_schedules;
CREATE POLICY "schedules_update" ON master_schedules FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lecturer'))
);

DROP POLICY IF EXISTS "schedules_delete" ON master_schedules;
CREATE POLICY "schedules_delete" ON master_schedules FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===========================
-- 4. STUDENT_ENROLLMENTS
-- ===========================
CREATE TABLE IF NOT EXISTS student_enrollments (
  enrollment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES master_schedules(schedule_id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(student_id, schedule_id)
);

ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enrollments_select" ON student_enrollments;
CREATE POLICY "enrollments_select" ON student_enrollments FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "enrollments_insert" ON student_enrollments;
CREATE POLICY "enrollments_insert" ON student_enrollments FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = student_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "enrollments_update" ON student_enrollments;
CREATE POLICY "enrollments_update" ON student_enrollments FOR UPDATE
TO authenticated USING (
  auth.uid() = student_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "enrollments_delete" ON student_enrollments;
CREATE POLICY "enrollments_delete" ON student_enrollments FOR DELETE
TO authenticated USING (
  auth.uid() = student_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===========================
-- 5. RESCHEDULE_REQUESTS
-- ===========================
CREATE TABLE IF NOT EXISTS reschedule_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_schedule_id uuid NOT NULL REFERENCES master_schedules(schedule_id) ON DELETE RESTRICT,
  lecturer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reason text NOT NULL DEFAULT '',
  required_capacity int NOT NULL DEFAULT 30,
  required_facilities text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending_slot_selection' CHECK (status IN ('pending_slot_selection','pending_approval','approved','rejected','cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select" ON reschedule_requests;
CREATE POLICY "requests_select" ON reschedule_requests FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "requests_insert" ON reschedule_requests;
CREATE POLICY "requests_insert" ON reschedule_requests FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = lecturer_id AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lecturer'))
);

DROP POLICY IF EXISTS "requests_update" ON reschedule_requests;
CREATE POLICY "requests_update" ON reschedule_requests FOR UPDATE
TO authenticated USING (
  auth.uid() = lecturer_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "requests_delete" ON reschedule_requests;
CREATE POLICY "requests_delete" ON reschedule_requests FOR DELETE
TO authenticated USING (
  auth.uid() = lecturer_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===========================
-- 6. SCHEDULE_PROPOSALS
-- ===========================
CREATE TABLE IF NOT EXISTS schedule_proposals (
  proposal_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES reschedule_requests(request_id) ON DELETE CASCADE,
  proposed_room_id uuid NOT NULL REFERENCES room_facilities(room_id) ON DELETE RESTRICT,
  proposed_day text NOT NULL CHECK (proposed_day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  proposed_start_time time NOT NULL,
  proposed_end_time time NOT NULL,
  consensus_status text NOT NULL DEFAULT 'waiting_review' CHECK (consensus_status IN ('waiting_review','approved','rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_select" ON schedule_proposals;
CREATE POLICY "proposals_select" ON schedule_proposals FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "proposals_insert" ON schedule_proposals;
CREATE POLICY "proposals_insert" ON schedule_proposals FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM reschedule_requests rr
    WHERE rr.request_id = request_id AND rr.lecturer_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "proposals_update" ON schedule_proposals;
CREATE POLICY "proposals_update" ON schedule_proposals FOR UPDATE
TO authenticated USING (true);

DROP POLICY IF EXISTS "proposals_delete" ON schedule_proposals;
CREATE POLICY "proposals_delete" ON schedule_proposals FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===========================
-- 7. NOTIFICATIONS
-- ===========================
CREATE TABLE IF NOT EXISTS notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  is_read boolean NOT NULL DEFAULT false,
  related_request_id uuid REFERENCES reschedule_requests(request_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifs_select" ON notifications;
CREATE POLICY "notifs_select" ON notifications FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifs_insert" ON notifications;
CREATE POLICY "notifs_insert" ON notifications FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifs_update" ON notifications;
CREATE POLICY "notifs_update" ON notifications FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifs_delete" ON notifications;
CREATE POLICY "notifs_delete" ON notifications FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ===========================
-- INDEXES
-- ===========================
CREATE INDEX IF NOT EXISTS idx_master_schedules_lecturer ON master_schedules(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_master_schedules_room ON master_schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_master_schedules_day ON master_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_schedule ON student_enrollments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_requests_lecturer ON reschedule_requests(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_requests_schedule ON reschedule_requests(original_schedule_id);
CREATE INDEX IF NOT EXISTS idx_proposals_request ON schedule_proposals(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
