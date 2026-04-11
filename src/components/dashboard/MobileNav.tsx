"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FolderOpen, LogOut, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard/home", label: "Home", icon: Home },
  { href: "/dashboard/projects", label: "Projecten", icon: FolderOpen },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Top header bar (mobile only) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-sidebar-accent rounded-lg shadow-[0_3px_10px_rgba(0,0,0,0.25)]">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-heading font-semibold text-sm tracking-wide">LandMeting</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sidebar-muted hover:text-sidebar-foreground text-xs"
        >
          <LogOut className="w-4 h-4" />
          Uitloggen
        </button>
      </header>

      {/* Bottom tab bar (mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-card/95 backdrop-blur border-t border-border shadow-[0_-6px_24px_rgba(23,79,51,0.12)]">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 py-2.5 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
