'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  GraduationCap,
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Users,
  BookOpen,
  ClipboardList,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types/database';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS: {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'lecturer',
    label: 'Lecturer',
    description: 'Initiate reschedule requests',
    icon: BookOpen,
  },
  {
    value: 'class_leader',
    label: 'Class Leader',
    description: 'Approve or reject proposals',
    icon: ClipboardList,
  },
  {
    value: 'student',
    label: 'Student',
    description: 'View schedules & get notified',
    icon: Users,
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Manage master data & reports',
    icon: ShieldCheck,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [externalId, setExternalId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard');
    }
  }, [session, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    setSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    if (data.user) {
      const profileInsert: Record<string, unknown> = {
        id: data.user.id,
        full_name: fullName,
        email,
        role,
      };

      if (role === 'lecturer') {
        profileInsert.lecturer_id = externalId || null;
      } else if (role === 'student' || role === 'class_leader') {
        profileInsert.student_id = externalId || null;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileInsert);

      if (profileError) {
        toast({
          title: 'Profile creation issue',
          description: profileError.message,
          variant: 'destructive',
        });
      }
    }

    toast({
      title: 'Account created!',
      description: 'Welcome to Booking Class FST. Redirecting...',
    });
    router.replace('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4 animate-slide-up">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join the Booking Class FST platform
          </p>
        </div>

        <Card className="border-border/60 shadow-xl shadow-sky-900/5">
          <CardHeader>
            <CardTitle className="text-xl">Register</CardTitle>
            <CardDescription>Choose your role and fill in your details</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = role === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/40 hover:bg-muted/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors',
                            selected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@university.ac.id"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {(role === 'lecturer' || role === 'student' || role === 'class_leader') && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="externalId">
                    {role === 'lecturer' ? 'Lecturer ID (NIDN)' : 'Student ID (NIM)'}
                  </Label>
                  <Input
                    id="externalId"
                    placeholder={role === 'lecturer' ? 'e.g. 0123456789' : 'e.g. 22515020011111'}
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create account
                {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
