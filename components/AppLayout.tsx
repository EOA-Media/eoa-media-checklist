'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CheckSquare, Calendar, Users, User, LogOut, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.name);
      }

      setLoading(false);
    };

    checkAuth();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string) => {
        if (event === 'SIGNED_OUT') router.push('/login');
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  const navItems = [
    { href: '/checklist', label: 'Checklist', icon: CheckSquare },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/friends', label: 'Friends', icon: Users },
  ];

  return (
    <div className="min-h-screen md:h-screen flex bg-[#080d18]">
      <aside className="hidden md:flex w-[238px] flex-shrink-0 flex-col border-r border-slate-800/80 bg-[#101827]">
        <div className="h-[88px] flex items-center px-5 border-b border-slate-800/70">
          <div className="h-9 w-9 rounded-xl btn-gradient flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CheckSquare className="h-[18px] w-[18px] text-white" />
          </div>
          <div className="ml-3 min-w-0">
            <div className="text-sm font-bold tracking-tight text-white">EOA Media</div>
            <div className="text-[10px] text-slate-500">Productivity System</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5">
          <div className="eyebrow px-3 pb-2 pt-3 text-[10px]">Workspace</div>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="block">
                <div className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all ${
                  active
                    ? 'border border-indigo-400/25 bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-white shadow-[0_8px_30px_rgba(69,64,200,0.12)]'
                    : 'border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                }`}>
                  <Icon className={`h-4 w-4 ${active ? 'text-indigo-300' : 'text-slate-500'}`} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/80 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto w-full justify-start gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-white/[0.04]">
                <div className="h-8 w-8 rounded-lg btn-gradient flex flex-shrink-0 items-center justify-center text-xs font-bold uppercase">
                  {(userName || 'U').slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-100">{userName || 'User'}</div>
                  <div className="text-[10px] text-slate-500">Signed in</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="glass-panel min-w-[190px] border-slate-700/60 bg-[#111a2a] text-white">
              <DropdownMenuLabel className="text-xs text-slate-400">{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700/60" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-slate-300 focus:bg-white/[0.06] focus:text-white">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col">
        <header className="md:hidden sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#101827]/95 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg btn-gradient flex items-center justify-center">
              <CheckSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">EOA Media</div>
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Checklist</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full border border-slate-700/70 bg-slate-800/50 p-0">
                <User className="h-4 w-4 text-slate-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel border-slate-700/60 bg-[#111a2a] text-white">
              <DropdownMenuLabel>{userName || 'User'}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700/60" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer focus:bg-white/[0.06] focus:text-white">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/90 bg-[#101827]/95 px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="flex-1">
                <div className={`flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors ${
                  active ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-500'
                }`}>
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
