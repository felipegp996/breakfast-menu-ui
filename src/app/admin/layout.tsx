"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, CalendarDays, LogOut, Sunrise, Wheat } from "lucide-react";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const hydrated = useAuthStore((state) => state.hydrated);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (hydrated && (!session || session.user.role !== "admin")) {
      router.replace("/");
    }
  }, [hydrated, router, session]);

  if (!hydrated || !session || session.user.role !== "admin") {
    return <main className="admin-loading">Loading your workspace...</main>;
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin/recipes">
          <span className="brand-mark" aria-hidden="true"><Sunrise size={21} /></span>
          <span>morning table</span>
        </Link>
        <p className="admin-nav-label">CATALOG</p>
        <nav className="admin-nav" aria-label="Admin navigation">
          <Link aria-label="Recipes" className={pathname.startsWith("/admin/recipes") ? "admin-nav-link active" : "admin-nav-link"} href="/admin/recipes" title="Recipes">
            <BookOpen size={17} />
            <span>Recipes</span>
          </Link>
          <Link aria-label="Ingredients" className={pathname.startsWith("/admin/ingredients") ? "admin-nav-link active" : "admin-nav-link"} href="/admin/ingredients" title="Ingredients">
            <Wheat size={17} />
            <span>Ingredients</span>
          </Link>
          <Link aria-label="Daily stock" className={pathname.startsWith("/admin/daily-stock") ? "admin-nav-link active" : "admin-nav-link"} href="/admin/daily-stock" title="Daily stock">
            <CalendarDays size={17} />
            <span>Daily stock</span>
          </Link>
          <Link aria-label="Notifications" className={pathname.startsWith("/admin/notifications") ? "admin-nav-link active" : "admin-nav-link"} href="/admin/notifications" title="Notifications">
            <Bell size={17} />
            <span>Notifications</span>
          </Link>
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-identity">
            <span className="identity-avatar">{session.user.name.slice(0, 1).toUpperCase()}</span>
            <span className="identity-details">
              <strong>{session.user.name}</strong>
              <span>Administrator</span>
            </span>
          </div>
          <button
            aria-label="Sign out"
            className="admin-signout"
            onClick={() => {
              clearSession();
              router.replace("/");
            }}
            title="Sign out"
            type="button"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <span>ADMINISTRATION</span>
          <span className="admin-topbar-date">BREAKFAST CATALOG</span>
        </header>
        {children}
      </section>
    </main>
  );
}