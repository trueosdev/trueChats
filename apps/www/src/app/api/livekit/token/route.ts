import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { roomName, participantName, avatarUrl } = body as {
    roomName?: string;
    participantName?: string;
    avatarUrl?: string | null;
  };

  if (!roomName || !participantName) {
    return NextResponse.json(
      { error: "roomName and participantName are required" },
      { status: 400 },
    );
  }

  const avatarForMeta =
    typeof avatarUrl === "string" && avatarUrl.trim() !== "" ? avatarUrl.trim() : null;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LiveKit not configured on server" },
      { status: 500 },
    );
  }

  const accessToken = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: participantName,
    metadata: JSON.stringify({ avatarUrl: avatarForMeta }),
  });

  accessToken.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const jwt = await accessToken.toJwt();

  return NextResponse.json({ token: jwt });
}
