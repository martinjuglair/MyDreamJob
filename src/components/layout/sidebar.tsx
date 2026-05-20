"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Kanban,
  FileText,
  Gift,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, badgeGradient: "from-pink-400 to-rose-500" },
  { name: "Offres", href: "/jobs", icon: Briefcase, badgeGradient: "from-cyan-400 to-blue-500" },
  { name: "Board", href: "/board", icon: Kanban, badgeGradient: "from-violet-400 to-purple-500" },
  { name: "Mon CV", href: "/cv", icon: FileText, badgeGradient: "from-emerald-400 to-teal-500" },
  { name: "Récompenses", href: "/rewards", icon: Gift, badgeGradient: "from-amber-400 to-orange-500" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-72 flex-col bg-gradient-to-b from-[#3d7a7a] via-[#356c6c] to-[#2d5d5d] text-white shadow-2xl lg:w-64">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-white/15 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 to-pink-400 text-white shadow-lg">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-bold leading-tight">FindMyDream</p>
          <p className="text-xs text-white/60">Capucine ✨</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:bg-white/20",
                isActive
                  ? "bg-white/15 text-white shadow-inner"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                  isActive
                    ? `bg-gradient-to-br ${item.badgeGradient} text-white shadow-md`
                    : "bg-white/5 text-white/70 group-hover:bg-white/10"
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <span>{item.name}</span>
              {isActive && (
                <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer encouragement */}
      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
          <p className="text-xs leading-relaxed text-white/85">
            <span className="text-base">💪</span> Chaque jour te rapproche du job de tes rêves !
          </p>
        </div>
      </div>
    </aside>
  );
}
