import type { DayOfWeek } from '@/lib/types/database';
import { DAYS } from '@/lib/types/database';

export function daySortIndex(day: string): number {
  return DAYS.indexOf(day as DayOfWeek);
}

export function formatTime(time: string): string {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  return `${parts[0]}:${parts[1]}`;
}

export function dayLabel(day: string): string {
  return day;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-success bg-success/10 border-success/20';
    case 'rescheduled':
      return 'text-warning bg-warning/10 border-warning/20';
    case 'cancelled':
      return 'text-destructive bg-destructive/10 border-destructive/20';
    case 'approved':
      return 'text-success bg-success/10 border-success/20';
    case 'rejected':
      return 'text-destructive bg-destructive/10 border-destructive/20';
    case 'pending_approval':
    case 'pending_slot_selection':
      return 'text-warning bg-warning/10 border-warning/20';
    case 'waiting_review':
      return 'text-warning bg-warning/10 border-warning/20';
    default:
      return 'text-muted-foreground bg-muted/50 border-border';
  }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    rescheduled: 'Rescheduled',
    cancelled: 'Cancelled',
    pending_slot_selection: 'Pending Slot Selection',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled_request: 'Cancelled',
    waiting_review: 'Waiting Review',
  };
  return map[status] ?? status;
}
