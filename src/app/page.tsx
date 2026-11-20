"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, LogOut, Sunrise } from "lucide-react";
import { login } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function Home() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const session = useAuthStore((state) => state.session);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await login({ email, password });
      setSession(result);
      if (result.user.role === "admin") {
        router.push("/admin/recipes");
      } else {
        router.push("/menu");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn't sign you in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="signin-page">
      <section className="signin-panel" aria-labelledby="page-title">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Sunrise size={21} strokeWidth={1.8} /></span>
          <span>morning table</span>
        </div>

        <div className="signin-copy">
          <p className="eyebrow">A GOOD DAY STARTS HERE</p>
          <h1 id="page-title">Breakfast,<br /><em>on your terms.</em></h1>
          <p className="signin-description">Sign in to see what’s on the table today.</p>
        </div>

        {session ? (
          <div className="signed-in-state" role="status">
            <span className="status-dot" />
            <div>
              <strong>Signed in as {session.user.name}</strong>
              <span>{session.user.role === "admin" ? "Administrator" : "Breakfast guest"}</span>
            </div>
            <button
              aria-label="Sign out"
              className="signout-button"
              onClick={clearSession}
              title="Sign out"
              type="button"
            >
              <LogOut size={17} />
            </button>
          </div>
        ) : (
          <form className="signin-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />

            <div className="password-label-row">
              <label htmlFor="password">Password</label>
            </div>
            <input
              autoComplete="current-password"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type="password"
              value={password}
            />

            {error && <p className="form-error"><CircleAlert size={16} />{error}</p>}

            <button className="signin-button" disabled={isSubmitting} type="submit">
              <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>
        )}

        <footer className="signin-footer">
          <span>MADE FOR SLOW MORNINGS</span>
          <span>EST. 2026</span>
        </footer>
      </section>
      <aside className="morning-panel" aria-label="Morning table">
        <div className="sun-stamp" aria-hidden="true"><Sunrise size={34} strokeWidth={1.4} /></div>
        <div className="morning-caption">
          <span>TODAY IS A FRESH START</span>
          <span className="caption-rule" />
          <span>TAKE A SEAT</span>
        </div>
        <div className="morning-orbit orbit-one" />
        <div className="morning-orbit orbit-two" />
        <div className="morning-orbit orbit-three" />
      </aside>
    </main>
  );
}
