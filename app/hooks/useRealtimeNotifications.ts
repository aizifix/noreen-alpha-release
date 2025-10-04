"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/utils/apiClient";
import { API_URL } from "../config/api";

type NotificationItem = {
  notification_id: number;
  notification_type?: string;
  notification_title?: string;
  notification_message: string;
  notification_priority?: string;
  notification_icon?: string | null;
  notification_url?: string | null;
  event_id?: number | null;
  booking_id?: number | null;
  notification_status?: string;
  read_at?: string | null;
  created_at: string;
};

type UseRealtimeNotificationsOptions = {
  userId?: number | string | null;
  initialSinceISO?: string | null;
  pollIntervalMs?: number;
  onNew?: (items: NotificationItem[]) => void;
  onCounts?: (counts: { unread: number }) => void;
};

export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions
) {
  const {
    userId,
    initialSinceISO,
    pollIntervalMs = 8000,
    onNew,
    onCounts,
  } = options;

  const [sinceISO, setSinceISO] = useState<string | null>(
    initialSinceISO || new Date().toISOString()
  );
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const lastSeenAtRef = useRef<string | null>(sinceISO);

  useEffect(() => {
    if (!userId) return;

    // clear previous
    if (intervalRef.current) {
      clearInterval(intervalRef.current as unknown as number);
      intervalRef.current = null;
    }

    const tick = async () => {
      try {
        const sinceParam = lastSeenAtRef.current
          ? `&since=${encodeURIComponent(lastSeenAtRef.current)}`
          : "";
        const url = `${API_URL}/notifications.php?operation=get_recent&user_id=${encodeURIComponent(String(userId))}${sinceParam}`;
        const res = await axios.get(url);
        if (res.data && res.data.status === "success") {
          const list: NotificationItem[] = Array.isArray(res.data.notifications)
            ? res.data.notifications
            : [];
          if (list.length > 0) {
            // Advance clock to latest created_at
            const latest = list
              .map((n) => (n.created_at ? new Date(n.created_at).getTime() : 0))
              .reduce((a, b) => Math.max(a, b), 0);
            if (latest > 0) {
              const nextISO = new Date(latest + 1).toISOString();
              lastSeenAtRef.current = nextISO;
              setSinceISO(nextISO);
            }
            onNew && onNew(list);
          }
        }
      } catch {}

      // Also refresh counts opportunistically
      try {
        const countsUrl = `${API_URL}/notifications.php?operation=get_counts&user_id=${encodeURIComponent(
          String(userId)
        )}`;
        const res = await axios.get(countsUrl);
        if (res.data && res.data.status === "success") {
          const unread = Number(res.data.counts?.unread || 0);
          onCounts && onCounts({ unread });
        }
      } catch {}
    };

    // Kick once immediately to reduce perceived latency
    tick();
    intervalRef.current = setInterval(
      tick,
      pollIntervalMs
    ) as unknown as NodeJS.Timer;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as number);
        intervalRef.current = null;
      }
    };
  }, [userId, pollIntervalMs, onNew, onCounts]);

  return { sinceISO };
}
