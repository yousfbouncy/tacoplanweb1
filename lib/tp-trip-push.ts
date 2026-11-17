// Notifications for a traffic assignment are best-effort. A push ticket only
// means Expo accepted the request, never that the phone has received it.
export type TripPushStatus = "accepted" | "no_tokens" | "failed";
export type TripNotificationResult = {
  pushStatus: TripPushStatus;
  inboxCreated: boolean;
  pushAccepted: number;
  pushFailed: number;
};

type TripPayload = {
  driverId: string;
  tripId: string;
  cliente: string;
  firstStop: string;
  operation: "assigned" | "transferred";
};

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === "string" && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(value);
}

export function buildTripPushMessages(tokens: string[], trip: TripPayload) {
  const title = trip.operation === "transferred"
    ? "Tacoplan · Viaje transferido a ti"
    : "Tacoplan · Nuevo viaje asignado";
  return Array.from(new Set(tokens.filter(isExpoPushToken))).map((to) => ({
    to,
    title,
    body: `${trip.cliente} · ${trip.firstStop}`,
    sound: "tacoplan_viaje.wav",
    channelId: "traffic-assigned-v1",
    priority: "high" as const,
    data: {
      target: "viaje",
      tripId: trip.tripId,
      source: "traffic",
      eventId: `${trip.operation}:${trip.tripId}`,
    },
  }));
}

export function countAcceptedExpoTickets(tickets: unknown): number {
  return Array.isArray(tickets)
    ? tickets.filter((ticket) => ticket && typeof ticket === "object" && ticket.status === "ok").length
    : 0;
}

export async function notifyTripAssigned(
  db: any,
  trip: TripPayload,
): Promise<TripNotificationResult> {
  const title = trip.operation === "transferred"
    ? "Viaje transferido por Tráfico"
    : "Nuevo viaje asignado por Tráfico";
  const body = `${trip.cliente} · ${trip.firstStop}`;
  const eventId = `${trip.operation}:${trip.tripId}`;

  // This inbox notification also reaches devices without a working push token
  // when the driver next opens the app. Never confuse this with push delivery.
  const inserted = await db.from("user_notifications").insert({
    user_id: trip.driverId,
    type: "admin_message",
    title,
    body,
    button_text: "Ver viaje",
    button_url: "tacoplan://viajes",
    data: { target: "viaje", tripId: trip.tripId, source: "traffic", eventId, presentation: "modal" },
  }).select("id").maybeSingle();
  const inboxCreated = !inserted.error && Boolean(inserted.data?.id);
  if (inserted.error) {
    console.warn("[TRAFFIC] Could not save trip notification in inbox:", inserted.error.message);
  }

  let pushStatus: TripPushStatus = "no_tokens";
  let pushAccepted = 0;
  let pushFailed = 0;
  try {
    const tokensResponse = await db.from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", trip.driverId)
      .eq("notifications_enabled", true);
    if (tokensResponse.error) throw tokensResponse.error;

    const messages = buildTripPushMessages(
      (tokensResponse.data || []).map((row: { expo_push_token: string }) => row.expo_push_token),
      trip,
    );
    if (!messages.length) {
      if (inboxCreated) {
        await db.from("user_notifications").update({ push_status: "no_tokens" })
          .eq("id", inserted.data.id).eq("user_id", trip.driverId);
      }
      return { pushStatus, inboxCreated, pushAccepted, pushFailed };
    }

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error(`Expo push HTTP ${response.status}`);
    const payload = await response.json() as {
      data?: Array<{ status?: string; id?: string; details?: { error?: string } }>;
      errors?: Array<{ message?: string }>;
    };
    pushAccepted = countAcceptedExpoTickets(payload.data);
    pushFailed = messages.length - pushAccepted;
    pushStatus = pushAccepted > 0 ? "accepted" : "failed";
    if (pushFailed) {
      const reason = (payload.data || []).find((ticket) => ticket.status === "error")?.details?.error
        || payload.errors?.[0]?.message || "Expo did not accept every ticket";
      console.warn("[TRAFFIC] Push acceptance failed:", String(reason).slice(0, 160));
    }
  } catch (error) {
    pushStatus = "failed";
    pushFailed = Math.max(pushFailed, 1);
    console.warn("[TRAFFIC] Trip push request failed:",
      error instanceof Error ? error.message : "Unknown failure");
  }

  // Keep delivery status for support without recording device tokens in logs.
  if (inboxCreated) {
    await db.from("user_notifications").update({ push_status: pushStatus })
      .eq("id", inserted.data.id).eq("user_id", trip.driverId);
  }
  return { pushStatus, inboxCreated, pushAccepted, pushFailed };
}
