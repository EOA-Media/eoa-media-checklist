'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.replace('/checklist');
      } else {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080d18]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-2xl btn-gradient flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
        <span className="eyebrow">Loading workspace</span>
      </div>
    </div>
  );
}
