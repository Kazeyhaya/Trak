"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationItem,
  NotificationType
} from "../lib/api";
import { tempoRelativo } from "../lib/atividades";

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "FOLLOW":
      return (
        <span className="notif-icon-badge notif-icon--follow" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </span>
      );
    case "COMMENT":
    case "REPLY":
      return (
        <span className="notif-icon-badge notif-icon--comment" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
      );
    case "MEDIA_UPDATE":
    default:
      return (
        <span className="notif-icon-badge notif-icon--media" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
      );
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications(30);
      setItems(res);
      const unread = res.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch {
      // Ignora falhas de rede
    } finally {
      setLoading(false);
    }
  }, []);

  function handleToggle() {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        void fetchItems();
      }
      return next;
    });
  }

  // Polling leve para contagem de não lidas
  useEffect(() => {
    let active = true;

    function refreshCount() {
      getUnreadNotificationsCount()
        .then((res) => {
          if (active) setUnreadCount(res.count);
        })
        .catch(() => {});
    }

    refreshCount();
    const interval = setInterval(refreshCount, 60_000);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Fecha dropdown ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch {
      // Ignora
    }
  }

  async function handleClickItem(item: NotificationItem) {
    if (!item.read) {
      // Marca como lida otimisticamente
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationRead(item.id).catch(() => {});
    }
    setOpen(false);
    router.push(item.link);
  }

  return (
    <div className="header-notif-container" ref={containerRef}>
      <button
        type="button"
        className={`header-notif-btn${open ? " is-active" : ""}`}
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Notificações: ${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
            : "Notificações"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="header-notif-badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="notif-backdrop"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="notif-dropdown" role="dialog" aria-label="Painel de Notificações">
            <div className="notif-dropdown-header">
              <h3>Notificações</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-mark-all-btn"
                  onClick={handleMarkAll}
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="notif-dropdown-body">
              {loading && items.length === 0 ? (
                <div className="notif-loading">
                  <span>Carregando notificações...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="notif-empty">
                  <p>Tudo em dia!</p>
                  <small>Nenhuma notificação por enquanto.</small>
                </div>
              ) : (
                <ul className="notif-list">
                  {items.map((item) => {
                    const avatarInitial = (
                      item.actor?.displayName ||
                      item.actor?.username ||
                      "?"
                    )
                      .charAt(0)
                      .toUpperCase();

                    return (
                      <li key={item.id} className={`notif-item${!item.read ? " is-unread" : ""}`}>
                        <button
                          type="button"
                          className="notif-item-btn"
                          onClick={() => void handleClickItem(item)}
                        >
                          <div className="notif-item-avatar">
                            {item.actor?.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.actor.avatarUrl} alt="" />
                            ) : item.actor ? (
                              <span className="notif-avatar-initial">{avatarInitial}</span>
                            ) : null}
                            {getNotificationIcon(item.type)}
                          </div>

                          <div className="notif-item-content">
                            <p className="notif-item-title">{item.title}</p>
                            {item.body && <p className="notif-item-body">{item.body}</p>}
                            <span className="notif-item-time">{tempoRelativo(item.createdAt)}</span>
                          </div>

                          {!item.read && <span className="notif-unread-dot" aria-label="Não lida" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
