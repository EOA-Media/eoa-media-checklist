'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, CheckSquare, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push('/checklist');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080d18] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(47,108,246,0.12),transparent_32%),radial-gradient(circle_at_50%_86%,rgba(140,53,237,0.1),transparent_34%)]" />

      <section className="relative w-full max-w-[440px]">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="btn-gradient flex h-11 w-11 items-center justify-center rounded-xl">
            <CheckSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white">EOA Media</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Checklist</div>
          </div>
        </div>

        <div className="surface-card w-full overflow-hidden rounded-2xl p-6 sm:p-8">
          <h1 className="mb-7 text-center text-2xl font-bold tracking-tight text-white">
            Sign in
          </h1>

          {error && (
            <Alert variant="destructive" className="mb-6 border-red-500/25 bg-red-500/10 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@eoamedia.net"
                required
                className="glass-input h-11 w-full text-white placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="glass-input h-11 w-full text-white placeholder:text-slate-600"
              />
            </div>

            <Button type="submit" disabled={loading} className="btn-gradient h-11 w-full font-semibold">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to the workspace?{' '}
            <Link href="/signup" className="font-semibold text-indigo-300 transition-colors hover:text-indigo-200">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
