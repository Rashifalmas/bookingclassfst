'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Sidebar, MobileSidebarToggle } from '@/components/dashboard/sidebar';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [session, loading, router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 border-r md:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 h-full w-64 animate-slide-in-right md:hidden">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-3 border-b bg-card/80 px-4 glass md:px-6">
          <MobileSidebarToggle onClick={() => setMobileOpen(true)} />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {greeting()}, {profile.full_name.split(' ')[0]}
            </h2>
          </div>
        </header>
        <main className={cn('flex-1 overflow-y-auto p-4 md:p-6')}>{children}</main>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Good morning';
  if (h < 15) return 'Good afternoon';
  if (h < 19) return 'Good evening';
  return 'Good night';
}
