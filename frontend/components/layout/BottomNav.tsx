'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard, BedDouble, CalendarCheck,
  Users, ShieldCheck, Wallet,
  BarChart2, CalendarDays,
} from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const role = user?.role;

  const ownerLinks = [
    { href: '/dashboard',  icon: LayoutDashboard, label: 'হোম' },
    { href: '/rooms',      icon: BedDouble,       label: 'রুম' },
    { href: '/bookings',   icon: CalendarCheck,   label: 'বুকিং' },
    { href: '/manifest',   icon: CalendarDays,    label: 'ম্যানিফেস্ট' },
    { href: '/finance',    icon: BarChart2,        label: 'রিপোর্ট' },
  ];

  const agentLinks = [
    { href: '/dashboard',  icon: LayoutDashboard, label: 'হোম' },
    { href: '/bookings',   icon: CalendarCheck,   label: 'বুকিং' },
    { href: '/agents',     icon: Users,           label: 'বোট খুঁজুন' },
  ];

  const adminLinks = [
    { href: '/dashboard',    icon: LayoutDashboard, label: 'হোম' },
    { href: '/admin',        icon: ShieldCheck,     label: 'অ্যাডমিন' },
    { href: '/subscription', icon: Wallet,          label: 'সাবস্ক্রিপশন' },
  ];

  const links = role === 'super_admin' ? adminLinks
    : role === 'agent' ? agentLinks
    : ownerLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around max-w-md mx-auto px-1 pt-2 pb-2"
           style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-h-0 ${
                active ? 'text-sky-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${active ? 'bg-sky-100' : ''}`}>
                <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
