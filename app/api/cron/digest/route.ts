import { NextResponse } from "next/server";

import { resend } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OpenPin {
  id: string;
  title: string;
  created_at: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://loststolenfound.vercel.app";
const FROM_ADDRESS =
  process.env.RESEND_FROM ?? "LostStolenFound <onboarding@resend.dev>";
const SUBJECT = "Weekly Neighborhood Watch: Recent alerts in Malvern East";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(pins: OpenPin[]): string {
  const items = pins
    .slice(0, 5)
    .map(
      (p) =>
        `<li style="margin:0 0 8px 0;font-size:15px;line-height:1.5;color:#1f2937;">${escapeHtml(p.title)}</li>`,
    )
    .join("");
  const moreLine =
    pins.length > 5
      ? `<p style="margin:8px 0 0 0;font-size:14px;color:#6b7280;">…and ${pins.length - 5} more on the live map.</p>`
      : "";

  return `<!doctype html>
<html lang="en-AU"><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
        <tr><td style="padding:28px 32px 12px 32px;">
          <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#dc2626;">Weekly Digest</p>
          <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0f172a;">Recent alerts in Malvern East</h1>
        </td></tr>
        <tr><td style="padding:8px 32px 0 32px;">
          <p style="margin:0;font-size:16px;line-height:1.55;color:#334155;">
            <strong>${pins.length}</strong> open ${pins.length === 1 ? "incident was" : "incidents were"} reported in your neighbourhood this week.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 0 32px;">
          <ul style="margin:0;padding-left:20px;">${items}</ul>
          ${moreLine}
        </td></tr>
        <tr><td style="padding:24px 32px 32px 32px;" align="left">
          <a href="${SITE_URL}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:9999px;">View the Live Map</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:20px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
            You're receiving this because you have an account on LostStolenFound. Stay safe out there.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabaseAdmin = getSupabaseAdmin();

  const pinsRes = await supabaseAdmin
    .from("MapPin")
    .select("id,title,created_at")
    .eq("status", "open")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false });

  if (pinsRes.error) {
    console.error("[digest:fetchPins]", pinsRes.error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 },
    );
  }

  const pins = (pinsRes.data ?? []) as OpenPin[];
  if (pins.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: "no-incidents" });
  }

  const recipients: string[] = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      console.error("[digest:listUsers]", error);
      return NextResponse.json(
        { error: "Failed to list users" },
        { status: 500 },
      );
    }
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email) recipients.push(u.email);
    }
    if (users.length < perPage) break;
    page += 1;
  }

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: "no-recipients" });
  }

  const html = buildHtml(pins);
  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    try {
      const result = await resend.emails.send({
        from: FROM_ADDRESS,
        to,
        subject: SUBJECT,
        html,
      });
      if (result.error) {
        failed += 1;
        console.error("[digest:send]", to, result.error);
      } else {
        sent += 1;
      }
    } catch (err) {
      failed += 1;
      console.error("[digest:send:exception]", to, err);
    }
  }

  return NextResponse.json({
    ok: true,
    incidents: pins.length,
    recipients: recipients.length,
    sent,
    failed,
  });
}
