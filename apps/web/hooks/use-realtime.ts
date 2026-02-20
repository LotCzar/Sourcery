"use client";

import { useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface UseRealtimeOptions {
  table: string;
  schema?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  onPayload: (payload: RealtimePostgresChangesPayload<any>) => void;
  enabled?: boolean;
}

export function useRealtime({
  table,
  schema = "public",
  event = "*",
  filter,
  onPayload,
  enabled = true,
}: UseRealtimeOptions) {
  const callbackRef = useRef(onPayload);
  callbackRef.current = onPayload;

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channelName = `realtime-${table}-${event}-${filter || "all"}`;

    const channelConfig: any = {
      event,
      schema,
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        channelConfig,
        (payload: RealtimePostgresChangesPayload<any>) => {
          callbackRef.current(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, event, filter, enabled]);
}
