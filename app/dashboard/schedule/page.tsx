'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Loader2, MapPin, User, Clock, PlusCircle } from 'lucide-react';
import type { MasterSchedule, RoomFacility, Profile, Course } from '@/lib/types/database';
import { DAYS, TIME_SLOTS } from '@/lib/types/database';
import { formatTime, statusColor, statusLabel } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type ScheduleRow = MasterSchedule & {
  room_facilities: RoomFacility | null;
  courses: Course | null;
  profiles: Profile | null;
};

export default function SchedulePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [mySchedules, setMySchedules] = useState<ScheduleRow[]>([]);
  const [allSchedules, setAllSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'list'>('week');
  const [activeTab, setActiveTab] = useState<'mine' | 'available'>('mine');
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const loadSchedules = async () => {
    if (!profile) return;
    setLoading(true);
    const supabase = createClient();
    
    // Fetch all schedules for Available Classes tab
    const { data: allData } = await supabase
      .from('master_schedules')
      .select('*, room_facilities(*), courses(*), profiles(*)')
      .neq('status', 'cancelled')
      .order('day_of_week')
      .order('start_time');

    setAllSchedules((allData ?? []) as ScheduleRow[]);

    if (profile.role === 'lecturer') {
      setMySchedules(((allData ?? []) as ScheduleRow[]).filter(s => s.lecturer_id === profile.id));
    } else {
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('schedule_id')
        .eq('student_id', profile.id);
      
      const enrolledIds = new Set((enrollments ?? []).map(e => e.schedule_id));
      setMySchedules(((allData ?? []) as ScheduleRow[]).filter(s => enrolledIds.has(s.schedule_id)));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSchedules();
  }, [profile]);

  const handleEnroll = async (scheduleId: string) => {
    if (!profile) return;
    setEnrolling(scheduleId);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: profile.id, schedule_id: scheduleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll');
      
      toast({ title: 'Successfully enrolled!', description: 'Class added to your schedule.' });
      loadSchedules();
    } catch (err: any) {
      toast({ title: 'Enrollment Error', description: err.message, variant: 'destructive' });
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const schedulesToShow = activeTab === 'mine' ? mySchedules : allSchedules.filter(s => !mySchedules.find(m => m.schedule_id === s.schedule_id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile?.role === 'lecturer'
              ? 'Manage your teaching schedule'
              : 'View and enroll in classes'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {profile?.role === 'student' && (
            <div className="flex gap-2 rounded-lg border p-1 bg-background">
              <Button size="sm" variant={activeTab === 'mine' ? 'default' : 'ghost'} onClick={() => setActiveTab('mine')}>My Classes</Button>
              <Button size="sm" variant={activeTab === 'available' ? 'default' : 'ghost'} onClick={() => setActiveTab('available')}>Available Classes</Button>
            </div>
          )}
          <div className="flex gap-2 rounded-lg border p-1 bg-background">
            <Button size="sm" variant={view === 'week' ? 'default' : 'ghost'} onClick={() => setView('week')}>Week Grid</Button>
            <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')}>List</Button>
          </div>
        </div>
      </div>

      {schedulesToShow.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium">No schedules found</p>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'mine' ? 'You have no classes.' : 'No more classes available.'}
            </p>
          </CardContent>
        </Card>
      ) : view === 'week' ? (
        <WeekGrid schedules={schedulesToShow} onEnroll={activeTab === 'available' ? handleEnroll : undefined} enrollingId={enrolling} />
      ) : (
        <ListView schedules={schedulesToShow} onEnroll={activeTab === 'available' ? handleEnroll : undefined} enrollingId={enrolling} />
      )}
    </div>
  );
}

function WeekGrid({ schedules, onEnroll, enrollingId }: { schedules: ScheduleRow[], onEnroll?: (id: string) => void, enrollingId: string | null }) {
  // Advanced CSS Grid spanning
  return (
    <Card>
      <CardContent className="overflow-x-auto p-4">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-2 mb-2">
            <div className="text-xs font-semibold text-muted-foreground text-center">Time</div>
            {DAYS.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-muted-foreground">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-[80px_repeat(6,1fr)] grid-rows-[repeat(6,minmax(80px,auto))] gap-2 relative">
            {/* Time labels column */}
            {TIME_SLOTS.map((slot, i) => (
              <div key={slot.label} className="text-xs text-muted-foreground text-center pt-2 border-t" style={{ gridColumn: 1, gridRow: i + 1 }}>
                {slot.label}
              </div>
            ))}

            {/* Grid Cells */}
            {schedules.map(cell => {
              const startIdx = TIME_SLOTS.findIndex(t => cell.start_time <= t.start);
              const endIdx = TIME_SLOTS.findIndex(t => cell.end_time <= t.end);
              const rowStart = startIdx === -1 ? 1 : startIdx + 1;
              const rowEnd = endIdx === -1 ? TIME_SLOTS.length + 1 : endIdx + 2;
              const colStart = DAYS.indexOf(cell.day_of_week) + 2;

              return (
                <div
                  key={cell.schedule_id}
                  className={cn(
                    'rounded-lg border p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition-all',
                    statusColor(cell.status),
                    'border-primary/20 bg-primary/5'
                  )}
                  style={{
                    gridColumn: colStart,
                    gridRowStart: rowStart,
                    gridRowEnd: rowEnd,
                    zIndex: 10
                  }}
                >
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold leading-tight line-clamp-2">
                      {cell.courses?.course_name || cell.course_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {cell.courses?.course_code || cell.course_code} · {cell.class_group}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{cell.room_facilities?.room_name} ({cell.room_facilities?.room_code})</span>
                    </div>
                  </div>
                  {onEnroll && (
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="mt-3 w-full h-7 text-xs" 
                      onClick={() => onEnroll(cell.schedule_id)}
                      disabled={enrollingId === cell.schedule_id}
                    >
                      {enrollingId === cell.schedule_id ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : <PlusCircle className="h-3 w-3 mr-1"/>}
                      Enroll
                    </Button>
                  )}
                </div>
              );
            })}
            
            {/* Empty grid background for visual alignment */}
            {TIME_SLOTS.map((_, r) => 
              DAYS.map((_, c) => (
                <div key={`${r}-${c}`} className="border-t border-dashed border-border/50" style={{ gridRow: r + 1, gridColumn: c + 2, zIndex: 0 }} />
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ListView({ schedules, onEnroll, enrollingId }: { schedules: ScheduleRow[], onEnroll?: (id: string) => void, enrollingId: string | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {schedules.map((s) => (
        <Card key={s.schedule_id} className="hover:shadow-md transition-shadow flex flex-col">
          <CardContent className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1 pr-3">
                  <p className="font-semibold text-sm leading-tight">{s.courses?.course_name || s.course_name}</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    {s.courses?.course_code || s.course_code} · {s.class_group}
                  </p>
                </div>
                <Badge variant="outline" className={cn("whitespace-nowrap shrink-0", statusColor(s.status))}>
                  {statusLabel(s.status)}
                </Badge>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {s.day_of_week}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {formatTime(s.start_time)} - {formatTime(s.end_time)}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{s.room_facilities?.room_name} ({s.room_facilities?.room_code})</span>
                </div>
                {s.profiles && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.profiles.full_name}</span>
                  </div>
                )}
              </div>
            </div>
            {onEnroll && (
              <Button 
                size="sm" 
                variant="default" 
                className="mt-4 w-full" 
                onClick={() => onEnroll(s.schedule_id)}
                disabled={enrollingId === s.schedule_id}
              >
                {enrollingId === s.schedule_id ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <PlusCircle className="h-4 w-4 mr-2"/>}
                Enroll in Class
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
