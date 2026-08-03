import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-ecee925a/health", (c) => {
  return c.json({ status: "ok" });
});

// Daily auto-overdue check, called by the pg_cron job set up in Phase 5b
// (MIGRATION_SQL_P5B). Flips stored status on projects/invoices that have
// slipped past their deadline/due date, and — only if RESEND_API_KEY is set —
// emails a summary to every founder. Uses the service-role key (auto-injected
// into every Supabase Edge Function) so it bypasses RLS entirely.
app.post("/make-server-ecee925a/overdue-check", async (c) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueProjects } = await supabase
    .from("projects")
    .select("id, name, deadline")
    .lt("deadline", today)
    .neq("status", "complete")
    .is("archived_at", null);
  const projectIds = (overdueProjects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length > 0) {
    await supabase.from("projects").update({ status: "delayed" }).in("id", projectIds);
  }

  const { data: overdueInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, due_date")
    .lt("due_date", today)
    .eq("status", "sent")
    .is("archived_at", null);
  const invoiceIds = (overdueInvoices ?? []).map((i: { id: string }) => i.id);
  if (invoiceIds.length > 0) {
    await supabase.from("invoices").update({ status: "overdue" }).in("id", invoiceIds);
  }

  let emailSent = false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey && (projectIds.length > 0 || invoiceIds.length > 0)) {
    const { data: founders } = await supabase.from("profiles").select("email").eq("role", "founder");
    const recipients = (founders ?? []).map((f: { email: string | null }) => f.email).filter(Boolean) as string[];
    if (recipients.length > 0) {
      const lines = [
        ...(overdueProjects ?? []).map((p: { name: string; deadline: string }) => `- Project overdue: ${p.name} (deadline ${p.deadline})`),
        ...(overdueInvoices ?? []).map((i: { invoice_number: string; due_date: string }) => `- Invoice overdue: ${i.invoice_number} (due ${i.due_date})`),
      ];
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "BTE Admin <alerts@breaktheeyes.com>",
          to: recipients,
          subject: `${projectIds.length + invoiceIds.length} item(s) just went overdue`,
          text: lines.join("\n"),
        }),
      });
      emailSent = res.ok;
    }
  }

  return c.json({ projectsFlipped: projectIds.length, invoicesFlipped: invoiceIds.length, emailSent });
});

// Founder-only: invite a new team member by email via Supabase Auth's built-in
// invite flow (creates the auth user and emails them a set-password link — no
// separate email provider needed). Pre-seeds their `profiles` row with the role
// the founder picked so they land with the right access on first login instead
// of always defaulting to "member". Runs with the service-role key (bypasses
// RLS) precisely because this is the one action that must NOT be reachable by
// just anyone — the caller's own JWT is verified and their `profiles.role` is
// checked to be "founder" before anything else happens.
app.post("/make-server-ecee925a/invite-user", async (c) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = (c.req.header("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return c.json({ error: "Not signed in." }, 401);

  const { data: callerData, error: callerErr } = await supabase.auth.getUser(token);
  if (callerErr || !callerData.user) return c.json({ error: "Not signed in." }, 401);

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", callerData.user.id).maybeSingle();
  if (callerProfile?.role !== "founder") return c.json({ error: "Only the founder can invite team members." }, 403);

  const { email, role, redirectTo } = await c.req.json();
  if (!email) return c.json({ error: "Email is required." }, 400);

  const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo || undefined,
  });
  if (inviteErr) return c.json({ error: inviteErr.message }, 400);

  if (invited.user) {
    await supabase.from("profiles").upsert({ id: invited.user.id, email, role: role || "member" });
  }

  return c.json({ ok: true, userId: invited.user?.id ?? null });
});

Deno.serve(app.fetch);