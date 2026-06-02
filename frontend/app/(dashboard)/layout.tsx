'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import { InfoCard, Spinner } from '@/components/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!token || !user) { router.replace('/login'); }
  }, [token, user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const sub = user.subscription;
  const subActive =
    user.role !== 'boat_owner' ||
    (sub?.isActive && sub?.paymentStatus === 'paid' && sub?.endDate && new Date(sub.endDate) > new Date());
  const pending = user.role === 'boat_owner' && sub?.paymentStatus === 'pending_approval';
  const canRenderChildren = subActive || pathname === '/subscription';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto">
          {canRenderChildren ? (
            <div className="fade-in">{children}</div>
          ) : (
            <div className="page fade-in">
              <div className="card text-center">
                <h1 className="mb-2 text-lg font-bold text-slate-800">সাবস্ক্রিপশন দরকার</h1>
                <p className="mb-4 text-sm text-slate-500">
                  প্ল্যাটফর্ম ব্যবহার করতে পেমেন্ট প্রুফ জমা দিন। সুপার অ্যাডমিন অনুমোদন করলে বোট চালু হবে।
                </p>
                {pending && (
                  <div className="mb-4">
                    <InfoCard type="info" message="আপনার পেমেন্ট যাচাই হচ্ছে। অনুমোদন হলে অ্যাক্সেস খুলবে।" />
                  </div>
                )}
                {sub?.paymentStatus === 'failed' && (
                  <div className="mb-4">
                    <InfoCard type="warning" message={sub.rejectionReason || 'পেমেন্ট প্রত্যাখ্যান হয়েছে। আবার জমা দিন।'} />
                  </div>
                )}
                <Link href="/subscription" className="btn btn-primary btn-full">
                  প্ল্যান ও পেমেন্ট দিন
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
