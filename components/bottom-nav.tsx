"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  ClipboardCheck,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/home", label: "Нүүр", icon: Home },
  { href: "/schedule", label: "Хуваарь", icon: CalendarDays },
  { href: "/tasks", label: "Даалгавар", icon: ClipboardCheck },
  { href: "/rewards", label: "Шагнал", icon: Trophy },
  { href: "/profile", label: "Профайл", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-[#120f2e]/85 backdrop-blur-xl">
      <ul className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-accent-2" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2.4 : 2}
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.18 : 0}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
