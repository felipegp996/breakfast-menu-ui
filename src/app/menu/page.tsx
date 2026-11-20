"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleAlert, Clock3, Coffee, LogOut, RefreshCw, Sunrise, X } from "lucide-react";
import { cancelBreakfastRequest, getTodayMenu, placeBreakfastRequest } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function MenuPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const hydrated = useAuthStore((state) => state.hydrated);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (hydrated && (!session || session.user.role !== "user")) {
      router.replace(session?.user.role === "admin" ? "/admin/recipes" : "/");
    }
  }, [hydrated, router, session]);

  const menuQuery = useQuery({
    queryKey: ["menu", "today"],
    queryFn: () => getTodayMenu(session!.token),
    enabled: hydrated && session?.user.role === "user",
  });

  const orderMutation = useMutation({
    mutationFn: (recipeId: string) => placeBreakfastRequest(session!.token, recipeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu", "today"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBreakfastRequest(session!.token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu", "today"] }),
  });

  const menu = menuQuery.data;
  const currentRequest = menu?.currentRequest ?? null;
  const isMutating = orderMutation.isPending || cancelMutation.isPending;
  const mutationError = orderMutation.error ?? cancelMutation.error;

  function signOut() {
    clearSession();
    router.replace("/");
  }

  function cancelOrder() {
    if (window.confirm("Cancel your breakfast request for today?")) {
      cancelMutation.mutate();
    }
  }

  if (!hydrated || !session || session.user.role !== "user") {
    return <main className="guest-loading">Setting your place at the table...</main>;
  }

  const prettyDate = menu?.serviceDate
    ? new Date(`${menu.serviceDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : "Today";

  return (
    <main className="guest-shell">
      <header className="guest-header">
        <a className="guest-brand" href="/menu">
          <span className="brand-mark" aria-hidden="true"><Sunrise size={21} /></span>
          <span>morning table</span>
        </a>
        <div className="guest-header-right">
          <span className="guest-welcome">Good morning, {session.user.name.split(" ")[0]}</span>
          <button aria-label="Sign out" className="signout-button" onClick={signOut} title="Sign out" type="button"><LogOut size={17} /></button>
        </div>
      </header>

      <section className="guest-content">
        <div className="guest-heading">
          <div>
            <p className="eyebrow">A FRESH START</p>
            <h1>Today&apos;s table<span className="heading-period">.</span></h1>
            <p className="guest-date"><Clock3 size={15} />{prettyDate}</p>
          </div>
          <div className="service-note"><span className="service-dot" />Made fresh for today</div>
        </div>

        {currentRequest && (
          <section className="current-order" aria-labelledby="current-order-title">
            <div className="current-order-icon"><Check size={18} /></div>
            <div className="current-order-copy">
              <p className="current-order-label" id="current-order-title">YOUR BREAKFAST IS SET</p>
              <h2>{currentRequest.recipeSnapshot.name}</h2>
              <p>{currentRequest.recipeSnapshot.description}</p>
            </div>
            <button className="cancel-order-button" disabled={isMutating} onClick={cancelOrder} type="button">
              <X size={15} />
              <span>Cancel order</span>
            </button>
          </section>
        )}

        <div className="menu-section-heading">
          <div>
            <p className="admin-eyebrow">FROM THE KITCHEN</p>
            <h2>{currentRequest ? "Change your breakfast" : "Available this morning"}</h2>
          </div>
          {menu && <span className="menu-count">{menu.recipes.length} {menu.recipes.length === 1 ? "dish" : "dishes"}</span>}
        </div>

        {menuQuery.isPending ? (
          <div className="menu-loading" role="status"><span className="loading-mark"><Coffee size={21} /></span><span>Checking what&apos;s fresh today...</span></div>
        ) : menuQuery.isError ? (
          <div className="menu-message menu-error" role="alert">
            <CircleAlert size={20} />
            <h2>We couldn&apos;t load the menu</h2>
            <p>{menuQuery.error.message}</p>
            <button className="secondary-action" onClick={() => menuQuery.refetch()} type="button"><RefreshCw size={15} />Try again</button>
          </div>
        ) : menu && menu.recipes.length === 0 ? (
          <div className="menu-message menu-empty">
            <span className="empty-mark"><Coffee size={22} /></span>
            <h2>Nothing on the menu just yet</h2>
            <p>There aren&apos;t any recipes available for today. Check back later.</p>
          </div>
        ) : (
          <div className="breakfast-grid">
            {menu?.recipes.map((recipe, index) => {
              const isSelected = currentRequest?.recipeId === recipe.id;
              return (
                <article className={`breakfast-card${isSelected ? " selected" : ""}`} key={recipe.id} style={{ animationDelay: `${index * 70}ms` }}>
                  <div
                    aria-label={`${recipe.name} breakfast`}
                    className="breakfast-image"
                    role="img"
                    style={{ backgroundImage: `linear-gradient(180deg, transparent 53%, rgb(20 35 28 / 36%)), url("${recipe.imageUrl}")` }}
                  >
                    {isSelected && <span className="selected-stamp"><Check size={14} />YOUR PICK</span>}
                  </div>
                  <div className="breakfast-card-body">
                    <div className="breakfast-card-title">
                      <h3>{recipe.name}</h3>
                      {isSelected && <Check className="selected-check" size={17} />}
                    </div>
                    <p className="breakfast-description">{recipe.description}</p>
                    <ul className="breakfast-ingredients" aria-label={`${recipe.name} ingredients`}>
                      {recipe.ingredients.map((ingredient) => (
                        <li key={ingredient.ingredientId}>{ingredient.name}<span>{ingredient.quantity} {ingredient.unit}</span></li>
                      ))}
                    </ul>
                    <button
                      className={isSelected ? "order-button order-button-selected" : "order-button"}
                      disabled={isMutating || isSelected}
                      onClick={() => orderMutation.mutate(recipe.id)}
                      type="button"
                    >
                      <span>{isMutating && !isSelected ? "Updating..." : isSelected ? "Selected for today" : currentRequest ? "Choose this instead" : "Choose for today"}</span>
                      {!isSelected && <ArrowRight size={16} />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {mutationError && <p className="guest-action-error" role="alert"><CircleAlert size={15} />{mutationError.message}</p>}

        <footer className="guest-footer">
          <span>MADE FOR SLOW MORNINGS</span>
          <span>MENU SUBJECT TO TODAY&apos;S PANTRY</span>
        </footer>
      </section>
    </main>
  );
}