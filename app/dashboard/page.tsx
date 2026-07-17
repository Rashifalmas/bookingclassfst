'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  TrendingUp,
  ArrowRight,
  Plus,
} from 'lucide-react';
import type {
  MasterSchedule,
  RoomFacility,
  RescheduleRequest,
  Notification,
} from '@/lib/types/database';
import { formatTime, statusColor, statusLabel } from '@/lib/schedule-utils';
import { Badge } from '@/components/ui/badge';

export default function DashboardHome() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<{
    totalSchedules?: number;
    activeRequests?: number;
    pendingProposals?: number;
    totalRooms?: number;
    totalUsers?: number;
    unreadNotifs?: number;
    approvedCount?: number;
    rejectedCount?: number;
  }>({});
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    (async () => {
      setLoading(true);
      try {
        if (profile.role === 'admin') {
          const [{ count: rooms }, { count: users }, { count: schedules }] = await Promise.all([
            supabase.from('room_facilities').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('master_schedules').select('*', { count: 'exact', head: true }),
          ]);
          setStats((s) => ({
            ...s,
            totalRooms: rooms ?? 0,
            totalUsers: users ?? 0,
            totalSchedules: schedules ?? 0,
          }));
        } else if (profile.role === 'lecturer') {
          const [{ count: schedules }, { count: activeReqs }] = await Promise.all([
            supabase
              .from('master_schedules')
              .select('*', { count: 'exact', head: true })
              .eq('lecturer_id', profile.id)
              .eq('status', 'active'),
            supabase
              .from('reschedule_requests')
              .select('*', { count: 'exact', head: true })
              .eq('lecturer_id', profile.id)
              .in('status', ['pending_slot_selection', 'pending_approval']),
          ]);
          setStats((s) => ({
            ...s,
            totalSchedules: schedules ?? 0,
            activeRequests: activeReqs ?? 0,
          }));
        } else if (profile.role === 'class_leader') {
          const { count: pending } = await supabase
            .from('schedule_proposals')
            .select('*', { count: 'exact', head: true })
            .eq('consensus_status', 'waiting_review');
          setStats((s) => ({ ...s, pendingProposals: pending ?? 0 }));
        }

        const { count: approved } = await supabase
          .from('reschedule_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved');
        const { count: rejected } = await supabase
          .from('reschedule_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'rejected');
        setStats((s) => ({ ...s, approvedCount: approved ?? 0, rejectedCount: rejected ?? 0 }));

        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentNotifs((notifs ?? []) as Notification[]);

        const { count: unread } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_read', false);
        setStats((s) => ({ ...s, unreadNotifs: unread ?? 0 }));
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  if (!profile) return null;

  const role = profile.role;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {roleDescriptions[role]}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {role === 'admin' && (
          <>
            <StatCard
              title="Total Rooms"
              value={stats.totalRooms}
              icon={Building2}
              color="primary"
            />
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              color="success"
            />
            <StatCard
              title="Active Schedules"
              value={stats.totalSchedules}
              icon={CalendarDays}
              color="warning"
            />
            <StatCard
              title="Approved Reschedules"
              value={stats.approvedCount}
              icon={CheckCircle2}
              color="primary"
            />
          </>
        )}

        {role === 'lecturer' && (
          <>
            <StatCard
              title="My Active Classes"
              value={stats.totalSchedules}
              icon={CalendarDays}
              color="primary"
            />
            <StatCard
              title="Pending Requests"
              value={stats.activeRequests}
              icon={Clock}
              color="warning"
            />
            <StatCard
              title="Approved"
              value={stats.approvedCount}
              icon={CheckCircle2}
              color="success"
            />
            <StatCard
              title="Rejected"
              value={stats.rejectedCount}
              icon={XCircle}
              color="destructive"
            />
          </>
        )}

        {role === 'class_leader' && (
          <>
            <StatCard
              title="Pending Proposals"
              value={stats.pendingProposals}
              icon={Clock}
              color="warning"
            />
            <StatCard
              title="Approved"
              value={stats.approvedCount}
              icon={CheckCircle2}
              color="success"
            />
            <StatCard
              title="Rejected"
              value={stats.rejectedCount}
              icon={XCircle}
              color="destructive"
            />
            <StatCard
              title="Unread Notifications"
              value={stats.unreadNotifs}
              icon={TrendingUp}
              color="primary"
            />
          </>
        )}

        {role === 'student' && (
          <>
            <StatCard
              title="Unread Notifications"
              value={stats.unreadNotifs}
              icon={Clock}
              color="warning"
            />
            <StatCard
              title="Approved Reschedules"
              value={stats.approvedCount}
              icon={CheckCircle2}
              color="success"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {role === 'lecturer' && (
              <Link href="/dashboard/reschedule">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Reschedule Request
                </Button>
              </Link>
            )}
            {role === 'class_leader' && (
              <Link href="/dashboard/proposals">
                <Button>
                  Review Proposals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href="/dashboard/schedule">
              <Button variant="outline">
                <CalendarDays className="mr-2 h-4 w-4" />
                View Schedule
              </Button>
            </Link>
            {role === 'admin' && (
              <>
                <Link href="/dashboard/rooms">
                  <Button>
                    <Building2 className="mr-2 h-4 w-4" />
                    Manage Rooms
                  </Button>
                </Link>
                <Link href="/dashboard/reports">
                  <Button variant="outline">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Reports
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentNotifs.length === 0 && (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            )}
            {recentNotifs.map((n) => (
              <div
                key={n.notification_id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="mt-0.5">
                  {!n.is_read && (
                    <span className="block h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                </div>
              </div>
            ))}
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="sm" className="w-full">
                View all
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const roleDescriptions: Record<string, string> = {
  admin: 'Manage master data, rooms, schedules, and view room utilization reports.',
  lecturer: 'Initiate reschedule requests and track their approval status.',
  class_leader: 'Review and approve or reject reschedule proposals from lecturers.',
  student: 'View your class schedules and receive notifications about changes.',
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value?: number;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value ?? '—'}</p>
        </div>
      </CardContent>
    </Card>
  );
}
