'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, CheckCircle2, CheckSquare, Loader2, UserPlus } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          name,
          email,
        } as any);
        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }
        router.push('/checklist');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080d18] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(47,108,246,0.14),transparent_30%),radial-gradient(circle_at_82%_78%,rgba(140,53,237,0.12),transparent_32%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="mb-12 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl btn-gradient flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
            <div><div className="font-bold text-white">EOA Media</div><div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Checklist System</div></div>
          </div>
          <div className="eyebrow mb-4">Your command center</div>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.08] tracking-[-0.04em] text-white">Build a calmer, clearer <span className="text-gradient">workday.</span></h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-400">Create your workspace and turn every priority into a visible next action.</p>
          <div className="mt-9 space-y-3">
            {['Organize work your way', 'Plan recurring routines', 'See time-blocked work at a glance'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400" />{item}</div>
            ))}
          </div>
        </section>

        <section className="mx-auto min-w-0 w-full max-w-[460px]">
          <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
            <div className="h-10 w-10 rounded-xl btn-gradient flex items-center justify-center"><CheckSquare className="h-5 w-5 text-white" /></div>
            <span className="font-bold text-white">EOA Media</span>
          </div>
          <div className="surface-card w-full min-w-0 max-w-full overflow-hidden rounded-2xl p-6 sm:p-8">
            <div className="mb-7">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10"><UserPlus className="h-[18px] w-[18px] text-indigo-300" /></div>
              <div className="eyebrow mb-2">Get started</div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Create your workspace</h2>
              <p className="mt-2 text-sm text-slate-500">Set up your EOA Media checklist.</p>
            </div>
            {error && <Alert variant="destructive" className="mb-5 border-red-500/25 bg-red-500/10 text-red-300"><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={handleSignup} className="space-y-4">
              {[
                { id: 'name', label: 'Name', type: 'text', value: name, set: setName, placeholder: 'Your name' },
                { id: 'email', label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'you@eoamedia.net' },
                { id: 'password', label: 'Password', type: 'password', value: password, set: setPassword, placeholder: 'At least 6 characters' },
                { id: 'confirmPassword', label: 'Confirm password', type: 'password', value: confirmPassword, set: setConfirmPassword, placeholder: 'Repeat your password' },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{field.label}</Label>
                  <Input id={field.id} type={field.type} value={field.value} onChange={(e) => field.set(e.target.value)} placeholder={field.placeholder} required className="glass-input h-11 min-w-0 w-full text-white placeholder:text-slate-600" />
                </div>
              ))}
              <Button type="submit" disabled={loading} className="btn-gradient mt-2 h-11 w-full font-semibold">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : <>Create account<ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
            <p className="mt-6 break-words text-center text-sm text-slate-500">Already have an account?{' '}<Link href="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">Sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
