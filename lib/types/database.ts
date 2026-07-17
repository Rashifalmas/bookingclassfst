export type UserRole = 'admin' | 'lecturer' | 'student';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export type ScheduleStatus = 'active' | 'rescheduled' | 'cancelled';
export type RequestStatus =
  | 'pending_slot_selection'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';
export type ConsensusStatus = 'waiting_review' | 'approved' | 'rejected';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_class_leader: boolean;
  lecturer_id: string | null;
  student_id: string | null;
  created_at: string;
}

export interface Course {
  course_id: string;
  course_code: string;
  course_name: string;
  created_at: string;
}

export interface RoomFacility {
  room_id: string;
  room_code: string;
  room_name: string;
  capacity: number;
  floor: string;
  facilities: string[];
  is_active: boolean;
  created_at: string;
}

export interface MasterSchedule {
  schedule_id: string;
  room_id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  lecturer_id: string;
  class_group: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentEnrollment {
  enrollment_id: string;
  student_id: string;
  schedule_id: string;
  enrolled_at: string;
}

export interface RescheduleRequest {
  request_id: string;
  original_schedule_id: string;
  lecturer_id: string;
  reason: string;
  required_capacity: number;
  required_facilities: string[];
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface ScheduleProposal {
  proposal_id: string;
  request_id: string;
  proposed_room_id: string;
  proposed_day: DayOfWeek;
  proposed_start_time: string;
  proposed_end_time: string;
  consensus_status: ConsensusStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  related_request_id: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: Omit<Course, 'course_id' | 'created_at'> & {
          course_id?: string;
          created_at?: string;
        };
        Update: Partial<Course>;
        Relationships: [];
      };
      room_facilities: {
        Row: RoomFacility;
        Insert: Omit<RoomFacility, 'room_id' | 'created_at'> & {
          room_id?: string;
          created_at?: string;
        };
        Update: Partial<RoomFacility>;
        Relationships: [];
      };
      master_schedules: {
        Row: MasterSchedule;
        Insert: Omit<MasterSchedule, 'schedule_id' | 'created_at' | 'updated_at'> & {
          schedule_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<MasterSchedule>;
        Relationships: [];
      };
      student_enrollments: {
        Row: StudentEnrollment;
        Insert: Omit<StudentEnrollment, 'enrollment_id' | 'enrolled_at'> & {
          enrollment_id?: string;
          enrolled_at?: string;
        };
        Update: Partial<StudentEnrollment>;
        Relationships: [];
      };
      reschedule_requests: {
        Row: RescheduleRequest;
        Insert: Omit<RescheduleRequest, 'request_id' | 'created_at' | 'updated_at'> & {
          request_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<RescheduleRequest>;
        Relationships: [];
      };
      schedule_proposals: {
        Row: ScheduleProposal;
        Insert: Omit<ScheduleProposal, 'proposal_id' | 'created_at'> & {
          proposal_id?: string;
          created_at?: string;
        };
        Update: Partial<ScheduleProposal>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'notification_id' | 'created_at'> & {
          notification_id?: string;
          created_at?: string;
        };
        Update: Partial<Notification>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type ScheduleWithRelations = MasterSchedule & {
  room_facilities: RoomFacility | null;
  courses: Course | null;
  profiles: Profile | null;
  student_enrollments: { student_id: string }[];
};

export type RequestWithRelations = RescheduleRequest & {
  master_schedules: MasterSchedule | null;
  profiles: Profile | null;
  schedule_proposals: ScheduleProposal[];
};

export type ProposalWithRelations = ScheduleProposal & {
  room_facilities: RoomFacility | null;
  reschedule_requests: RequestWithRelations | null;
  reviewer: Profile | null;
};

export const DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const TIME_SLOTS: { label: string; start: string; end: string }[] = [
  { label: '07:00 - 08:40', start: '07:00', end: '08:40' },
  { label: '09:00 - 10:40', start: '09:00', end: '10:40' },
  { label: '11:00 - 12:40', start: '11:00', end: '12:40' },
  { label: '13:00 - 14:40', start: '13:00', end: '14:40' },
  { label: '15:00 - 16:40', start: '15:00', end: '16:40' },
  { label: '17:00 - 18:40', start: '17:00', end: '18:40' },
];

export const ALL_FACILITIES = [
  'Projector',
  'AC',
  'Whiteboard',
  'Sound System',
  'Smart TV',
  'PC',
  'Internet',
];
