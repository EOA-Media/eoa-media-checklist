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
import { CheckSquare, Calendar, User, LogOut, Loader2 } from 'lucide-react';
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
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass-panel border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg md:text-xl font-semibold text-white">EOA Media Checklist</h1>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-2 bg-white/5 rounded-full p-1 border border-white/10">
              <Link href="/checklist">
                <Button
                  variant="ghost"
                  className={`rounded-full transition-all duration-200 ${
                    pathname === '/checklist'
                      ? 'btn-gradient text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Checklist
                </Button>
              </Link>
              <Link href="/calendar">
                <Button
                  variant="ghost"
                  className={`rounded-full transition-all duration-200 ${
                    pathname === '/calendar'
                      ? 'btn-gradient text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </Link>
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 rounded-full">
                  <User className="h-4 w-4 mr-2" />
                  {userName || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-panel border-white/10 backdrop-blur-xl">
                <DropdownMenuLabel className="text-gray-200 font-semibold">{userName}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <nav className="md:hidden glass-panel border-t border-white/10 fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl">
        <div className="flex items-center justify-around h-16 px-2">
          <Link href="/checklist" className="flex-1">
            <Button
              variant="ghost"
              className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                pathname === '/checklist'
                  ? 'text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <CheckSquare className="h-5 w-5" />
              <span className="text-xs font-medium">Checklist</span>
            </Button>
          </Link>
          <Link href="/calendar" className="flex-1">
            <Button
              variant="ghost"
              className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                pathname === '/calendar'
                  ? 'text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs font-medium">Calendar</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
