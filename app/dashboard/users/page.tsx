'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Loader2, Search, ShieldCheck, BookOpen, ClipboardList, GraduationCap } from 'lucide-react';
import type { Profile, UserRole } from '@/lib/types/database';

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin_facilities: ShieldCheck,
  lecturer: BookOpen,
  student: GraduationCap,
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin_facilities: 'text-destructive bg-destructive/10',
  lecturer: 'text-primary bg-primary/10',
  student: 'text-success bg-success/10',
};

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers((data ?? []) as Profile[]);
      setLoading(false);
    })();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all system users
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin_facilities">Admin Facilities</SelectItem>
            <SelectItem value="lecturer">Lecturer</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((u) => {
            const Icon = ROLE_ICONS[u.role];
            return (
              <Card key={u.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${ROLE_COLORS[u.role]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="hidden sm:block text-right text-xs text-muted-foreground">
                    {u.lecturer_id && <p>NIDN: {u.lecturer_id}</p>}
                    {u.student_id && <p>NIM: {u.student_id}</p>}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline" className="capitalize">
                      {u.role.replace('_', ' ')}
                    </Badge>
                    {u.is_class_leader && (
                      <Badge variant="secondary" className="capitalize">
                        Class Leader
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm font-medium">No users found</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
