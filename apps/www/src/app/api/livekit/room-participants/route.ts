import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";

/** Voice thread rooms use `thread-{uuid}`; restrict API to that shape. */
const THREAD_ROOM_NAME_RE =
  /^thread-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function livekitHttpHost(wsOrHttpUrl: string): string | null {
  try {
    const normalized = wsOrHttpUrl
      .replace(/^ws:\/\//i, "http://")
      .replace(/^wss:\/\//i, "https://");
    return new URL(normalized).origin;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "");

  if (!bearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(bearer);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roomName = req.nextUrl.searchParams.get("roomName")?.trim();
  if (!roomName || !THREAD_ROOM_NAME_RE.test(roomName)) {
    return NextResponse.json({ error: "Invalid roomName" }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const publicUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const host = publicUrl ? livekitHttpHost(publicUrl) : null;

  if (!apiKey || !apiSecret || !host) {
    return NextResponse.json(
      { error: "LiveKit not configured on server" },
      { status: 500 },
    );
  }

  try {
    const roomService = new RoomServiceClient(host, apiKey, apiSecret);
    const participants = await roomService.listParticipants(roomName);
    return NextResponse.json({ participantCount: participants.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const code =
      e &&
      typeof e === "object" &&
      "code" in e &&
      typeof (e as { code: unknown }).code === "number"
        ? (e as { code: number }).code
        : undefined;
    // gRPC NOT_FOUND (5): room has never been created or already torn down
    if (
      code === 5 ||
      /not found|does not exist|unknown room|no such room/i.test(msg)
    ) {
      return NextResponse.json({ participantCount: 0 });
    }
    console.error(
      "[livekit/room-participants] listParticipants failed",
      roomName,
      e,
    );
    return NextResponse.json(
      { error: "Failed to load room participants" },
      { status: 502 },
    );
  }
}
