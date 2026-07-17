'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Loader2, MapPin, User, Clock } from 'lucide-react';
import type { MasterSchedule, RoomFacility, Profile } from '@/lib/types/database';
import { DAYS, TIME_SLOTS } from '@/lib/types/database';
import { formatTime, statusColor, statusLabel } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';

type ScheduleRow = MasterSchedule & {
  room_facilities: RoomFacility | null;
  profiles: Profile | null;
};

export default function SchedulePage() {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'list'>('week');

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    (async () => {
      setLoading(true);
      let query = supabase
        .from('master_schedules')
        .select('*, room_facilities(*), profiles(*)')
        .order('day_of_week')
        .order('start_time');

      if (profile.role === 'lecturer') {
        query = query.eq('lecturer_id', profile.id);
      } else if (profile.role === 'student' || profile.role === 'class_leader') {
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('schedule_id')
          .eq('student_id', profile.id);
        const ids = (enrollments ?? []).map((e) => e.schedule_id);
        if (ids.length === 0) {
          setSchedules([]);
          setLoading(false);
          return;
        }
        query = query.in('schedule_id', ids);
      }

      const { data } = await query;
      setSchedules((data ?? []) as ScheduleRow[]);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile?.role === 'lecturer'
              ? 'Classes you are teaching this semester'
              : 'Your enrolled class schedule'}
          </p>
        </div>
        <div className="flex gap-2 rounded-lg border p-1">
          <Button
            size="sm"
            variant={view === 'week' ? 'default' : 'ghost'}
            onClick={() => setView('week')}
          >
            Week Grid
          </Button>
          <Button
            size="sm"
            variant={view === 'list' ? 'default' : 'ghost'}
            onClick={() => setView('list')}
          >
            List
          </Button>
        </div>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium">No schedules found</p>
            <p className="text-xs text-muted-foreground">
              {profile?.role === 'lecturer'
                ? 'You have no active classes assigned.'
                : 'You are not enrolled in any classes yet.'}
            </p>
          </CardContent>
        </Card>
      ) : view === 'week' ? (
        <WeekGrid schedules={schedules} />
      ) : (
        <ListView schedules={schedules} />
      )}
    </div>
  );
}

function WeekGrid({ schedules }: { schedules: ScheduleRow[] }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-4">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-6 gap-2">
            <div className="flex items-center justify-center p-2 text-xs font-semibold text-muted-foreground">
              Time
            </div>
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex items-center justify-center p-2 text-xs font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {TIME_SLOTS.map((slot) => (
            <div key={slot.label} className="grid grid-cols-6 gap-2 mt-1">
              <div className="flex items-start justify-center p-2 text-xs text-muted-foreground">
                {slot.label}
              </div>
              {DAYS.map((day) => {
                const cell = schedules.find(
                  (s) =>
                    s.day_of_week === day &&
                    s.start_time <= slot.start &&
                    s.end_time > slot.start
                );
                return (
                  <div
                    key={day}
                    className={cn(
                      'min-h-[64px] rounded-lg border p-2 transition-all',
                      cell
                        ? cn('border-primary/30 bg-primary/5', statusColor(cell.status))
                        : 'border-border/50 bg-muted/20'
                    )}
                  >
                    {cell && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold leading-tight">
                          {cell.course_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {cell.class_group}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {cell.room_facilities?.room_code}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ListView({ schedules }: { schedules: ScheduleRow[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {schedules.map((s) => (
        <Card key={s.schedule_id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-semibold">{s.course_name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.course_code} · {s.class_group}
                </p>
              </div>
              <Badge variant="outline" className={statusColor(s.status)}>
                {statusLabel(s.status)}
              </Badge>
            </div>
            <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" />
                {s.day_of_week}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(s.start_time)} - {formatTime(s.end_time)}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                {s.room_facilities?.room_name} ({s.room_facilities?.room_code})
              </div>
              {s.profiles && (
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  {s.profiles.full_name}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
