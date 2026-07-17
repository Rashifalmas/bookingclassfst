'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Clock,
  Loader2,
  Plus,
  CheckCircle2,
  XCircle,
  MapPin,
  Users,
  Calendar,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type {
  MasterSchedule,
  RoomFacility,
  RescheduleRequest,
  ScheduleProposal,
  DayOfWeek,
} from '@/lib/types/database';
import { DAYS, TIME_SLOTS, ALL_FACILITIES } from '@/lib/types/database';
import type { Course } from '@/lib/types/database';
import { formatTime, statusColor, statusLabel } from '@/lib/schedule-utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ScheduleRow = MasterSchedule & {
  room_facilities: RoomFacility | null;
  courses: Course | null;
};

type RequestRow = RescheduleRequest & {
  master_schedules: ScheduleRow | null;
  schedule_proposals: ScheduleProposal[];
};

export default function ReschedulePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const loadData = async () => {
    if (!profile) return;
    const supabase = createClient();
    setLoading(true);

    const [{ data: schedData }, { data: reqData }] = await Promise.all([
      supabase
        .from('master_schedules')
        .select('*, room_facilities(*), courses(*)')
        .eq('lecturer_id', profile.id)
        .order('day_of_week')
        .order('start_time'),
      supabase
        .from('reschedule_requests')
        .select('*, master_schedules(*, room_facilities(*), courses(*)), schedule_proposals(*)')
        .eq('lecturer_id', profile.id)
        .order('created_at', { ascending: false }),
    ]);

    setSchedules((schedData ?? []) as ScheduleRow[]);
    setRequests((reqData ?? []) as RequestRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reschedule Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Initiate and track class rescheduling requests
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium">No reschedule requests yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Click "New Request" to start a reschedule.
            </p>
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <RequestCard key={req.request_id} request={req} onUpdate={loadData} />
          ))}
        </div>
      )}

      <RescheduleWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        schedules={schedules}
        onCreated={loadData}
      />
    </div>
  );
}

function RequestCard({
  request,
  onUpdate,
}: {
  request: RequestRow;
  onUpdate: () => void;
}) {
  const sched = request.master_schedules;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{sched?.courses?.course_name || sched?.course_name}</p>
              <Badge variant="outline" className={statusColor(request.status)}>
                {statusLabel(request.status)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {sched?.courses?.course_code || sched?.course_code} · {sched?.class_group} ·{' '}
              {sched?.day_of_week} {formatTime(sched?.start_time ?? '')} -{' '}
              {formatTime(sched?.end_time ?? '')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Reason: {request.reason || '—'}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Capacity: {request.required_capacity}</p>
            <p>Facilities: {request.required_facilities.join(', ') || 'Any'}</p>
          </div>
        </div>

        {request.schedule_proposals.length > 0 && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground">Proposed Slots</p>
            {request.schedule_proposals.map((p) => (
              <div
                key={p.proposal_id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {p.proposed_day} · {formatTime(p.proposed_start_time)} -{' '}
                    {formatTime(p.proposed_end_time)}
                  </span>
                </div>
                <Badge variant="outline" className={statusColor(p.consensus_status)}>
                  {statusLabel(p.consensus_status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RescheduleWizard({
  open,
  onClose,
  schedules,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  schedules: ScheduleRow[];
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [reason, setReason] = useState('');
  const [requiredCapacity, setRequiredCapacity] = useState(30);
  const [requiredFacilities, setRequiredFacilities] = useState<string[]>([]);
  const [proposedDay, setProposedDay] = useState<DayOfWeek>('Monday');
  const [proposedSlot, setProposedSlot] = useState<string>('');
  const [availableRooms, setAvailableRooms] = useState<RoomFacility[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(0);
    setSelectedSchedule('');
    setReason('');
    setRequiredCapacity(30);
    setRequiredFacilities([]);
    setProposedDay('Monday');
    setProposedSlot('');
    setAvailableRooms([]);
    setSelectedRoom('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleFacility = (f: string) => {
    setRequiredFacilities((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const runAvailabilityEngine = async () => {
    if (!profile || !selectedSchedule || !proposedSlot) return;
    setSearching(true);
    setAvailableRooms([]);
    setSelectedRoom('');

    const slot = TIME_SLOTS.find((s) => s.label === proposedSlot);
    if (!slot) {
      setSearching(false);
      return;
    }

    const supabase = createClient();

    const { data: allRooms } = await supabase
      .from('room_facilities')
      .select('*')
      .eq('is_active', true)
      .gte('capacity', requiredCapacity);

    const rooms = (allRooms ?? []) as RoomFacility[];

    const facilityFiltered = rooms.filter((r) =>
      requiredFacilities.every((f) => r.facilities.includes(f))
    );

    const { data: occupiedRooms } = await supabase
      .from('master_schedules')
      .select('room_id')
      .eq('day_of_week', proposedDay)
      .neq('status', 'cancelled')
      .or(
        `and(start_time.lte.${slot.start},end_time.gt.${slot.start}),and(start_time.lt.${slot.end},end_time.gte.${slot.end}),and(start_time.gte.${slot.start},end_time.lte.${slot.end})`
      );

    const occupiedRoomIds = new Set((occupiedRooms ?? []).map((r) => r.room_id));

    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('schedule_id', selectedSchedule);
    const studentIds = (enrollments ?? []).map((e) => e.student_id);

    let studentConflictRoomIds = new Set<string>();
    if (studentIds.length > 0) {
      const { data: studentSchedules } = await supabase
        .from('student_enrollments')
        .select('schedule_id, master_schedules!inner(room_id, day_of_week, start_time, end_time, status)')
        .in('student_id', studentIds)
        .neq('schedule_id', selectedSchedule)
        .eq('master_schedules.day_of_week', proposedDay)
        .neq('master_schedules.status', 'cancelled');

      (studentSchedules ?? []).forEach((row: Record<string, unknown>) => {
        const ms = row.master_schedules as Record<string, string>;
        const s = ms.start_time;
        const e = ms.end_time;
        if (s <= slot.start && e > slot.start) studentConflictRoomIds.add(ms.room_id);
        if (s < slot.end && e >= slot.end) studentConflictRoomIds.add(ms.room_id);
        if (s >= slot.start && e <= slot.end) studentConflictRoomIds.add(ms.room_id);
      });
    }

    const finalRooms = facilityFiltered.filter(
      (r) => !occupiedRoomIds.has(r.room_id)
    );

    setAvailableRooms(finalRooms);
    setSearching(false);

    if (finalRooms.length === 0) {
      toast({
        title: 'No available rooms',
        description: 'Try a different day or time slot.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: `${finalRooms.length} room(s) available`,
        description: 'Select a room to propose.',
      });
    }
  };

  const submit = async () => {
    if (!profile || !selectedSchedule || !selectedRoom || !proposedSlot) return;
    setSubmitting(true);
    const supabase = createClient();
    const slot = TIME_SLOTS.find((s) => s.label === proposedSlot);

    const { data: reqData, error: reqError } = await supabase
      .from('reschedule_requests')
      .insert({
        original_schedule_id: selectedSchedule,
        lecturer_id: profile.id,
        reason,
        required_capacity: requiredCapacity,
        required_facilities: requiredFacilities,
        status: 'pending_approval',
      })
      .select('*')
      .maybeSingle();

    if (reqError || !reqData) {
      toast({
        title: 'Failed to create request',
        description: reqError?.message,
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    const { error: propError } = await supabase
      .from('schedule_proposals')
      .insert({
        request_id: (reqData as RescheduleRequest).request_id,
        proposed_room_id: selectedRoom,
        proposed_day: proposedDay,
        proposed_start_time: slot!.start,
        proposed_end_time: slot!.end,
        consensus_status: 'waiting_review',
      });

    if (propError) {
      toast({
        title: 'Proposal creation issue',
        description: propError.message,
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('schedule_id', selectedSchedule);

    const studentIds = (enrollments ?? []).map((e) => e.student_id);
    const sched = schedules.find((s) => s.schedule_id === selectedSchedule);

    const courseNameLabel = sched?.courses?.course_name || sched?.course_name || 'A class';

    if (studentIds.length > 0) {
      const notifInserts = studentIds.map((sid) => ({
        user_id: sid,
        title: 'Reschedule proposal pending review',
        message: `${courseNameLabel} has a proposed new time: ${proposedDay} ${slot!.start}-${slot!.end}. Awaiting class leader approval.`,
        type: 'warning' as const,
        related_request_id: (reqData as RescheduleRequest).request_id,
      }));
      await supabase.from('notifications').insert(notifInserts);

      const { data: classLeaders } = await supabase
        .from('profiles')
        .select('id')
        .in('id', studentIds)
        .eq('role', 'student')
        .eq('is_class_leader', true);

      if (classLeaders && classLeaders.length > 0) {
        await supabase.from('notifications').insert(
          classLeaders.map((cl) => ({
            user_id: cl.id,
            title: 'New reschedule proposal to review',
            message: `${profile.full_name} proposed a new time for ${courseNameLabel}: ${proposedDay} ${slot!.start}-${slot!.end}.`,
            type: 'info' as const,
            related_request_id: (reqData as RescheduleRequest).request_id,
          }))
        );
      }
    }

    toast({
      title: 'Request submitted!',
      description: 'Your reschedule proposal has been sent for approval.',
    });
    setSubmitting(false);
    handleClose();
    onCreated();
  };

  const steps = ['Select Class', 'Requirements', 'Find Slot', 'Confirm'];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Reschedule Request</DialogTitle>
          <DialogDescription>
            Follow the steps to propose a new time slot for your class.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  i <= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 transition-colors',
                    i < step ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Select Class */}
        {step === 0 && (
          <div className="space-y-3">
            <Label>Select the class to reschedule</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {schedules.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active classes available.
                </p>
              )}
              {schedules.map((s) => (
                <button
                  key={s.schedule_id}
                  onClick={() => {
                    setSelectedSchedule(s.schedule_id);
                    setRequiredCapacity(s.room_facilities?.capacity ?? 30);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all',
                    selectedSchedule === s.schedule_id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:border-primary/40'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{s.courses?.course_name || s.course_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.courses?.course_code || s.course_code} · {s.class_group} · {s.day_of_week}{' '}
                      {formatTime(s.start_time)}-{formatTime(s.end_time)}
                    </p>
                  </div>
                  {selectedSchedule === s.schedule_id && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Requirements */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for reschedule</Label>
              <Textarea
                id="reason"
                placeholder="e.g. Conference attendance, sick leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Required room capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={requiredCapacity}
                onChange={(e) => setRequiredCapacity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Required facilities</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_FACILITIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFacility(f)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      requiredFacilities.includes(f)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Find Slot */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Proposed day</Label>
                <Select
                  value={proposedDay}
                  onValueChange={(v) => setProposedDay(v as DayOfWeek)}
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
                <Label>Time slot</Label>
                <Select value={proposedSlot} onValueChange={setProposedSlot}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((s) => (
                      <SelectItem key={s.label} value={s.label}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={runAvailabilityEngine}
              disabled={!proposedSlot || searching}
              className="w-full"
              variant="secondary"
            >
              {searching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Find Available Rooms
            </Button>

            {availableRooms.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {availableRooms.length} room(s) match your criteria
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {availableRooms.map((r) => (
                    <button
                      key={r.room_id}
                      onClick={() => setSelectedRoom(r.room_id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all',
                        selectedRoom === r.room_id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-primary/40'
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {r.room_name} ({r.room_code})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.floor} · Cap {r.capacity} · {r.facilities.join(', ')}
                        </p>
                      </div>
                      {selectedRoom === r.room_id && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableRooms.length === 0 && !searching && proposedSlot && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No rooms found yet. Click "Find Available Rooms" to search.
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-3">
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <ConfirmRow icon={Calendar} label="Class" value={
                  (schedules.find((s) => s.schedule_id === selectedSchedule)?.courses?.course_name) ||
                  (schedules.find((s) => s.schedule_id === selectedSchedule)?.course_name ?? '')
                } />
                <ConfirmRow
                  icon={Calendar}
                  label="Proposed day"
                  value={proposedDay}
                />
                <ConfirmRow
                  icon={Clock}
                  label="Time slot"
                  value={proposedSlot}
                />
                <ConfirmRow
                  icon={MapPin}
                  label="Room"
                  value={
                    availableRooms.find((r) => r.room_id === selectedRoom)?.room_code ?? ''
                  }
                />
                <ConfirmRow
                  icon={Users}
                  label="Capacity"
                  value={String(requiredCapacity)}
                />
                <ConfirmRow
                  icon={AlertCircle}
                  label="Reason"
                  value={reason || '—'}
                />
              </CardContent>
            </Card>
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-xs text-primary">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                The Availability Engine has verified room availability, no student
                conflicts, and facility requirements. This proposal will be sent to
                the Class Leader for approval.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? handleClose() : setStep((s) => s - 1))}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && !selectedSchedule) ||
                (step === 2 && !selectedRoom)
              }
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Submit Request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
