import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const KLIPY_ORIGIN = "https://api.klipy.com";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnon);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appKey = process.env.KLIPY_APP_KEY;
  if (!appKey) {
    return NextResponse.json(
      { error: "Klipy is not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = searchParams.get("page") || "1";

  const params = new URLSearchParams({
    customer_id: user.id,
    per_page: "20",
    page,
    format_filter: "gif,webp",
  });

  const path = q
    ? `api/v1/${encodeURIComponent(appKey)}/gifs/search`
    : `api/v1/${encodeURIComponent(appKey)}/gifs/trending`;

  if (q) {
    params.set("q", q);
  }

  const klipyUrl = `${KLIPY_ORIGIN}/${path}?${params}`;

  let klipyRes: Response;
  try {
    klipyRes = await fetch(klipyUrl);
  } catch {
    return NextResponse.json(
      { error: "Klipy request failed" },
      { status: 502 },
    );
  }

  if (!klipyRes.ok) {
    return NextResponse.json(
      { error: "Klipy API error" },
      { status: klipyRes.status >= 400 ? klipyRes.status : 502 },
    );
  }

  const body = (await klipyRes.json()) as {
    result?: boolean;
    data?: { data?: unknown[] };
    message?: string;
  };

  if (body.result === false) {
    return NextResponse.json(
      { error: body.message || "Klipy request was not successful", results: [] },
      { status: 502 },
    );
  }

  const results = body.data?.data ?? [];
  return NextResponse.json({ results });
}
