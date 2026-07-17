'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Loader2,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/types/database';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setNotifs((data ?? []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile]);

  const markAllRead = async () => {
    if (!profile) return;
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    load();
  };

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', id);
    load();
  };

  const iconForType = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return { Icon: CheckCircle2, color: 'text-success bg-success/10' };
      case 'warning':
        return { Icon: AlertTriangle, color: 'text-warning bg-warning/10' };
      case 'error':
        return { Icon: XCircle, color: 'text-destructive bg-destructive/10' };
      default:
        return { Icon: Info, color: 'text-primary bg-primary/10' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated on schedule changes and requests
          </p>
        </div>
        {notifs.some((n) => !n.is_read) && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : notifs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground">
              You&apos;ll see updates here when schedules change.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const { Icon, color } = iconForType(n.type);
            return (
              <Card
                key={n.notification_id}
                className={cn(
                  'transition-all hover:shadow-sm',
                  !n.is_read && 'border-primary/30 bg-primary/5'
                )}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead(n.notification_id)}
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
