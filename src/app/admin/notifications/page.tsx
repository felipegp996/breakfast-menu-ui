"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronLeft, ChevronRight, CircleAlert, RefreshCw } from "lucide-react";
import { listOrderNotifications, OrderNotification } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const emptyNotifications: OrderNotification[] = [];

export default function NotificationsPage() {
  const session = useAuthStore((state) => state.session);
  const [page, setPage] = useState(1);

  const notificationsQuery = useQuery({
    queryKey: ["admin", "notifications", page],
    queryFn: () => listOrderNotifications(session!.token, page),
    enabled: Boolean(session?.token),
    refetchInterval: 30_000,
  });

  const result = notificationsQuery.data;
  const notifications = result?.notifications ?? emptyNotifications;
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 0;
  const firstItem = total === 0 ? 0 : (page - 1) * 10 + 1;
  const lastItem = Math.min(page * 10, total);

  return (
    <div className="admin-content">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">ORDER INBOX</p>
          <h1>Notifications</h1>
          <p className="admin-subtitle">Breakfast orders from your customers, newest first.</p>
        </div>
      </div>

      <section className="catalog-toolbar notification-toolbar" aria-label="Notification controls">
        <span className="catalog-count">{total} {total === 1 ? "order" : "orders"}</span>
        <button
          aria-label="Refresh notifications"
          className="icon-action"
          disabled={notificationsQuery.isFetching}
          onClick={() => void notificationsQuery.refetch()}
          title="Refresh notifications"
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
        </button>
      </section>

      {notificationsQuery.isError && (
        <p className="admin-alert" role="alert"><CircleAlert size={16} />{notificationsQuery.error.message}</p>
      )}

      {notificationsQuery.isPending ? (
        <div className="catalog-state">Loading notifications...</div>
      ) : notificationsQuery.isError && !result ? (
        <div className="catalog-state">Refresh to try loading notifications again.</div>
      ) : notifications.length === 0 ? (
        <div className="catalog-empty notification-empty">
          <span className="empty-mark"><Bell size={21} /></span>
          <h2>No orders yet</h2>
          <p>New breakfast orders will appear here.</p>
        </div>
      ) : (
        <>
          <div className="notification-list">
            {notifications.map((notification) => (
              <article className="notification-row" key={notification._id}>
                <div
                  aria-label={`${notification.order.recipe.name} photo`}
                  className="notification-image"
                  role="img"
                  style={{ backgroundImage: `url("${notification.order.recipe.imageUrl}")` }}
                />
                <div className="notification-details">
                  <div className="notification-heading">
                    <div>
                      <span className="notification-label">ORDER PLACED</span>
                      <h2>{notification.order.recipe.name}</h2>
                    </div>
                    <time dateTime={notification.orderedAt}>{formatDateTime(notification.orderedAt)}</time>
                  </div>
                  <p className="notification-customer">
                    <strong>{notification.userName}</strong>
                    <span>{notification.userEmail}</span>
                    <span>For {formatServiceDate(notification.order.serviceDate)}</span>
                  </p>
                  <p className="notification-ingredients">
                    {notification.order.recipe.ingredients.map(({ name, quantity, unit }) => `${name} ${quantity} ${unit}`).join(" · ")}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 0 && (
            <nav aria-label="Notification pages" className="notification-pagination">
              <span>Showing {firstItem}–{lastItem} of {total}</span>
              <div>
                <button
                  aria-label="Previous page"
                  className="icon-action"
                  disabled={page <= 1 || notificationsQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  title="Previous page"
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" size={18} />
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  aria-label="Next page"
                  className="icon-action"
                  disabled={page >= totalPages || notificationsQuery.isFetching}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  title="Next page"
                  type="button"
                >
                  <ChevronRight aria-hidden="true" size={18} />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatServiceDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}