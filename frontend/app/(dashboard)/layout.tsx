'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import { InfoCard } from '@/components/ui';
import { Spinner } from '@/components/ui';
import { daysLeft as getDaysLeft } from '@/lib/labels';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  const router = useRouter();

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

  // Subscription wall for boat_owner
  const isOwner = user.role === 'boat_owner';
  const sub = user.subscription;
  const subActive = isOwner && sub?.isActive && sub?.paymentStatus === 'paid' && sub?.endDate && new Date(sub.endDate) > new Date();
  const needsSubscription = isOwner && !subActive;

  // Days left warning
  const daysLeft = sub?.endDate ? getDaysLeft(sub.endDate) : 0;
  const showExpiryWarning = isOwner && subActive && daysLeft <= 7;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto">
          {/* Subscription expiry warning */}
          {showExpiryWarning && (
            <div className="px-4 pt-3">
              <InfoCard
                type="warning"
                message={`⏳ আপনার সাবস্ক্রিপশন ${daysLeft} দিনের মধ্যে শেষ হবে। দ্রুত রিনিউ করুন।`}
              />
            </div>
          )}

          {/* Subscription wall */}
          {needsSubscription ? (
            <div className="p-4 fade-in">
              <div className="card text-center py-10">
                <div className="text-5xl mb-4">💳</div>
                <h2 className="font-bold text-slate-800 text-lg mb-2">সাবস্ক্রিপশন প্রয়োজন</h2>
                <p className="text-sm text-slate-500 mb-6">
                  ড্যাশবোর্ড ব্যবহার করতে একটি প্ল্যান কিনুন এবং সুপার অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।
                </p>
                {sub?.paymentStatus === 'pending_approval' ? (
                  <InfoCard type="info" message="আপনার পেমেন্ট যাচাই হচ্ছে। সুপার অ্যাডমিন শীঘ্রই অনুমোদন করবেন।" />
                ) : (
                  <button onClick={() => router.push('/subscription')} className="btn btn-primary btn-full">
                    প্ল্যান দেখুন ও কিনুন
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="fade-in">{children}</div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
