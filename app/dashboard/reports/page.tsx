'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, Loader2, Building2, TrendingUp, Clock } from 'lucide-react';
import type { RoomFacility, MasterSchedule, RescheduleRequest } from '@/lib/types/database';
import { DAYS, TIME_SLOTS } from '@/lib/types/database';

const CHART_COLORS = [
  'hsl(199 89% 48%)',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
  'hsl(340 75% 55%)',
  'hsl(210 40% 50%)',
];

export default function ReportsPage() {
  const [rooms, setRooms] = useState<RoomFacility[]>([]);
  const [schedules, setSchedules] = useState<MasterSchedule[]>([]);
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: r }, { data: s }, { data: req }] = await Promise.all([
        supabase.from('room_facilities').select('*').order('room_code'),
        supabase.from('master_schedules').select('*').neq('status', 'cancelled'),
        supabase.from('reschedule_requests').select('*'),
      ]);
      setRooms((r ?? []) as RoomFacility[]);
      setSchedules((s ?? []) as MasterSchedule[]);
      setRequests((req ?? []) as RescheduleRequest[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const roomUtilization = rooms.map((room) => {
    const count = schedules.filter((s) => s.room_id === room.room_id).length;
    const totalSlots = DAYS.length * TIME_SLOTS.length;
    const pct = totalSlots > 0 ? Math.round((count / totalSlots) * 100) : 0;
    return { name: room.room_code, sessions: count, utilization: pct, capacity: room.capacity };
  });

  const dayDistribution = DAYS.map((day) => ({
    day: day.slice(0, 3),
    sessions: schedules.filter((s) => s.day_of_week === day).length,
  }));

  const requestStatusData = [
    {
      name: 'Approved',
      value: requests.filter((r) => r.status === 'approved').length,
      color: CHART_COLORS[1],
    },
    {
      name: 'Rejected',
      value: requests.filter((r) => r.status === 'rejected').length,
      color: CHART_COLORS[4],
    },
    {
      name: 'Pending',
      value: requests.filter((r) =>
        ['pending_slot_selection', 'pending_approval'].includes(r.status)
      ).length,
      color: CHART_COLORS[2],
    },
  ];

  const totalUtilization = roomUtilization.reduce((a, b) => a + b.utilization, 0);
  const avgUtilization = rooms.length > 0 ? Math.round(totalUtilization / rooms.length) : 0;
  const totalSessions = schedules.length;
  const totalRequests = requests.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Room Utilization Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analytics on room usage, schedule distribution, and reschedule activity
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Rooms</p>
              <p className="text-2xl font-bold">{rooms.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Sessions</p>
              <p className="text-2xl font-bold">{totalSessions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Utilization</p>
              <p className="text-2xl font-bold">{avgUtilization}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reschedule Requests</p>
              <p className="text-2xl font-bold">{totalRequests}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Room Utilization</CardTitle>
            <CardDescription>Number of sessions per room</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roomUtilization}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions by Day</CardTitle>
            <CardDescription>Distribution of classes across weekdays</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dayDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="sessions" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reschedule Request Status</CardTitle>
            <CardDescription>Approval outcomes for all requests</CardDescription>
          </CardHeader>
          <CardContent>
            {totalRequests === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No reschedule requests yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={requestStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {requestStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Room Details</CardTitle>
            <CardDescription>Capacity and utilization per room</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {roomUtilization.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Cap: {r.capacity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{r.sessions} sessions</span>
                  <Badge
                    variant="outline"
                    className={
                      r.utilization > 60
                        ? 'text-warning border-warning/30'
                        : r.utilization > 30
                        ? 'text-primary border-primary/30'
                        : 'text-muted-foreground'
                    }
                  >
                    {r.utilization}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
