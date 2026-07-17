'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import type {
  MasterSchedule,
  RoomFacility,
  Profile,
  DayOfWeek,
} from '@/lib/types/database';
import { DAYS, TIME_SLOTS } from '@/lib/types/database';
import { formatTime, statusColor, statusLabel } from '@/lib/schedule-utils';
import { useToast } from '@/hooks/use-toast';

type ScheduleRow = MasterSchedule & {
  room_facilities: RoomFacility | null;
  profiles: Profile | null;
};

export default function MasterSchedulesPage() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [rooms, setRooms] = useState<RoomFacility[]>([]);
  const [lecturers, setLecturers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleRow | null>(null);
  const [form, setForm] = useState({
    course_name: '',
    course_code: '',
    class_group: 'Kelas A',
    room_id: '',
    lecturer_id: '',
    day_of_week: 'Monday' as DayOfWeek,
    time_slot: TIME_SLOTS[0].label,
  });

  const load = async () => {
    const supabase = createClient();
    const [{ data: sched }, { data: r }, { data: lec }] = await Promise.all([
      supabase
        .from('master_schedules')
        .select('*, room_facilities(*), profiles(*)')
        .order('day_of_week')
        .order('start_time'),
      supabase.from('room_facilities').select('*').eq('is_active', true).order('room_code'),
      supabase.from('profiles').select('*').eq('role', 'lecturer').order('full_name'),
    ]);
    setSchedules((sched ?? []) as ScheduleRow[]);
    setRooms((r ?? []) as RoomFacility[]);
    setLecturers((lec ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      course_name: '',
      course_code: '',
      class_group: 'Kelas A',
      room_id: rooms[0]?.room_id ?? '',
      lecturer_id: lecturers[0]?.id ?? '',
      day_of_week: 'Monday',
      time_slot: TIME_SLOTS[0].label,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: ScheduleRow) => {
    const slot = TIME_SLOTS.find((t) => t.start === s.start_time);
    setEditing(s);
    setForm({
      course_name: s.course_name,
      course_code: s.course_code,
      class_group: s.class_group,
      room_id: s.room_id,
      lecturer_id: s.lecturer_id,
      day_of_week: s.day_of_week,
      time_slot: slot?.label ?? TIME_SLOTS[0].label,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const supabase = createClient();
    const slot = TIME_SLOTS.find((t) => t.label === form.time_slot)!;
    const payload = {
      course_name: form.course_name,
      course_code: form.course_code,
      class_group: form.class_group,
      room_id: form.room_id,
      lecturer_id: form.lecturer_id,
      day_of_week: form.day_of_week,
      start_time: slot.start,
      end_time: slot.end,
    };

    if (editing) {
      const { error } = await supabase
        .from('master_schedules')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('schedule_id', editing.schedule_id);
      if (error) {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Schedule updated' });
    } else {
      const { error } = await supabase.from('master_schedules').insert(payload);
      if (error) {
        toast({ title: 'Create failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Schedule created' });
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (s: ScheduleRow) => {
    if (!confirm(`Delete schedule for ${s.course_name}?`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('master_schedules')
      .delete()
      .eq('schedule_id', s.schedule_id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Schedule deleted' });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all class schedules across the faculty
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium">No schedules yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {schedules.map((s) => (
            <Card key={s.schedule_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
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
                    {s.room_facilities?.room_code}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {s.profiles?.full_name}
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(s)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Schedule' : 'Add Schedule'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update class schedule details.' : 'Create a new class schedule entry.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="course_name">Course Name</Label>
                <Input
                  id="course_name"
                  placeholder="Data Structures"
                  value={form.course_name}
                  onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course_code">Course Code</Label>
                <Input
                  id="course_code"
                  placeholder="IF2110"
                  value={form.course_code}
                  onChange={(e) => setForm({ ...form, course_code: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class_group">Class Group</Label>
              <Input
                id="class_group"
                placeholder="Kelas A"
                value={form.class_group}
                onChange={(e) => setForm({ ...form, class_group: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={form.room_id} onValueChange={(v) => setForm({ ...form, room_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.room_id} value={r.room_id}>
                        {r.room_code} - {r.room_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lecturer</Label>
                <Select
                  value={form.lecturer_id}
                  onValueChange={(v) => setForm({ ...form, lecturer_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lecturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select
                  value={form.day_of_week}
                  onValueChange={(v) => setForm({ ...form, day_of_week: v as DayOfWeek })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time Slot</Label>
                <Select
                  value={form.time_slot}
                  onValueChange={(v) => setForm({ ...form, time_slot: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t.label} value={t.label}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={!form.course_name || !form.course_code || !form.room_id || !form.lecturer_id}
            >
              {editing ? 'Save Changes' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
