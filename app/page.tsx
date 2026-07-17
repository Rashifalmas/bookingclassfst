'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.replace(session ? '/dashboard' : '/login');
    }
  }, [session, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
