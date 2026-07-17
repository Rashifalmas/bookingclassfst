'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Bell,
  Building2,
  Users,
  BarChart3,
  GraduationCap,
  LogOut,
  ChevronLeft,
  ClipboardList,
} from 'lucide-react';
import type { UserRole } from '@/lib/types/database';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'lecturer', 'student', 'class_leader'],
  },
  {
    label: 'My Schedule',
    href: '/dashboard/schedule',
    icon: CalendarDays,
    roles: ['lecturer', 'student', 'class_leader'],
  },
  {
    label: 'Reschedule Requests',
    href: '/dashboard/reschedule',
    icon: Clock,
    roles: ['lecturer'],
  },
  {
    label: 'Proposals',
    href: '/dashboard/proposals',
    icon: ClipboardList,
    roles: ['class_leader'],
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    roles: ['admin', 'lecturer', 'student', 'class_leader'],
  },
  {
    label: 'Rooms',
    href: '/dashboard/rooms',
    icon: Building2,
    roles: ['admin'],
  },
  {
    label: 'Users',
    href: '/dashboard/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'Schedules',
    href: '/dashboard/master-schedules',
    icon: CalendarDays,
    roles: ['admin'],
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['admin'],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const items = NAV_ITEMS.filter((item) =>
    profile?.role && item.roles.includes(profile.role)
  );

  const roleLabel: Record<UserRole, string> = {
    admin: 'Administrator',
    lecturer: 'Lecturer',
    student: 'Student',
    class_leader: 'Class Leader',
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Booking Class</p>
          <p className="text-xs text-muted-foreground leading-tight">FST System</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-3">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile ? roleLabel[profile.role] : ''}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function MobileSidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card md:hidden"
      aria-label="Toggle sidebar"
    >
      <ChevronLeft className="h-4 w-4 rotate-180" />
    </button>
  );
}
