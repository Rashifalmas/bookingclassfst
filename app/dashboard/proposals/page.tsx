'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  AlertCircle,
  Users,
} from 'lucide-react';
import type {
  ScheduleProposal,
  RoomFacility,
  Profile,
  MasterSchedule,
  RescheduleRequest,
} from '@/lib/types/database';
import { formatTime, statusColor, statusLabel } from '@/lib/schedule-utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ProposalRow = ScheduleProposal & {
  room_facilities: RoomFacility | null;
  reschedule_requests: (RescheduleRequest & {
    master_schedules: (MasterSchedule & { room_facilities: RoomFacility | null }) | null;
    profiles: Profile | null;
  }) | null;
};

export default function ProposalsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'waiting' | 'all'>('waiting');

  const load = async () => {
    if (!profile) return;
    const supabase = createClient();
    setLoading(true);
    let query = supabase
      .from('schedule_proposals')
      .select(
        '*, room_facilities(*), reschedule_requests(*, master_schedules(*, room_facilities(*)), profiles(*))'
      )
      .order('created_at', { ascending: false });
    if (filter === 'waiting') {
      query = query.eq('consensus_status', 'waiting_review');
    }
    const { data } = await query;
    setProposals((data ?? []) as ProposalRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile, filter]);

  const handleReview = async (
    proposal: ProposalRow,
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ) => {
    if (!profile) return;
    const supabase = createClient();

    const { error } = await supabase
      .from('schedule_proposals')
      .update({
        consensus_status: decision,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: decision === 'rejected' ? rejectionReason ?? null : null,
      })
      .eq('proposal_id', proposal.proposal_id);

    if (error) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
      return;
    }

    await supabase
      .from('reschedule_requests')
      .update({ status: decision, updated_at: new Date().toISOString() })
      .eq('request_id', proposal.request_id);

    if (decision === 'approved' && proposal.reschedule_requests?.master_schedules) {
      const ms = proposal.reschedule_requests.master_schedules;
      await supabase
        .from('master_schedules')
        .update({
          room_id: proposal.proposed_room_id,
          day_of_week: proposal.proposed_day,
          start_time: proposal.proposed_start_time,
          end_time: proposal.proposed_end_time,
          status: 'rescheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('schedule_id', ms.schedule_id);
    }

    const req = proposal.reschedule_requests;
    if (req?.lecturer_id) {
      await supabase.from('notifications').insert({
        user_id: req.lecturer_id,
        title: `Proposal ${decision === 'approved' ? 'approved' : 'rejected'}`,
        message:
          decision === 'approved'
            ? `Your reschedule proposal for ${req.master_schedules?.course_name ?? 'a class'} has been approved. The schedule has been updated.`
            : `Your reschedule proposal for ${req.master_schedules?.course_name ?? 'a class'} has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: decision === 'approved' ? 'success' : 'error',
        related_request_id: proposal.request_id,
      });
    }

    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('schedule_id', req?.original_schedule_id ?? '');

    const studentIds = (enrollments ?? []).map((e) => e.student_id);
    if (studentIds.length > 0 && decision === 'approved') {
      await supabase.from('notifications').insert(
        studentIds.map((sid) => ({
          user_id: sid,
          title: 'Schedule updated',
          message: `${req?.master_schedules?.course_name ?? 'A class'} has been rescheduled to ${proposal.proposed_day} ${formatTime(proposal.proposed_start_time)}-${formatTime(proposal.proposed_end_time)} in ${proposal.room_facilities?.room_code}.`,
          type: 'info' as const,
          related_request_id: proposal.request_id,
        }))
      );
    }

    toast({
      title: decision === 'approved' ? 'Proposal approved' : 'Proposal rejected',
      description:
        decision === 'approved'
          ? 'The schedule has been updated and students notified.'
          : 'The lecturer has been notified.',
    });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reschedule Proposals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve or reject proposed class time changes
          </p>
        </div>
        <div className="flex gap-2 rounded-lg border p-1">
          <Button
            size="sm"
            variant={filter === 'waiting' ? 'default' : 'ghost'}
            onClick={() => setFilter('waiting')}
          >
            Waiting Review
          </Button>
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium">No proposals to review</p>
            <p className="text-xs text-muted-foreground">
              {filter === 'waiting'
                ? 'All proposals have been reviewed.'
                : 'No proposals have been submitted yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {proposals.map((p) => (
            <ProposalCard
              key={p.proposal_id}
              proposal={p}
              onReview={handleReview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalCard({
  proposal,
  onReview,
}: {
  proposal: ProposalRow;
  onReview: (
    p: ProposalRow,
    decision: 'approved' | 'rejected',
    reason?: string
  ) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const req = proposal.reschedule_requests;
  const ms = req?.master_schedules;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{ms?.course_name}</p>
              <Badge variant="outline" className={statusColor(proposal.consensus_status)}>
                {statusLabel(proposal.consensus_status)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {ms?.course_code} · {ms?.class_group}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Requested by</p>
            <p className="font-medium text-foreground">{req?.profiles?.full_name}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="mb-2 text-xs font-semibold text-destructive">Original Slot</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {ms?.day_of_week}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatTime(ms?.start_time ?? '')} - {formatTime(ms?.end_time ?? '')}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {ms?.room_facilities?.room_code}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-success/20 bg-success/5 p-3">
            <p className="mb-2 text-xs font-semibold text-success">Proposed Slot</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {proposal.proposed_day}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatTime(proposal.proposed_start_time)} -{' '}
                {formatTime(proposal.proposed_end_time)}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {proposal.room_facilities?.room_code} ({proposal.room_facilities?.capacity} seats)
              </div>
            </div>
          </div>
        </div>

        {req?.reason && (
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground">Reason</p>
            <p className="mt-1">{req.reason}</p>
          </div>
        )}

        {proposal.consensus_status === 'waiting_review' && (
          <div className="mt-4 flex gap-3 border-t pt-4">
            <Button
              className="flex-1"
              onClick={() => onReview(proposal, 'approved')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        )}

        {proposal.consensus_status === 'rejected' && proposal.rejection_reason && (
          <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
            <p className="text-xs font-semibold text-destructive">Rejection reason</p>
            <p className="mt-1">{proposal.rejection_reason}</p>
          </div>
        )}

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Proposal</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this reschedule proposal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rejReason">Reason</Label>
              <Textarea
                id="rejReason"
                placeholder="e.g. Students have another class at that time..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onReview(proposal, 'rejected', reason);
                  setRejectOpen(false);
                  setReason('');
                }}
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
