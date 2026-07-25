import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, TrendingUp, FolderOpen, Calendar, DollarSign,
  UserSquare2, Truck, BookOpen, Target, Settings, Plus, X,
  ChevronRight, Search, Menu, AlertTriangle, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownRight, Building2, BarChart3, Receipt,
  Mail, RefreshCw, LogOut, CheckCheck, Database, Loader2, Eye, EyeOff, Wallet,
  MapPin, Users, Trash2, CalendarClock, PartyPopper, Download,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase/client";

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatNaira = (n: number) => {
  if (!n) return "₦0";
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  return `₦${n.toLocaleString("en-NG")}`;
};

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
};

const daysUntil = (d: string | null) => {
  if (!d) return 999;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

// Founder's records must never be locked inside the app — every list view gets a
// plain client-side CSV export, no server round-trip or extra dependency needed.
const exportCSV = (rows: any[], filename: string) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

type Pillar = "experiences" | "production" | "communications" | "brand_marketing" | "people_culture";

const PILLARS: Record<Pillar, string> = {
  experiences: "Experiences",
  production: "Production",
  communications: "Communications",
  brand_marketing: "Brand & Marketing",
  people_culture: "People & Culture",
};

const PILLAR_COLORS: Record<Pillar, string> = {
  experiences: "#FF4D00",
  production: "#A855F7",
  communications: "#3B82F6",
  brand_marketing: "#F59E0B",
  people_culture: "#10B981",
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  active:        { label: "Active",        cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  signed:        { label: "Signed",        cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  paid:          { label: "Paid",          cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  complete:      { label: "Complete",      cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  won:           { label: "Won",           cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  done:          { label: "Done",          cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  in_progress:   { label: "In Progress",   cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",      dot: "bg-amber-400" },
  pending:       { label: "Pending",       cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",      dot: "bg-amber-400" },
  sent:          { label: "Sent",          cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",      dot: "bg-amber-400" },
  at_risk:       { label: "At Risk",       cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",      dot: "bg-amber-400" },
  proposal_sent: { label: "Proposal Sent", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",      dot: "bg-amber-400" },
  negotiation:   { label: "Negotiation",   cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",      dot: "bg-amber-400" },
  contacted:     { label: "Contacted",     cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",      dot: "bg-amber-400" },
  blocked:       { label: "Blocked",       cls: "text-red-400 bg-red-400/10 border-red-400/20",            dot: "bg-red-400" },
  overdue:       { label: "Overdue",       cls: "text-red-400 bg-red-400/10 border-red-400/20",            dot: "bg-red-400" },
  delayed:       { label: "Delayed",       cls: "text-red-400 bg-red-400/10 border-red-400/20",            dot: "bg-red-400" },
  lost:          { label: "Lost",          cls: "text-red-400 bg-red-400/10 border-red-400/20",            dot: "bg-red-400" },
  draft:         { label: "Draft",         cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",         dot: "bg-zinc-400" },
  inactive:      { label: "Inactive",      cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",         dot: "bg-zinc-400" },
  planning:      { label: "Planning",      cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",         dot: "bg-zinc-400" },
  confirmed:     { label: "Confirmed",     cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  completed:     { label: "Completed",     cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  cancelled:     { label: "Cancelled",     cls: "text-red-400 bg-red-400/10 border-red-400/20",            dot: "bg-red-400" },
  not_started:   { label: "Not Started",   cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",         dot: "bg-zinc-400" },
  new:           { label: "New",           cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",         dot: "bg-zinc-400" },
  prospect:      { label: "Prospect",      cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",         dot: "bg-zinc-400" },
  low:           { label: "Low",           cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",         dot: "bg-zinc-400" },
  medium:        { label: "Medium",        cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",      dot: "bg-amber-400" },
  high:          { label: "High",          cls: "text-red-400 bg-red-400/10 border-red-400/20",            dot: "bg-red-400" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const c = STATUS_CFG[status] ?? { label: status, cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20", dot: "bg-zinc-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium border ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
};

const PillarBadge = ({ pillar }: { pillar: Pillar }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border"
    style={{ color: PILLAR_COLORS[pillar], background: `${PILLAR_COLORS[pillar]}18`, borderColor: `${PILLAR_COLORS[pillar]}30` }}>
    {PILLARS[pillar]}
  </span>
);

// ─── Shared UI ────────────────────────────────────────────────────────────────

const Spinner = () => <Loader2 size={16} className="animate-spin text-[#7070A0]" />;

const EmptyState = ({ icon: Icon, title, desc, action }: { icon: React.ElementType; title: string; desc: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
      <Icon size={24} className="text-[#7070A0]" />
    </div>
    <h3 className="text-base font-semibold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{title}</h3>
    <p className="text-sm text-[#7070A0] max-w-xs mb-5">{desc}</p>
    {action}
  </div>
);

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
    <div className="relative w-full sm:max-w-lg bg-[#13132A] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
        <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-[#7070A0] hover:text-white transition-colors"><X size={16} /></button>
      </div>
      <div className="overflow-y-auto flex-1 p-6">{children}</div>
    </div>
  </div>
);

const inputCls = "w-full px-3 py-2.5 rounded-lg bg-[#1A1A2E] border border-white/8 text-white text-sm placeholder-[#7070A0] focus:outline-none focus:border-[#FF4D00]/50 transition-colors";
const selectCls = `${inputCls} appearance-none cursor-pointer`;
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-mono text-[#7070A0] uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

// ─── Login / Sign-up Screen ───────────────────────────────────────────────────

const LoginScreen = () => {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signedUp, setSignedUp] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "reset") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      setLoading(false);
      if (err) setError(err.message);
      else setResetSent(true);
      return;
    }

    if (mode === "signup") {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (err) { setError(err.message); return; }
      if (!data.session) setSignedUp(true);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) setError("Wrong email or password.");
    }
  };

  const logo = (
    <div className="flex items-center gap-3 mb-10">
      <div className="w-10 h-10 rounded-xl bg-[#FF4D00] flex items-center justify-center text-white font-bold text-lg" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>B</div>
      <div>
        <div className="text-base font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Break The Eyes</div>
        <div className="text-xs text-[#7070A0]">Admin Portal</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#08080F] flex items-center justify-center p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-sm">
        {logo}

        {signedUp ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto mb-4">
              <CheckCheck size={24} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Account created</h2>
            <p className="text-sm text-[#7070A0] mb-6">Check your email to confirm, then sign in.</p>
            <button onClick={() => { setSignedUp(false); setMode("signin"); setPassword(""); }}
              className="w-full py-3 rounded-xl bg-[#FF4D00] text-white font-medium text-sm hover:bg-[#E04400] transition-colors">
              Go to sign in →
            </button>
          </div>
        ) : resetSent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-blue-400/10 border border-blue-400/20 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Reset email sent</h2>
            <p className="text-sm text-[#7070A0] mb-6">Check your inbox for a password reset link.</p>
            <button onClick={() => { setResetSent(false); setMode("signin"); setEmail(""); setError(""); }}
              className="w-full py-3 rounded-xl bg-[#FF4D00] text-white font-medium text-sm hover:bg-[#E04400] transition-colors">
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
            </h1>
            <p className="text-sm text-[#7070A0] mb-8">
              {mode === "signin"
                ? "Welcome back to the BTE Admin Portal."
                : mode === "signup"
                ? "Founder account setup. Team joins by invitation later."
                : "Enter your email and we'll send a reset link."}
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-[#7070A0] uppercase tracking-wider block mb-1.5">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="emediong@breaktheeyes.com" className={inputCls} />
              </div>
              {mode !== "reset" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono text-[#7070A0] uppercase tracking-wider">Password</label>
                    {mode === "signin" && (
                      <button type="button" onClick={() => { setMode("reset"); setError(""); }}
                        className="text-xs text-[#7070A0] hover:text-[#FF4D00] transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} required minLength={8}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                      className={`${inputCls} pr-10`} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7070A0] hover:text-white transition-colors">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#FF4D00] text-white font-medium text-sm hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {loading && <Spinner />}
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#7070A0]">
              {mode === "signin" ? (
                <>No account? <button onClick={() => { setMode("signup"); setError(""); }} className="text-white hover:text-[#FF4D00] transition-colors font-medium">Create one</button></>
              ) : (
                <>Back to <button onClick={() => { setMode("signin"); setError(""); }} className="text-white hover:text-[#FF4D00] transition-colors font-medium">sign in</button></>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Setup Screen ─────────────────────────────────────────────────────────────

const MIGRATION_SQL = `-- BTE Admin Portal — Phase 1 Migration
-- Paste into: Supabase Dashboard → SQL Editor → Run

DO $$ BEGIN CREATE TYPE pillar AS ENUM ('experiences','production','communications','brand_marketing','people_culture'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_type_enum AS ENUM ('institutional','corporate','individual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_status_enum AS ENUM ('prospect','active','inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE lead_stage_enum AS ENUM ('new','contacted','proposal_sent','negotiation','won','lost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proposal_status_enum AS ENUM ('draft','sent','accepted','declined','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE contract_type_enum AS ENUM ('contract','sow','retainer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE contract_status_enum AS ENUM ('draft','sent','signed','expired','terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_status_enum AS ENUM ('not_started','in_progress','at_risk','delayed','complete'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status_enum AS ENUM ('not_started','in_progress','blocked','done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority_enum AS ENUM ('low','medium','high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE staff_contract_type_enum AS ENUM ('core_staff','contractor','freelancer','ace_collective'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $fn$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$;

CREATE TABLE IF NOT EXISTS staff (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, role_title text, team text, pillar pillar, contract_type staff_contract_type_enum NOT NULL DEFAULT 'core_staff', start_date date, nda_signed boolean NOT NULL DEFAULT false, capacity_pct int CHECK (capacity_pct BETWEEN 0 AND 200), active boolean NOT NULL DEFAULT true, notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS staff_updated_at ON staff; CREATE TRIGGER staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, client_type client_type_enum NOT NULL DEFAULT 'corporate', pillar pillar NOT NULL, point_of_contact text, contact_email text, contact_phone text, billing_details jsonb, status client_status_enum NOT NULL DEFAULT 'prospect', notes text, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS clients_updated_at ON clients; CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS leads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, organisation text, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, pillar pillar NOT NULL, source text, stage lead_stage_enum NOT NULL DEFAULT 'new', estimated_value numeric(14,2), next_action text, next_action_date date, owner_id uuid REFERENCES staff(id) ON DELETE SET NULL, lost_reason text, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS leads_updated_at ON leads; CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS proposals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, lead_id uuid REFERENCES leads(id) ON DELETE SET NULL, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, pillar pillar NOT NULL, body text, value numeric(14,2), version int NOT NULL DEFAULT 1, status proposal_status_enum NOT NULL DEFAULT 'draft', sent_date date, decision_date date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS proposals_updated_at ON proposals; CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS contracts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT, title text NOT NULL, pillar pillar NOT NULL, contract_type contract_type_enum NOT NULL DEFAULT 'contract', body text, value numeric(14,2), start_date date, end_date date, status contract_status_enum NOT NULL DEFAULT 'draft', file_url text, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS contracts_updated_at ON contracts; CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL, pillar pillar NOT NULL, project_lead_id uuid REFERENCES staff(id) ON DELETE SET NULL, start_date date, deadline date, status project_status_enum NOT NULL DEFAULT 'not_started', budget numeric(14,2), is_event boolean NOT NULL DEFAULT false, deliverables jsonb, notes text, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS projects_updated_at ON projects; CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title text NOT NULL, assignee_id uuid REFERENCES staff(id) ON DELETE SET NULL, due_date date, status task_status_enum NOT NULL DEFAULT 'not_started', priority task_priority_enum NOT NULL DEFAULT 'medium', notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks; CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE staff ENABLE ROW LEVEL SECURITY; ALTER TABLE clients ENABLE ROW LEVEL SECURITY; ALTER TABLE leads ENABLE ROW LEVEL SECURITY; ALTER TABLE proposals ENABLE ROW LEVEL SECURITY; ALTER TABLE contracts ENABLE ROW LEVEL SECURITY; ALTER TABLE projects ENABLE ROW LEVEL SECURITY; ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "auth_all_staff" ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_leads" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_proposals" ON proposals FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_contracts" ON contracts FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_tasks" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO staff (name, role_title, team, pillar, contract_type, nda_signed, capacity_pct, active) VALUES
('Emediong Umoh','Founder & CEO','Admin',NULL,'core_staff',true,100,true),
('Tolu Fashola','Creative Director','Creative Team','brand_marketing','core_staff',true,85,true),
('Aisha Danjuma','Events Lead','Blueprint by BTE','experiences','core_staff',true,90,true),
('Chidi Okwu','Production Manager','Framehauz','production','core_staff',true,70,true),
('Zara Okonkwo','Communications Strategist','Creative Team','communications','contractor',true,60,true),
('Kemi Adeyemi','Brand Designer','Creative Team Cyprus','brand_marketing','contractor',true,45,true),
('Yemi Balogun','Event Coordinator','Blueprint by BTE','experiences','ace_collective',true,80,true),
('Dami Olatunji','Digital Marketing Specialist','Creative Team','communications','contractor',true,55,true),
('Seun Adebayo','Videographer','Framehauz','production','freelancer',false,40,true),
('Amaka Eze','Project Coordinator','Admin',NULL,'core_staff',true,75,true),
('Bode Adeleke','AV Technician','Blueprint by BTE','experiences','ace_collective',true,65,true),
('Nkechi Obi','Graphic Designer','Creative Team','brand_marketing','freelancer',false,35,true),
('Femi Adeyinka','Sound Engineer','Framehauz','production','ace_collective',true,50,true),
('Chioma Nwachukwu','Content Strategist','Creative Team Cyprus','communications','contractor',true,60,true),
('Rotimi Okafor','Event Logistics Manager','Blueprint by BTE','experiences','core_staff',true,80,true),
('Sade Alabi','Finance & Admin Officer','Admin',NULL,'core_staff',true,70,true),
('Kunle Martins','Brand Strategist','Creative Team','brand_marketing','contractor',true,55,true)
ON CONFLICT DO NOTHING;`;

const SetNewPasswordScreen = ({ onDone }: { onDone: () => void }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const inputCls = "w-full px-4 py-3 rounded-xl bg-[#1A1A2E] border border-white/8 text-white text-sm placeholder-[#4040608] focus:outline-none focus:border-[#FF4D00]/60 transition-colors";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(onDone, 2000);
  };

  return (
    <div className="min-h-screen bg-[#08080F] flex items-center justify-center px-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl bg-[#FF4D00] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">BTE</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Break The Eyes</span>
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto mb-4">
              <CheckCheck size={24} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Password updated</h2>
            <p className="text-sm text-[#7070A0]">Signing you in…</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Set new password</h1>
            <p className="text-sm text-[#7070A0] mb-8">Choose a new password for your account.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-[#7070A0] uppercase tracking-wider block mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} required minLength={8}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7070A0] hover:text-white transition-colors">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-mono text-[#7070A0] uppercase tracking-wider block mb-1.5">Confirm Password</label>
                <input type={showPw ? "text" : "password"} required
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password" className={inputCls} />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#FF4D00] text-white font-medium text-sm hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {loading && <Spinner />}
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const SetupScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const copy = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verify = async () => {
    setChecking(true);
    setError("");
    const { error: err } = await supabase.from("staff").select("id", { count: "exact", head: true });
    setChecking(false);
    if (err) setError(err.code === "42P01" ? "Tables not found yet — run the SQL first, then try again." : err.message);
    else onComplete();
  };

  return (
    <div className="min-h-screen bg-[#08080F] flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#FF4D00] flex items-center justify-center text-white font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>B</div>
          <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>BTE Admin — First-time Setup</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Run the Phase 1 migration</h1>
        <p className="text-sm text-[#7070A0] mb-6">
          Copy the SQL and run it in your{" "}
          <a href="https://supabase.com/dashboard/project/zsgmzknzzlorneacmnzb/sql/new" target="_blank" rel="noreferrer" className="text-white underline underline-offset-2 hover:text-[#FF4D00] transition-colors">
            Supabase SQL Editor ↗
          </a>
          {". "}It creates 7 tables, enables RLS, and seeds all 17 staff members.
        </p>

        <div className="bg-[#0C0C1A] border border-white/8 rounded-2xl overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
            <span className="text-xs font-mono text-[#7070A0]">phase1_migration.sql</span>
            <button onClick={copy}
              className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg transition-colors ${copied ? "bg-emerald-400/10 text-emerald-400" : "bg-white/6 text-[#B0ADCC] hover:text-white hover:bg-white/10"}`}>
              {copied ? <><CheckCheck size={12} /> Copied!</> : <><Database size={12} /> Copy SQL</>}
            </button>
          </div>
          <pre className="text-xs font-mono text-[#7070A0] p-4 overflow-auto max-h-56 leading-relaxed whitespace-pre-wrap">{MIGRATION_SQL}</pre>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-400/5 border border-amber-400/15 mb-6">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">Open <strong>Supabase → SQL Editor</strong>, paste and run the SQL, then click Verify below.</p>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <div className="flex gap-3">
          <a href="https://supabase.com/dashboard/project/zsgmzknzzlorneacmnzb/sql/new" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-colors">
            Open SQL Editor ↗
          </a>
          <button onClick={verify} disabled={checking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors">
            {checking ? <><Spinner /> Checking…</> : <><CheckCheck size={15} /> Verify & Enter</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── CRUD Forms ───────────────────────────────────────────────────────────────

const NewClientModal = ({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState({ name: "", client_type: "corporate", pillar: "experiences", point_of_contact: "", contact_email: "", contact_phone: "", status: "prospect" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("clients").insert({ name: f.name, client_type: f.client_type as any, pillar: f.pillar as any, point_of_contact: f.point_of_contact || null, contact_email: f.contact_email || null, contact_phone: f.contact_phone || null, status: f.status as any });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="New Client" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Client Name *"><input required className={inputCls} placeholder="Sheedx Africa" value={f.name} onChange={e => set("name", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><select className={selectCls} value={f.client_type} onChange={e => set("client_type", e.target.value)}><option value="corporate">Corporate</option><option value="institutional">Institutional</option><option value="individual">Individual</option></select></Field>
          <Field label="Status"><select className={selectCls} value={f.status} onChange={e => set("status", e.target.value)}><option value="prospect">Prospect</option><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
        </div>
        <Field label="Pillar"><select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Point of Contact"><input className={inputCls} placeholder="Full name" value={f.point_of_contact} onChange={e => set("point_of_contact", e.target.value)} /></Field>
        <Field label="Email"><input type="email" className={inputCls} placeholder="contact@client.com" value={f.contact_email} onChange={e => set("contact_email", e.target.value)} /></Field>
        <Field label="Phone"><input className={inputCls} placeholder="+234 800 000 0000" value={f.contact_phone} onChange={e => set("contact_phone", e.target.value)} /></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Plus size={15} />}{saving ? "Saving…" : "Create Client"}
        </button>
      </form>
    </Modal>
  );
};

const NewLeadModal = ({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState({ name: "", organisation: "", pillar: "experiences", stage: "new", estimated_value: "", next_action: "", next_action_date: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("leads").insert({ name: f.name, organisation: f.organisation || null, pillar: f.pillar as any, stage: f.stage as any, estimated_value: f.estimated_value ? parseFloat(f.estimated_value) : null, next_action: f.next_action || null, next_action_date: f.next_action_date || null });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="Add Lead" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Contact Name *"><input required className={inputCls} placeholder="Fatima Al-Hassan" value={f.name} onChange={e => set("name", e.target.value)} /></Field>
        <Field label="Organisation"><input className={inputCls} placeholder="Abuja Investment Corp" value={f.organisation} onChange={e => set("organisation", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pillar"><select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Stage"><select className={selectCls} value={f.stage} onChange={e => set("stage", e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="proposal_sent">Proposal Sent</option><option value="negotiation">Negotiation</option><option value="won">Won</option><option value="lost">Lost</option></select></Field>
        </div>
        <Field label="Estimated Value (₦)"><input type="number" className={inputCls} placeholder="15000000" value={f.estimated_value} onChange={e => set("estimated_value", e.target.value)} /></Field>
        <Field label="Next Action"><input className={inputCls} placeholder="Send revised proposal" value={f.next_action} onChange={e => set("next_action", e.target.value)} /></Field>
        <Field label="Next Action Date"><input type="date" className={inputCls} value={f.next_action_date} onChange={e => set("next_action_date", e.target.value)} /></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Plus size={15} />}{saving ? "Saving…" : "Add Lead"}
        </button>
      </form>
    </Modal>
  );
};

const NewProjectModal = ({ onClose, onSaved, clients, staff }: { onClose: () => void; onSaved: () => void; clients: any[]; staff: any[] }) => {
  const [f, setF] = useState({ name: "", client_id: "", pillar: "experiences", project_lead_id: "", deadline: "", budget: "", status: "not_started", is_event: "false" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("projects").insert({ name: f.name, client_id: f.client_id || null, pillar: f.pillar as any, project_lead_id: f.project_lead_id || null, deadline: f.deadline || null, budget: f.budget ? parseFloat(f.budget) : null, status: f.status as any, is_event: f.is_event === "true" });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="New Project" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Project Name *"><input required className={inputCls} placeholder="Sheedx Africa Summit 2026" value={f.name} onChange={e => set("name", e.target.value)} /></Field>
        <Field label="Client"><select className={selectCls} value={f.client_id} onChange={e => set("client_id", e.target.value)}><option value="">Internal / No client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pillar"><select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Status"><select className={selectCls} value={f.status} onChange={e => set("status", e.target.value)}><option value="not_started">Not Started</option><option value="in_progress">In Progress</option><option value="at_risk">At Risk</option><option value="delayed">Delayed</option><option value="complete">Complete</option></select></Field>
        </div>
        <Field label="Project Lead"><select className={selectCls} value={f.project_lead_id} onChange={e => set("project_lead_id", e.target.value)}><option value="">Unassigned</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deadline"><input type="date" className={inputCls} value={f.deadline} onChange={e => set("deadline", e.target.value)} /></Field>
          <Field label="Budget (₦)"><input type="number" className={inputCls} placeholder="12000000" value={f.budget} onChange={e => set("budget", e.target.value)} /></Field>
        </div>
        <Field label="Is this an Event?"><select className={selectCls} value={f.is_event} onChange={e => set("is_event", e.target.value)}><option value="false">No</option><option value="true">Yes</option></select></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Plus size={15} />}{saving ? "Saving…" : "Create Project"}
        </button>
      </form>
    </Modal>
  );
};

const NewTaskModal = ({ onClose, onSaved, projects, staff }: { onClose: () => void; onSaved: () => void; projects: any[]; staff: any[] }) => {
  const [f, setF] = useState({ title: "", project_id: projects[0]?.id ?? "", assignee_id: "", due_date: "", priority: "medium", status: "not_started" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.project_id) { setErr("Select a project."); return; }
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({ title: f.title, project_id: f.project_id, assignee_id: f.assignee_id || null, due_date: f.due_date || null, priority: f.priority as any, status: f.status as any });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="Add Task" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Task Title *"><input required className={inputCls} placeholder="Book venue for summit" value={f.title} onChange={e => set("title", e.target.value)} /></Field>
        <Field label="Project *"><select required className={selectCls} value={f.project_id} onChange={e => set("project_id", e.target.value)}><option value="">Select project…</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Assignee"><select className={selectCls} value={f.assignee_id} onChange={e => set("assignee_id", e.target.value)}><option value="">Unassigned</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority"><select className={selectCls} value={f.priority} onChange={e => set("priority", e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
          <Field label="Due Date"><input type="date" className={inputCls} value={f.due_date} onChange={e => set("due_date", e.target.value)} /></Field>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Plus size={15} />}{saving ? "Saving…" : "Add Task"}
        </button>
      </form>
    </Modal>
  );
};

// ─── Phase 2 Migration SQL ────────────────────────────────────────────────────

const MIGRATION_SQL_P2 = `-- BTE Admin Portal — Phase 2 Migration
-- Run AFTER Phase 1. Paste into: Supabase Dashboard → SQL Editor → Run

DO $$ BEGIN CREATE TYPE revenue_type_enum AS ENUM ('project_fee','retainer','consultancy','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rev_payment_status_enum AS ENUM ('invoiced','received','overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cost_category_enum AS ENUM ('project_cost','overhead','vendor','software','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invoice_status_enum AS ENUM ('draft','sent','paid','overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quot_status_enum AS ENUM ('draft','sent','accepted','declined'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE target_metric_enum AS ENUM ('revenue','profit','projects_delivered'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN 'BTE-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('invoice_seq')::text, 4, '0'); END; $$;

CREATE TABLE IF NOT EXISTS invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number text NOT NULL UNIQUE DEFAULT generate_invoice_number(), client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT, project_id uuid REFERENCES projects(id) ON DELETE SET NULL, issued_date date NOT NULL DEFAULT CURRENT_DATE, due_date date NOT NULL, status invoice_status_enum NOT NULL DEFAULT 'draft', subtotal numeric(14,2) NOT NULL DEFAULT 0, total numeric(14,2) NOT NULL DEFAULT 0, notes text, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices; CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS invoice_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, description text NOT NULL, qty numeric(10,2) NOT NULL DEFAULT 1, unit_price numeric(14,2) NOT NULL DEFAULT 0, line_total numeric(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED, sort_order int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS revenue_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), description text NOT NULL, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, project_id uuid REFERENCES projects(id) ON DELETE SET NULL, pillar pillar NOT NULL, revenue_type revenue_type_enum NOT NULL DEFAULT 'project_fee', entry_month date NOT NULL, amount numeric(14,2) NOT NULL, payment_status rev_payment_status_enum NOT NULL DEFAULT 'invoiced', invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL, received_date date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS revenue_entries_updated_at ON revenue_entries; CREATE TRIGGER revenue_entries_updated_at BEFORE UPDATE ON revenue_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS cost_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), description text NOT NULL, project_id uuid REFERENCES projects(id) ON DELETE SET NULL, pillar pillar NOT NULL, category cost_category_enum NOT NULL DEFAULT 'project_cost', amount numeric(14,2) NOT NULL, entry_month date NOT NULL, paid boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS cost_entries_updated_at ON cost_entries; CREATE TRIGGER cost_entries_updated_at BEFORE UPDATE ON cost_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS quotations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT, project_id uuid REFERENCES projects(id) ON DELETE SET NULL, version int NOT NULL DEFAULT 1, status quot_status_enum NOT NULL DEFAULT 'draft', subtotal numeric(14,2) NOT NULL DEFAULT 0, total numeric(14,2) NOT NULL DEFAULT 0, notes text, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS quotations_updated_at ON quotations; CREATE TRIGGER quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS targets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), year int NOT NULL, month int, pillar pillar, metric target_metric_enum NOT NULL, target_value numeric(14,2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(year, month, pillar, metric));
DROP TRIGGER IF EXISTS targets_updated_at ON targets; CREATE TRIGGER targets_updated_at BEFORE UPDATE ON targets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY; ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY; ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE quotations ENABLE ROW LEVEL SECURITY; ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "auth_all_invoices" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_invoice_line_items" ON invoice_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_revenue_entries" ON revenue_entries FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_cost_entries" ON cost_entries FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_quotations" ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_targets" ON targets FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW v_monthly_pnl AS
SELECT to_char(entry_month,'YYYY-MM') as month_key, date_trunc('month',entry_month::timestamptz)::date as month, pillar, SUM(amount) as revenue, 0::numeric as costs FROM revenue_entries GROUP BY 1,2,3
UNION ALL
SELECT to_char(entry_month,'YYYY-MM') as month_key, date_trunc('month',entry_month::timestamptz)::date as month, pillar, 0::numeric as revenue, SUM(amount) as costs FROM cost_entries GROUP BY 1,2,3;

CREATE OR REPLACE VIEW v_receivables AS
SELECT i.id, i.invoice_number, i.client_id, c.name as client_name, i.issued_date, i.due_date, i.total, i.status, CURRENT_DATE - i.due_date as days_overdue FROM invoices i JOIN clients c ON c.id=i.client_id WHERE i.status IN ('sent','overdue') AND i.archived_at IS NULL ORDER BY i.due_date;

CREATE OR REPLACE VIEW v_project_financials AS
SELECT p.id as project_id, p.name as project_name, p.budget,
  COALESCE((SELECT SUM(amount) FROM revenue_entries WHERE project_id = p.id), 0) as revenue,
  COALESCE((SELECT SUM(amount) FROM cost_entries WHERE project_id = p.id), 0) as cost,
  COALESCE((SELECT SUM(amount) FROM revenue_entries WHERE project_id = p.id), 0)
    - COALESCE((SELECT SUM(amount) FROM cost_entries WHERE project_id = p.id), 0) as margin,
  p.budget - COALESCE((SELECT SUM(amount) FROM cost_entries WHERE project_id = p.id), 0) as budget_variance
FROM projects p WHERE p.archived_at IS NULL;

CREATE OR REPLACE VIEW v_targets_progress AS
SELECT t.id, t.year, t.month, t.pillar, t.metric, t.target_value, COALESCE((SELECT SUM(re.amount) FROM revenue_entries re WHERE (t.pillar IS NULL OR re.pillar=t.pillar) AND EXTRACT(YEAR FROM re.entry_month)=t.year AND (t.month IS NULL OR EXTRACT(MONTH FROM re.entry_month)=t.month)),0) as actual_value FROM targets t WHERE t.metric='revenue'
UNION ALL
SELECT t.id, t.year, t.month, t.pillar, t.metric, t.target_value, COALESCE((SELECT SUM(re.amount) FROM revenue_entries re WHERE (t.pillar IS NULL OR re.pillar=t.pillar) AND EXTRACT(YEAR FROM re.entry_month)=t.year AND (t.month IS NULL OR EXTRACT(MONTH FROM re.entry_month)=t.month)),0) - COALESCE((SELECT SUM(ce.amount) FROM cost_entries ce WHERE (t.pillar IS NULL OR ce.pillar=t.pillar) AND EXTRACT(YEAR FROM ce.entry_month)=t.year AND (t.month IS NULL OR EXTRACT(MONTH FROM ce.entry_month)=t.month)),0) as actual_value FROM targets t WHERE t.metric='profit';`;

// ─── Phase 2 Setup Banner ─────────────────────────────────────────────────────

const P2SetupBanner = () => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(MIGRATION_SQL_P2); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="bg-[#10101C] border border-amber-400/20 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Phase 2 database not set up</h3>
          <p className="text-sm text-[#7070A0]">Copy the SQL below and run it in your <a href="https://supabase.com/dashboard/project/zsgmzknzzlorneacmnzb/sql/new" target="_blank" rel="noreferrer" className="text-[#FF4D00] underline">Supabase SQL Editor</a>, then refresh.</p>
        </div>
      </div>
      <div className="relative">
        <pre className="text-xs font-mono text-[#7070A0] bg-black/30 rounded-xl p-4 overflow-auto max-h-48 whitespace-pre-wrap break-all">{MIGRATION_SQL_P2}</pre>
        <button onClick={copy} className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF4D00] text-white text-xs font-medium hover:bg-[#E04400] transition-colors">
          {copied ? <CheckCheck size={13} /> : <Database size={13} />}{copied ? "Copied!" : "Copy SQL"}
        </button>
      </div>
      <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-[#7070A0] text-sm hover:bg-white/5 hover:text-white transition-colors">
        <RefreshCw size={14} /> Refresh after running SQL
      </button>
    </div>
  );
};

// ─── Quick Add ────────────────────────────────────────────────────────────────

const QuickAddModal = ({ onClose, onAction }: { onClose: () => void; onAction: (a: string) => void }) => (
  <Modal title="Quick Add" onClose={onClose}>
    <p className="text-xs text-[#7070A0] mb-5">Log data in under 30 seconds. <kbd className="font-mono bg-white/8 px-1.5 py-0.5 rounded">Esc</kbd> to close.</p>
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "New Client",    icon: Building2,    color: "text-[#FF4D00]" },
        { label: "New Project",   icon: FolderOpen,   color: "text-purple-400" },
        { label: "Add Lead",      icon: TrendingUp,   color: "text-blue-400" },
        { label: "Add Task",      icon: CheckCircle2, color: "text-amber-400" },
        { label: "New Event",     icon: Calendar,     color: "text-pink-400" },
        { label: "Log Revenue",   icon: ArrowUpRight, color: "text-emerald-400" },
        { label: "Log Cost",      icon: ArrowDownRight, color: "text-red-400" },
      ].map(a => (
        <button key={a.label} onClick={() => { onAction(a.label); onClose(); }}
          className="flex items-center gap-3 p-4 rounded-xl border border-white/6 bg-white/2 hover:bg-white/5 hover:border-white/12 text-left transition-all">
          <a.icon size={18} className={`flex-shrink-0 ${a.color}`} />
          <span className="text-sm text-white font-medium">{a.label}</span>
        </button>
      ))}
    </div>
  </Modal>
);

// ─── Phase 2 Modals ───────────────────────────────────────────────────────────

const NewRevenueModal = ({ clients, projects, onClose, onSaved }: { clients: any[]; projects: any[]; onClose: () => void; onSaved: () => void }) => {
  const today = new Date().toISOString().slice(0, 7) + "-01";
  const [f, setF] = useState({ description: "", amount: "", pillar: "experiences", client_id: "", project_id: "", revenue_type: "project_fee", entry_month: today.slice(0,7), payment_status: "invoiced" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("revenue_entries").insert({
      description: f.description, amount: parseFloat(f.amount), pillar: f.pillar as any,
      client_id: f.client_id || null, project_id: f.project_id || null,
      revenue_type: f.revenue_type as any, entry_month: f.entry_month + "-01",
      payment_status: f.payment_status as any,
    });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="Log Revenue" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Description *"><input required className={inputCls} placeholder="Sheedx Africa Summit — Production fee" value={f.description} onChange={e => set("description", e.target.value)} /></Field>
        <Field label="Amount (₦) *"><input required type="number" min="0" step="0.01" className={inputCls} placeholder="12500000" value={f.amount} onChange={e => set("amount", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Month"><input type="month" className={inputCls} value={f.entry_month} onChange={e => set("entry_month", e.target.value)} /></Field>
          <Field label="Status"><select className={selectCls} value={f.payment_status} onChange={e => set("payment_status", e.target.value)}><option value="invoiced">Invoiced</option><option value="received">Received</option><option value="overdue">Overdue</option></select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><select className={selectCls} value={f.revenue_type} onChange={e => set("revenue_type", e.target.value)}><option value="project_fee">Project Fee</option><option value="retainer">Retainer</option><option value="consultancy">Consultancy</option><option value="other">Other</option></select></Field>
          <Field label="Pillar"><select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}>{Object.entries(PILLARS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        </div>
        <Field label="Client"><select className={selectCls} value={f.client_id} onChange={e => set("client_id", e.target.value)}><option value="">— None —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Project"><select className={selectCls} value={f.project_id} onChange={e => set("project_id", e.target.value)}><option value="">— None —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <ArrowUpRight size={15} />}{saving ? "Saving…" : "Log Revenue"}
        </button>
      </form>
    </Modal>
  );
};

const NewCostModal = ({ projects, onClose, onSaved }: { projects: any[]; onClose: () => void; onSaved: () => void }) => {
  const today = new Date().toISOString().slice(0, 7);
  const [f, setF] = useState({ description: "", amount: "", pillar: "experiences", project_id: "", category: "project_cost", entry_month: today, paid: "false" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("cost_entries").insert({
      description: f.description, amount: parseFloat(f.amount), pillar: f.pillar as any,
      project_id: f.project_id || null, category: f.category as any,
      entry_month: f.entry_month + "-01", paid: f.paid === "true",
    });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="Log Cost" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Description *"><input required className={inputCls} placeholder="Venue deposit — NICON Luxury Hotel" value={f.description} onChange={e => set("description", e.target.value)} /></Field>
        <Field label="Amount (₦) *"><input required type="number" min="0" step="0.01" className={inputCls} placeholder="3500000" value={f.amount} onChange={e => set("amount", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Month"><input type="month" className={inputCls} value={f.entry_month} onChange={e => set("entry_month", e.target.value)} /></Field>
          <Field label="Paid?"><select className={selectCls} value={f.paid} onChange={e => set("paid", e.target.value)}><option value="false">Unpaid</option><option value="true">Paid</option></select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><select className={selectCls} value={f.category} onChange={e => set("category", e.target.value)}><option value="project_cost">Project Cost</option><option value="overhead">Overhead</option><option value="vendor">Vendor</option><option value="software">Software</option><option value="other">Other</option></select></Field>
          <Field label="Pillar"><select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}>{Object.entries(PILLARS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        </div>
        <Field label="Project (optional)"><select className={selectCls} value={f.project_id} onChange={e => set("project_id", e.target.value)}><option value="">— None / Overhead —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <ArrowDownRight size={15} />}{saving ? "Saving…" : "Log Cost"}
        </button>
      </form>
    </Modal>
  );
};

const NewInvoiceModal = ({ clients, projects, onClose, onSaved }: { clients: any[]; projects: any[]; onClose: () => void; onSaved: () => void }) => {
  const [step, setStep] = useState<1|2>(1);
  const [head, setHead] = useState({ client_id: "", project_id: "", due_date: "", notes: "", status: "draft" });
  const [lines, setLines] = useState([{ description: "", qty: "1", unit_price: "" }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const setH = (k: string, v: string) => setHead(p => ({ ...p, [k]: v }));
  const setLine = (i: number, k: string, v: string) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines(ls => [...ls, { description: "", qty: "1", unit_price: "" }]);
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));
  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.qty || "0") * parseFloat(l.unit_price || "0")), 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const { data: inv, error: e1 } = await supabase.from("invoices").insert({
      client_id: head.client_id, project_id: head.project_id || null,
      due_date: head.due_date, notes: head.notes || null,
      status: head.status as any, subtotal, total: subtotal,
    }).select().single();
    if (e1 || !inv) { setSaving(false); setErr(e1?.message ?? "Failed to create invoice"); return; }
    const lineData = lines.filter(l => l.description && l.unit_price).map((l, i) => ({
      invoice_id: inv.id, description: l.description,
      qty: parseFloat(l.qty || "1"), unit_price: parseFloat(l.unit_price), sort_order: i,
    }));
    if (lineData.length) await supabase.from("invoice_line_items").insert(lineData);
    setSaving(false);
    onSaved(); onClose();
  };

  return (
    <Modal title="New Invoice" onClose={onClose}>
      {step === 1 ? (
        <div className="space-y-4">
          <Field label="Client *">
            <select required className={selectCls} value={head.client_id} onChange={e => setH("client_id", e.target.value)}>
              <option value="">Select client…</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Project (optional)">
            <select className={selectCls} value={head.project_id} onChange={e => setH("project_id", e.target.value)}>
              <option value="">— None —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due Date *"><input required type="date" className={inputCls} value={head.due_date} onChange={e => setH("due_date", e.target.value)} /></Field>
            <Field label="Status"><select className={selectCls} value={head.status} onChange={e => setH("status", e.target.value)}><option value="draft">Draft</option><option value="sent">Sent</option></select></Field>
          </div>
          <Field label="Notes"><input className={inputCls} placeholder="Payment terms, references…" value={head.notes} onChange={e => setH("notes", e.target.value)} /></Field>
          <button disabled={!head.client_id || !head.due_date} onClick={() => setStep(2)}
            className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-40 transition-colors">
            Next: Add Line Items →
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <input className={inputCls} placeholder="Description" value={l.description} onChange={e => setLine(i, "description", e.target.value)} />
                  <div className="flex gap-2">
                    <input type="number" min="0.01" step="0.01" className={`${inputCls} w-20`} placeholder="Qty" value={l.qty} onChange={e => setLine(i, "qty", e.target.value)} />
                    <input type="number" min="0" step="0.01" className={`${inputCls} flex-1`} placeholder="Unit price (₦)" value={l.unit_price} onChange={e => setLine(i, "unit_price", e.target.value)} />
                    <div className="flex items-center text-xs font-mono text-[#7070A0] whitespace-nowrap pt-3">
                      {formatNaira(parseFloat(l.qty || "0") * parseFloat(l.unit_price || "0"))}
                    </div>
                  </div>
                </div>
                {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="mt-1 p-1.5 rounded-lg hover:bg-red-400/10 text-[#7070A0] hover:text-red-400 transition-colors"><X size={14} /></button>}
              </div>
            ))}
          </div>
          <button type="button" onClick={addLine} className="flex items-center gap-2 text-xs text-[#7070A0] hover:text-white transition-colors"><Plus size={13} /> Add line item</button>
          <div className="flex items-center justify-between pt-3 border-t border-white/6">
            <span className="text-sm text-[#7070A0]">Total</span>
            <span className="text-lg font-bold font-mono text-white">{formatNaira(subtotal)}</span>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl border border-white/10 text-[#7070A0] text-sm hover:bg-white/5 transition-colors">← Back</button>
            <button type="submit" disabled={saving || lines.every(l => !l.description)} className="flex-1 py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving ? <Spinner /> : <Receipt size={15} />}{saving ? "Creating…" : "Create Invoice"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

const NewTargetModal = ({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState({ year: String(new Date().getFullYear()), month: "", pillar: "", metric: "revenue", target_value: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("targets").insert({
      year: parseInt(f.year), month: f.month ? parseInt(f.month) : null,
      pillar: f.pillar as any || null, metric: f.metric as any,
      target_value: parseFloat(f.target_value),
    });
    setSaving(false);
    if (error) setErr(error.message.includes("unique") ? "A target for this combination already exists." : error.message);
    else { onSaved(); onClose(); }
  };

  return (
    <Modal title="Set Target" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Year *"><input required type="number" className={inputCls} value={f.year} onChange={e => set("year", e.target.value)} /></Field>
          <Field label="Month (blank = annual)">
            <select className={selectCls} value={f.month} onChange={e => set("month", e.target.value)}>
              <option value="">Annual</option>
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Metric"><select className={selectCls} value={f.metric} onChange={e => set("metric", e.target.value)}><option value="revenue">Revenue</option><option value="profit">Profit</option><option value="projects_delivered">Projects Delivered</option></select></Field>
          <Field label="Pillar (blank = company-wide)">
            <select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}>
              <option value="">Company-wide</option>{Object.entries(PILLARS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Target Value (₦) *"><input required type="number" min="0" step="0.01" className={inputCls} placeholder="50000000" value={f.target_value} onChange={e => set("target_value", e.target.value)} /></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Target size={15} />}{saving ? "Saving…" : "Set Target"}
        </button>
      </form>
    </Modal>
  );
};

const NewQuotationModal = ({ clients, projects, onClose, onSaved }: { clients: any[]; projects: any[]; onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState({ title: "", client_id: "", project_id: "", total: "", notes: "", status: "draft" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const total = parseFloat(f.total || "0");
    const { error } = await supabase.from("quotations").insert({
      title: f.title, client_id: f.client_id, project_id: f.project_id || null,
      subtotal: total, total, notes: f.notes || null, status: f.status as any,
    });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="New Quotation" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Title *"><input required className={inputCls} placeholder="Sheedx Africa Summit — Full Production Quote" value={f.title} onChange={e => set("title", e.target.value)} /></Field>
        <Field label="Client *">
          <select required className={selectCls} value={f.client_id} onChange={e => set("client_id", e.target.value)}>
            <option value="">Select client…</option>{clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Project (optional)">
          <select className={selectCls} value={f.project_id} onChange={e => set("project_id", e.target.value)}>
            <option value="">— None —</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total (₦) *"><input required type="number" min="0" step="0.01" className={inputCls} placeholder="8500000" value={f.total} onChange={e => set("total", e.target.value)} /></Field>
          <Field label="Status"><select className={selectCls} value={f.status} onChange={e => set("status", e.target.value)}><option value="draft">Draft</option><option value="sent">Sent</option></select></Field>
        </div>
        <Field label="Notes"><input className={inputCls} placeholder="Scope summary, terms…" value={f.notes} onChange={e => set("notes", e.target.value)} /></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Receipt size={15} />}{saving ? "Creating…" : "Create Quotation"}
        </button>
      </form>
    </Modal>
  );
};

// ─── Invoice Print ────────────────────────────────────────────────────────────

const printInvoice = (invoice: any, lineItems: any[], clientName: string, projectName?: string) => {
  const linesHTML = lineItems.map(l => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;">${l.description}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;">${l.qty}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;">₦${Number(l.unit_price).toLocaleString("en-NG")}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:600;">₦${Number(l.line_total).toLocaleString("en-NG")}</td>
    </tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${invoice.invoice_number}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;background:#fff;padding:40px;max-width:800px;margin:0 auto;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #FF4D00;}
  .brand{font-size:22px;font-weight:800;color:#FF4D00;letter-spacing:-0.5px;}
  .brand-sub{font-size:12px;color:#666;margin-top:4px;}
  .invoice-title{font-size:28px;font-weight:800;color:#111;}
  .invoice-num{font-size:13px;color:#666;margin-top:4px;font-family:monospace;}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px;}
  .meta-label{font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:#999;margin-bottom:4px;}
  .meta-value{font-size:14px;font-weight:600;color:#111;}
  table{width:100%;border-collapse:collapse;margin-bottom:24px;}
  thead th{background:#f8f8f8;padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:#666;font-weight:600;text-align:left;}
  thead th:last-child,thead th:nth-child(3){text-align:right;}thead th:nth-child(2){text-align:center;}
  .total-row{background:#FF4D00;color:#fff;}
  .total-row td{padding:14px 16px;font-weight:800;font-size:16px;}
  .total-row td:last-child{text-align:right;}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center;}
  .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;
    background:${invoice.status==="paid"?"#dcfce7":invoice.status==="overdue"?"#fee2e2":"#fef3c7"};
    color:${invoice.status==="paid"?"#166534":invoice.status==="overdue"?"#991b1b":"#92400e"};}
  @media print{body{padding:24px;}}</style></head>
  <body>
  <div class="header">
    <div><div class="brand">Break The Eyes Media</div><div class="brand-sub">Creative Production & Events</div></div>
    <div style="text-align:right;"><div class="invoice-title">INVOICE</div><div class="invoice-num">${invoice.invoice_number}</div><div style="margin-top:8px;"><span class="status-badge">${invoice.status}</span></div></div>
  </div>
  <div class="meta">
    <div><div class="meta-label">Bill To</div><div class="meta-value">${clientName}</div>${projectName ? `<div style="font-size:13px;color:#666;margin-top:2px;">${projectName}</div>` : ""}</div>
    <div><div class="meta-label">Issue Date</div><div class="meta-value">${new Date(invoice.issued_date).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div>
    <div style="margin-top:12px;"><div class="meta-label">Due Date</div><div class="meta-value">${new Date(invoice.due_date).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div></div></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
    <tbody>${linesHTML}</tbody>
    <tfoot><tr class="total-row"><td colspan="3">Total</td><td>₦${Number(invoice.total).toLocaleString("en-NG")}</td></tr></tfoot>
  </table>
  ${invoice.notes ? `<div style="margin-bottom:24px;padding:16px;background:#f8f8f8;border-radius:8px;font-size:13px;color:#555;">${invoice.notes}</div>` : ""}
  <div class="footer">Break The Eyes Media &nbsp;·&nbsp; Thank you for your business</div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
};

// ─── Invoice Detail Page ──────────────────────────────────────────────────────

const InvoiceDetailPage = ({ invoice, lineItems, clients, projects, onBack, onRefresh }: {
  invoice: any; lineItems: any[]; clients: any[]; projects: any[];
  onBack: () => void; onRefresh: () => void;
}) => {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c.name]));
  const projectMap = Object.fromEntries(projects.map((p: any) => [p.id, p.name]));
  const myLines = lineItems.filter((l: any) => l.invoice_id === invoice.id);
  const clientName = clientMap[invoice.client_id] ?? "Unknown";
  const projectName = invoice.project_id ? projectMap[invoice.project_id] : undefined;

  const updateStatus = async (status: string) => {
    setUpdatingStatus(true);
    await supabase.from("invoices").update({ status }).eq("id", invoice.id);
    setUpdatingStatus(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="flex items-center gap-1 text-[#7070A0] hover:text-white transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Finance
        </button>
        <ChevronRight size={13} className="text-[#3A3A5E]" />
        <span className="text-white font-mono">{invoice.invoice_number}</span>
      </div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Invoice</div>
            <h1 className="text-2xl font-bold text-white font-mono">{invoice.invoice_number}</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select className="text-xs bg-[#1A1A2E] border border-white/10 rounded-lg px-3 py-2 text-white" defaultValue={invoice.status}
              onChange={e => updateStatus(e.target.value)} disabled={updatingStatus}>
              <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
            </select>
            <button onClick={() => printInvoice(invoice, myLines, clientName, projectName)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors">
              <Receipt size={15} /> Print / Save PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-white/6 text-xs">
          <div><div className="text-[#7070A0] font-mono mb-1">Client</div><div className="text-white font-medium">{clientName}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Project</div><div className="text-white">{projectName ?? "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Issued</div><div className="text-white">{formatDate(invoice.issued_date)}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Due</div><div className={`font-mono ${invoice.status !== "paid" && daysUntil(invoice.due_date) <= 0 ? "text-red-400" : "text-white"}`}>{formatDate(invoice.due_date)}</div></div>
        </div>

        <div className="mt-5">
          <table className="w-full">
            <thead><tr className="border-b border-white/6">
              {["Description","Qty","Unit Price","Total"].map((h, i) => <th key={h} className={`text-xs font-mono text-[#7070A0] uppercase tracking-widest pb-3 ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-white/4">
              {myLines.map((l: any) => (
                <tr key={l.id}>
                  <td className="py-3 text-sm text-white">{l.description}</td>
                  <td className="py-3 text-sm text-[#7070A0] text-right font-mono">{l.qty}</td>
                  <td className="py-3 text-sm text-[#7070A0] text-right font-mono">{formatNaira(l.unit_price)}</td>
                  <td className="py-3 text-sm text-white text-right font-mono font-semibold">{formatNaira(l.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#FF4D00]/30">
                <td colSpan={3} className="pt-4 text-sm font-mono text-[#7070A0] uppercase tracking-widest">Total</td>
                <td className="pt-4 text-xl font-bold font-mono text-white text-right">{formatNaira(invoice.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {invoice.notes && <p className="mt-5 pt-5 border-t border-white/6 text-sm text-[#B0ADCC]">{invoice.notes}</p>}
      </div>
    </div>
  );
};

// ─── Finance Page ─────────────────────────────────────────────────────────────

const FinancePage = ({ p2Ready, revenueEntries, costEntries, invoices, lineItems, quotations, clients, projects, loading, onNew, onRefresh, onSelectInvoice, onConvertQuotation }: {
  p2Ready: boolean; revenueEntries: any[]; costEntries: any[]; invoices: any[]; lineItems: any[]; quotations: any[]; clients: any[]; projects: any[];
  loading: boolean; onNew: (t: string) => void; onRefresh: () => void; onSelectInvoice: (inv: any) => void; onConvertQuotation: (q: any) => void;
}) => {
  const [tab, setTab] = useState<"revenue"|"costs"|"invoices"|"quotations">("revenue");
  const [converting, setConverting] = useState<string | null>(null);
  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c.name]));
  const projectMap = Object.fromEntries(projects.map((p: any) => [p.id, p.name]));

  const totalRev = revenueEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalCost = costEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalReceived = revenueEntries.filter((e: any) => e.payment_status === "received").reduce((s: number, e: any) => s + Number(e.amount), 0);
  const outstanding = invoices.filter((i: any) => i.status === "sent" || i.status === "overdue").reduce((s: number, i: any) => s + Number(i.total), 0);

  if (!p2Ready) return (
    <div className="space-y-5">
      <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Finance</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Finance</h1></div>
      <P2SetupBanner />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Finance</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Finance</h1></div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(
              tab === "invoices" ? invoices : tab === "costs" ? costEntries : tab === "quotations" ? quotations : revenueEntries,
              tab
            )}
            title="Export CSV" className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><Download size={15} /></button>
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <button onClick={() => onNew(tab === "invoices" ? "invoice" : tab === "costs" ? "cost" : tab === "quotations" ? "quotation" : "revenue")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors">
            <Plus size={15} />{tab === "invoices" ? "New Invoice" : tab === "costs" ? "Log Cost" : tab === "quotations" ? "New Quotation" : "Log Revenue"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Total Revenue</div><div className="text-xl font-bold text-white font-mono">{formatNaira(totalRev)}</div><div className="text-xs text-emerald-400 mt-1 font-mono">{formatNaira(totalReceived)} received</div></div>
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Total Costs</div><div className="text-xl font-bold text-white font-mono">{formatNaira(totalCost)}</div><div className="text-xs text-[#7070A0] mt-1 font-mono">{costEntries.filter((e: any) => e.paid).length} paid</div></div>
        <div className="bg-[#10101C] border border-emerald-400/20 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Gross Margin</div><div className="text-xl font-bold text-emerald-400 font-mono">{formatNaira(totalRev - totalCost)}</div><div className="text-xs text-[#7070A0] mt-1 font-mono">{totalRev > 0 ? Math.round(((totalRev - totalCost) / totalRev) * 100) : 0}% margin</div></div>
        <div className="bg-[#10101C] border border-amber-400/20 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Outstanding</div><div className="text-xl font-bold text-amber-400 font-mono">{formatNaira(outstanding)}</div><div className="text-xs text-[#7070A0] mt-1 font-mono">{invoices.filter((i: any) => i.status === "overdue").length} overdue</div></div>
      </div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/6">
          {(["revenue","costs","invoices","quotations"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-3.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "text-white border-[#FF4D00]" : "text-[#7070A0] border-transparent hover:text-white"}`}>
              {t === "revenue" ? `Revenue (${revenueEntries.length})` : t === "costs" ? `Costs (${costEntries.length})` : t === "invoices" ? `Invoices (${invoices.length})` : `Quotations (${quotations.length})`}
            </button>
          ))}
        </div>

        {(() => {
          if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

          if (tab === "revenue") return revenueEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <p className="text-sm text-[#7070A0] mb-4">No revenue logged yet.</p>
              <button onClick={() => onNew("revenue")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> Log First Revenue</button>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-white/5">{["Description","Client","Pillar","Month","Amount","Status"].map(h => <th key={h} className="text-left text-xs font-mono text-[#7070A0] uppercase tracking-widest px-5 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {revenueEntries.map((e: any) => (
                  <tr key={e.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-white">{e.description}</td>
                    <td className="px-5 py-3.5 text-xs text-[#7070A0]">{e.client_id ? clientMap[e.client_id] ?? "—" : "—"}</td>
                    <td className="px-5 py-3.5"><PillarBadge pillar={e.pillar} /></td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[#7070A0]">{e.entry_month ? new Date(e.entry_month).toLocaleDateString("en-GB",{month:"short",year:"numeric"}) : "—"}</td>
                    <td className="px-5 py-3.5 text-sm font-mono font-semibold text-emerald-400">{formatNaira(e.amount)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={e.payment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          );

          if (tab === "costs") return costEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <p className="text-sm text-[#7070A0] mb-4">No costs logged yet.</p>
              <button onClick={() => onNew("cost")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> Log First Cost</button>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-white/5">{["Description","Project","Category","Month","Amount","Paid"].map(h => <th key={h} className="text-left text-xs font-mono text-[#7070A0] uppercase tracking-widest px-5 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {costEntries.map((e: any) => (
                  <tr key={e.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-white">{e.description}</td>
                    <td className="px-5 py-3.5 text-xs text-[#7070A0]">{e.project_id ? projectMap[e.project_id] ?? "—" : "—"}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[#B0ADCC] capitalize">{e.category?.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[#7070A0]">{e.entry_month ? new Date(e.entry_month).toLocaleDateString("en-GB",{month:"short",year:"numeric"}) : "—"}</td>
                    <td className="px-5 py-3.5 text-sm font-mono font-semibold text-red-400">{formatNaira(e.amount)}</td>
                    <td className="px-5 py-3.5"><span className={`text-xs font-mono ${e.paid ? "text-emerald-400" : "text-[#7070A0]"}`}>{e.paid ? "Paid" : "Unpaid"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          );

          if (tab === "invoices") return invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <p className="text-sm text-[#7070A0] mb-4">No invoices yet. Create your first numbered invoice.</p>
              <button onClick={() => onNew("invoice")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> New Invoice</button>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-white/5">{["Invoice #","Client","Issued","Due","Total","Status"].map(h => <th key={h} className="text-left text-xs font-mono text-[#7070A0] uppercase tracking-widest px-5 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} onClick={() => onSelectInvoice(inv)} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5 font-mono text-sm text-[#FF4D00] font-semibold">{inv.invoice_number}</td>
                    <td className="px-5 py-3.5 text-sm text-white">{clientMap[inv.client_id] ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[#7070A0]">{formatDate(inv.issued_date)}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[#7070A0]">{formatDate(inv.due_date)}</td>
                    <td className="px-5 py-3.5 text-sm font-mono font-semibold text-white">{formatNaira(inv.total)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          );

          return quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <p className="text-sm text-[#7070A0] mb-4">No quotations yet.</p>
              <button onClick={() => onNew("quotation")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> New Quotation</button>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-white/5">{["Title","Client","Version","Total","Status",""].map(h => <th key={h} className="text-left text-xs font-mono text-[#7070A0] uppercase tracking-widest px-5 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {quotations.map((q: any) => (
                  <tr key={q.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-white">{q.title}</td>
                    <td className="px-5 py-3.5 text-sm text-[#7070A0]">{clientMap[q.client_id] ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[#7070A0]">v{q.version}</td>
                    <td className="px-5 py-3.5 text-sm font-mono text-white">{formatNaira(q.total)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={q.status} /></td>
                    <td className="px-5 py-3.5">
                      {q.status !== "accepted" && q.status !== "declined" && (
                        <button
                          disabled={converting === q.id}
                          onClick={async () => { setConverting(q.id); await onConvertQuotation(q); setConverting(null); }}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                        >
                          {converting === q.id ? "Converting…" : "Convert to Invoice"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
};

// ─── Targets Page ─────────────────────────────────────────────────────────────

const TargetsPage = ({ p2Ready, targets, revenueEntries, onNew, onRefresh, loading }: {
  p2Ready: boolean; targets: any[]; revenueEntries: any[]; onNew: () => void; onRefresh: () => void; loading: boolean;
}) => {
  if (!p2Ready) return (
    <div className="space-y-5">
      <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Targets</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Targets</h1></div>
      <P2SetupBanner />
    </div>
  );

  const getActual = (t: any) => {
    if (t.metric !== "revenue") return 0;
    return revenueEntries.filter((e: any) => {
      const d = new Date(e.entry_month);
      const yearMatch = d.getFullYear() === t.year;
      const monthMatch = !t.month || d.getMonth() + 1 === t.month;
      const pillarMatch = !t.pillar || e.pillar === t.pillar;
      return yearMatch && monthMatch && pillarMatch;
    }).reduce((s: number, e: any) => s + Number(e.amount), 0);
  };

  const annualTargets = targets.filter((t: any) => !t.month);
  const monthlyTargets = targets.filter((t: any) => t.month);

  const TargetRow = ({ t }: { t: any }) => {
    const actual = getActual(t);
    const pct = t.target_value > 0 ? Math.min((actual / t.target_value) * 100, 100) : 0;
    const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return (
      <div className="bg-[#10101C] border border-white/6 rounded-2xl p-5 hover:border-white/10 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white capitalize">{t.metric.replace(/_/g, " ")}</span>
              {t.pillar ? <PillarBadge pillar={t.pillar} /> : <span className="text-xs font-mono px-2 py-0.5 rounded-md border border-white/8 text-[#B0ADCC]">Company-wide</span>}
            </div>
            <div className="text-xs font-mono text-[#7070A0] mt-1">{t.year}{t.month ? ` · ${months[t.month]}` : " · Annual"}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold font-mono text-white">{formatNaira(actual)}</div>
            <div className="text-xs font-mono text-[#7070A0]">of {formatNaira(t.target_value)}</div>
          </div>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#22C55E" : pct >= 70 ? "#F59E0B" : "#FF4D00" }} />
        </div>
        <div className={`text-xs font-mono mt-2 ${pct >= 100 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-[#7070A0]"}`}>{Math.round(pct)}% achieved</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Targets</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Targets & Progress</h1></div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> Set Target</button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div>
      : targets.length === 0 ? (
        <EmptyState icon={Target} title="No targets set" desc="Set annual or monthly revenue targets per pillar to track performance." action={<button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> Set First Target</button>} />
      ) : (
        <div className="space-y-6">
          {annualTargets.length > 0 && (
            <div>
              <div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-3">Annual Targets</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{annualTargets.map((t: any) => <TargetRow key={t.id} t={t} />)}</div>
            </div>
          )}
          {monthlyTargets.length > 0 && (
            <div>
              <div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-3">Monthly Targets</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{monthlyTargets.map((t: any) => <TargetRow key={t.id} t={t} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Phase 3 Migration SQL ────────────────────────────────────────────────────

const MIGRATION_SQL_P3 = `-- BTE Admin Portal — Phase 3 Migration (Events)
-- Run AFTER Phase 1 & 2. Paste into: Supabase Dashboard → SQL Editor → Run

DO $$ BEGIN CREATE TYPE event_status_enum AS ENUM ('planning','confirmed','in_progress','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE event_type_enum AS ENUM ('conference','concert','wedding','corporate','activation','production','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, project_id uuid REFERENCES projects(id) ON DELETE SET NULL, pillar pillar NOT NULL DEFAULT 'experiences', event_type event_type_enum NOT NULL DEFAULT 'corporate', status event_status_enum NOT NULL DEFAULT 'planning', event_date date NOT NULL, end_date date, venue text, city text, expected_guests int, budget numeric(14,2), lead_id uuid REFERENCES staff(id) ON DELETE SET NULL, brief text, notes text, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS events_updated_at ON events; CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS event_crew (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE, staff_id uuid REFERENCES staff(id) ON DELETE SET NULL, role text NOT NULL, call_time text, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS event_schedule (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE, title text NOT NULL, start_time text, end_time text, owner text, sort_order int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE events ENABLE ROW LEVEL SECURITY; ALTER TABLE event_crew ENABLE ROW LEVEL SECURITY; ALTER TABLE event_schedule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "auth_all_events" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_event_crew" ON event_crew FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_event_schedule" ON event_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

// ─── Phase 3b Migration SQL (speakers/guests + attendees) ──────────────────────
// Run AFTER Phase 3 above. Adds the PRD's event_people (speakers/guests/moderators/
// performers) and attendees (with CSV import support in the UI) tables — the original
// Phase 3 migration shipped a simplified crew+schedule model without these.
const MIGRATION_SQL_P3B = `-- BTE Admin Portal — Phase 3b Migration (Speakers, Guests & Attendees)
-- Run AFTER Phase 3. Paste into: Supabase Dashboard → SQL Editor → Run

DO $$ BEGIN CREATE TYPE event_person_role_enum AS ENUM ('speaker','guest','moderator','performer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS event_people (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE, name text NOT NULL, role event_person_role_enum NOT NULL DEFAULT 'guest', organisation text, contact text, confirmed boolean NOT NULL DEFAULT false, travel_logistics text, notes text, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS attendees (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE, name text NOT NULL, email text, phone text, ticket_type text, checked_in boolean NOT NULL DEFAULT false, checked_in_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());

-- Powers the day-of "Go Live" run-of-show view (tap a segment to cycle pending → live → done)
ALTER TABLE event_schedule ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

ALTER TABLE event_people ENABLE ROW LEVEL SECURITY; ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "auth_all_event_people" ON event_people FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_attendees" ON attendees FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

const P3bSetupBanner = () => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(MIGRATION_SQL_P3B); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="bg-[#10101C] border border-amber-400/20 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#7070A0]">Speakers, guests &amp; attendees need one more migration. Copy the SQL and run it in your <a href="https://supabase.com/dashboard/project/zsgmzknzzlorneacmnzb/sql/new" target="_blank" rel="noreferrer" className="text-[#FF4D00] underline">Supabase SQL Editor</a>, then refresh.</p>
      </div>
      <div className="relative">
        <pre className="text-xs font-mono text-[#7070A0] bg-black/30 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap break-all">{MIGRATION_SQL_P3B}</pre>
        <button onClick={copy} className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF4D00] text-white text-xs font-medium hover:bg-[#E04400] transition-colors">
          {copied ? <CheckCheck size={12} /> : <Database size={12} />}{copied ? "Copied!" : "Copy SQL"}
        </button>
      </div>
    </div>
  );
};

const P3SetupBanner = () => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(MIGRATION_SQL_P3); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="bg-[#10101C] border border-amber-400/20 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Phase 3 database not set up</h3>
          <p className="text-sm text-[#7070A0]">Copy the SQL below and run it in your <a href="https://supabase.com/dashboard/project/zsgmzknzzlorneacmnzb/sql/new" target="_blank" rel="noreferrer" className="text-[#FF4D00] underline">Supabase SQL Editor</a>, then refresh.</p>
        </div>
      </div>
      <div className="relative">
        <pre className="text-xs font-mono text-[#7070A0] bg-black/30 rounded-xl p-4 overflow-auto max-h-48 whitespace-pre-wrap break-all">{MIGRATION_SQL_P3}</pre>
        <button onClick={copy} className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF4D00] text-white text-xs font-medium hover:bg-[#E04400] transition-colors">
          {copied ? <CheckCheck size={13} /> : <Database size={13} />}{copied ? "Copied!" : "Copy SQL"}
        </button>
      </div>
      <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-[#7070A0] text-sm hover:bg-white/5 hover:text-white transition-colors">
        <RefreshCw size={14} /> Refresh after running SQL
      </button>
    </div>
  );
};

// ─── Events ───────────────────────────────────────────────────────────────────

const EVENT_TYPES: Record<string, string> = {
  conference: "Conference", concert: "Concert", wedding: "Wedding",
  corporate: "Corporate", activation: "Activation", production: "Production", other: "Other",
};

const NewEventModal = ({ clients, projects, staff, onClose, onSaved }: { clients: any[]; projects: any[]; staff: any[]; onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState({ name: "", client_id: "", project_id: "", pillar: "experiences", event_type: "corporate", status: "planning", event_date: "", end_date: "", venue: "", city: "", expected_guests: "", budget: "", lead_id: "", brief: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const { error } = await supabase.from("events").insert({
      name: f.name, client_id: f.client_id || null, project_id: f.project_id || null,
      pillar: f.pillar as any, event_type: f.event_type as any, status: f.status as any,
      event_date: f.event_date, end_date: f.end_date || null, venue: f.venue || null, city: f.city || null,
      expected_guests: f.expected_guests ? parseInt(f.expected_guests) : null,
      budget: f.budget ? parseFloat(f.budget) : null, lead_id: f.lead_id || null, brief: f.brief || null,
    });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="New Event" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Event Name *"><input required className={inputCls} placeholder="e.g. Lagos Tech Summit 2026" value={f.name} onChange={e => set("name", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Event Date *"><input required type="date" className={inputCls} value={f.event_date} onChange={e => set("event_date", e.target.value)} /></Field>
          <Field label="End Date"><input type="date" className={inputCls} value={f.end_date} onChange={e => set("end_date", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Venue"><input className={inputCls} placeholder="Venue name" value={f.venue} onChange={e => set("venue", e.target.value)} /></Field>
          <Field label="City"><input className={inputCls} placeholder="Abuja / Lagos" value={f.city} onChange={e => set("city", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><select className={selectCls} value={f.event_type} onChange={e => set("event_type", e.target.value)}>{Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Status"><select className={selectCls} value={f.status} onChange={e => set("status", e.target.value)}>{["planning","confirmed","in_progress","completed","cancelled"].map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label}</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pillar"><select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Event Lead"><select className={selectCls} value={f.lead_id} onChange={e => set("lead_id", e.target.value)}><option value="">— None —</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expected Guests"><input type="number" min="0" className={inputCls} placeholder="250" value={f.expected_guests} onChange={e => set("expected_guests", e.target.value)} /></Field>
          <Field label="Budget (₦)"><input type="number" min="0" step="0.01" className={inputCls} placeholder="5000000" value={f.budget} onChange={e => set("budget", e.target.value)} /></Field>
        </div>
        <Field label="Client"><select className={selectCls} value={f.client_id} onChange={e => set("client_id", e.target.value)}><option value="">— None —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Linked Project"><select className={selectCls} value={f.project_id} onChange={e => set("project_id", e.target.value)}><option value="">— None —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Brief"><textarea className={`${inputCls} min-h-20`} placeholder="Event objectives, scope, key notes…" value={f.brief} onChange={e => set("brief", e.target.value)} /></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Calendar size={15} />}{saving ? "Saving…" : "Create Event"}
        </button>
      </form>
    </Modal>
  );
};

const EventsPage = ({ p3Ready, events, clients, staff, loading, onNew, onRefresh, onSelect }: {
  p3Ready: boolean; events: any[]; clients: any[]; staff: any[]; loading: boolean;
  onNew: () => void; onRefresh: () => void; onSelect: (e: any) => void;
}) => {
  const [filter, setFilter] = useState<string>("all");
  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c.name]));
  const staffMap = Object.fromEntries(staff.map((s: any) => [s.id, s.name]));

  if (!p3Ready) return (
    <div className="space-y-5">
      <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Events</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Events</h1></div>
      <P3SetupBanner />
    </div>
  );

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const upcoming = events.filter((e: any) => new Date(e.event_date) >= now && e.status !== "cancelled" && e.status !== "completed");
  const thisMonth = events.filter((e: any) => { const d = new Date(e.event_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const confirmed = events.filter((e: any) => e.status === "confirmed" || e.status === "in_progress");
  const totalBudget = events.reduce((s: number, e: any) => s + Number(e.budget || 0), 0);
  const shown = filter === "all" ? events : events.filter((e: any) => e.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Events</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Events</h1></div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> New Event</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Upcoming</div><div className="text-xl font-bold text-white font-mono">{upcoming.length}</div><div className="text-xs text-[#7070A0] mt-1 font-mono">events ahead</div></div>
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">This Month</div><div className="text-xl font-bold text-white font-mono">{thisMonth.length}</div><div className="text-xs text-[#7070A0] mt-1 font-mono">scheduled</div></div>
        <div className="bg-[#10101C] border border-emerald-400/20 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Confirmed</div><div className="text-xl font-bold text-emerald-400 font-mono">{confirmed.length}</div><div className="text-xs text-[#7070A0] mt-1 font-mono">locked in</div></div>
        <div className="bg-[#10101C] border border-amber-400/20 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Total Budget</div><div className="text-xl font-bold text-amber-400 font-mono">{formatNaira(totalBudget)}</div><div className="text-xs text-[#7070A0] mt-1 font-mono">across events</div></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all","planning","confirmed","in_progress","completed","cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${filter === s ? "bg-[#FF4D00]/10 text-white border-[#FF4D00]/30" : "text-[#7070A0] border-white/6 hover:text-white hover:bg-white/4"}`}>
            {s === "all" ? `All (${events.length})` : `${STATUS_CFG[s]?.label} (${events.filter((e: any) => e.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div>
      : events.length === 0 ? (
        <EmptyState icon={PartyPopper} title="No events yet" desc="Plan your first event to manage crew, run-of-show and budgets." action={<button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> New Event</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((e: any) => {
            const d = daysUntil(e.event_date);
            return (
              <button key={e.id} onClick={() => onSelect(e)} className="text-left bg-[#10101C] border border-white/6 rounded-2xl p-5 hover:border-white/12 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{e.name}</div>
                    <div className="text-xs font-mono text-[#7070A0] mt-0.5">{EVENT_TYPES[e.event_type] ?? e.event_type}</div>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div className="space-y-1.5 text-xs text-[#B0ADCC]">
                  <div className="flex items-center gap-2"><CalendarClock size={13} className="text-[#7070A0] flex-shrink-0" />{formatDate(e.event_date)}{e.status !== "completed" && e.status !== "cancelled" && d >= 0 && <span className="font-mono text-[#7070A0]">· {d === 0 ? "today" : `${d}d`}</span>}</div>
                  {(e.venue || e.city) && <div className="flex items-center gap-2"><MapPin size={13} className="text-[#7070A0] flex-shrink-0" /><span className="truncate">{[e.venue, e.city].filter(Boolean).join(", ")}</span></div>}
                  {e.client_id && <div className="flex items-center gap-2"><Building2 size={13} className="text-[#7070A0] flex-shrink-0" /><span className="truncate">{clientMap[e.client_id] ?? "—"}</span></div>}
                  {e.lead_id && <div className="flex items-center gap-2"><UserSquare2 size={13} className="text-[#7070A0] flex-shrink-0" /><span className="truncate">{staffMap[e.lead_id] ?? "—"}</span></div>}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/6">
                  <PillarBadge pillar={e.pillar} />
                  <span className="text-sm font-mono font-semibold text-white">{formatNaira(Number(e.budget || 0))}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Minimal CSV parser for attendee import — handles simple comma-separated files with
// a header row (name,email,phone,ticket_type). Doesn't handle quoted fields with
// embedded commas; if the founder's registration exports need that, upgrade to a
// small parsing library at that point rather than guessing now.
const parseAttendeeCSV = (text: string): { name: string; email: string; phone: string; ticket_type: string }[] => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const idx = (key: string) => headers.findIndex(h => h.includes(key));
  const nameIdx = idx("name"), emailIdx = idx("email"), phoneIdx = idx("phone"), ticketIdx = idx("ticket");
  return lines.slice(1).map(line => {
    const cells = line.split(",").map(c => c.trim());
    return {
      name: nameIdx >= 0 ? cells[nameIdx] ?? "" : "",
      email: emailIdx >= 0 ? cells[emailIdx] ?? "" : "",
      phone: phoneIdx >= 0 ? cells[phoneIdx] ?? "" : "",
      ticket_type: ticketIdx >= 0 ? cells[ticketIdx] ?? "" : "",
    };
  }).filter(a => a.name);
};

const EVENT_PERSON_ROLE_LABELS: Record<string, string> = { speaker: "Speaker", guest: "Guest", moderator: "Moderator", performer: "Performer" };

const EventDetailPage = ({ event, clients, projects, staff, p3bReady, onBack, onRefresh, onGoLive }: {
  event: any; clients: any[]; projects: any[]; staff: any[]; p3bReady: boolean; onBack: () => void; onRefresh: () => void; onGoLive: () => void;
}) => {
  const [crew, setCrew] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [crewForm, setCrewForm] = useState({ staff_id: "", role: "", call_time: "" });
  const [schedForm, setSchedForm] = useState({ title: "", start_time: "", end_time: "", owner: "" });
  const [personForm, setPersonForm] = useState({ name: "", role: "guest", organisation: "" });
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const clientName = clients.find((c: any) => c.id === event.client_id)?.name;
  const projectName = projects.find((p: any) => p.id === event.project_id)?.name;
  const leadName = staff.find((s: any) => s.id === event.lead_id)?.name;
  const staffMap = Object.fromEntries(staff.map((s: any) => [s.id, s.name]));

  const load = useCallback(async () => {
    setLoading(true);
    const [cr, sc] = await Promise.all([
      supabase.from("event_crew").select("*").eq("event_id", event.id).order("created_at"),
      supabase.from("event_schedule").select("*").eq("event_id", event.id).order("sort_order").order("start_time"),
    ]);
    setCrew(cr.data ?? []);
    setSchedule(sc.data ?? []);
    if (p3bReady) {
      const [pp, at] = await Promise.all([
        supabase.from("event_people").select("*").eq("event_id", event.id).order("created_at"),
        supabase.from("attendees").select("*").eq("event_id", event.id).order("created_at"),
      ]);
      setPeople(pp.data ?? []);
      setAttendees(at.data ?? []);
    }
    setLoading(false);
  }, [event.id, p3bReady]);
  useEffect(() => { load(); }, [load]);

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault(); if (!personForm.name) return;
    await supabase.from("event_people").insert({ event_id: event.id, name: personForm.name, role: personForm.role as any, organisation: personForm.organisation || null });
    setPersonForm({ name: "", role: "guest", organisation: "" }); load();
  };
  const removePerson = async (id: string) => { await supabase.from("event_people").delete().eq("id", id); load(); };
  const toggleConfirmed = async (p: any) => { await supabase.from("event_people").update({ confirmed: !p.confirmed }).eq("id", p.id); load(); };

  const importAttendees = async (file: File) => {
    setImporting(true); setImportMsg("");
    const text = await file.text();
    const rows = parseAttendeeCSV(text);
    if (rows.length === 0) { setImportMsg("No valid rows found — expected a header row with name/email/phone/ticket columns."); setImporting(false); return; }
    const { error } = await supabase.from("attendees").insert(rows.map(r => ({ event_id: event.id, ...r })));
    setImporting(false);
    setImportMsg(error ? error.message : `Imported ${rows.length} attendees.`);
    if (!error) load();
  };
  const toggleCheckedIn = async (a: any) => {
    await supabase.from("attendees").update({ checked_in: !a.checked_in, checked_in_at: !a.checked_in ? new Date().toISOString() : null }).eq("id", a.id);
    load();
  };

  const updateStatus = async (status: string) => { await supabase.from("events").update({ status }).eq("id", event.id); onRefresh(); };

  const addCrew = async (e: React.FormEvent) => {
    e.preventDefault(); if (!crewForm.role) return;
    await supabase.from("event_crew").insert({ event_id: event.id, staff_id: crewForm.staff_id || null, role: crewForm.role, call_time: crewForm.call_time || null });
    setCrewForm({ staff_id: "", role: "", call_time: "" }); load();
  };
  const removeCrew = async (id: string) => { await supabase.from("event_crew").delete().eq("id", id); load(); };

  const addSched = async (e: React.FormEvent) => {
    e.preventDefault(); if (!schedForm.title) return;
    await supabase.from("event_schedule").insert({ event_id: event.id, title: schedForm.title, start_time: schedForm.start_time || null, end_time: schedForm.end_time || null, owner: schedForm.owner || null, sort_order: schedule.length });
    setSchedForm({ title: "", start_time: "", end_time: "", owner: "" }); load();
  };
  const removeSched = async (id: string) => { await supabase.from("event_schedule").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="flex items-center gap-1 text-[#7070A0] hover:text-white transition-colors"><ChevronRight size={14} className="rotate-180" /> Events</button>
        <ChevronRight size={13} className="text-[#3A3A5E]" />
        <span className="text-white truncate">{event.name}</span>
      </div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <PillarBadge pillar={event.pillar} />
              <span className="text-xs font-mono px-2 py-0.5 rounded-md border border-white/8 text-[#B0ADCC]">{EVENT_TYPES[event.event_type] ?? event.event_type}</span>
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{event.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onGoLive} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors">
              <Clock size={15} /> Go Live
            </button>
            <select className="text-xs bg-[#1A1A2E] border border-white/10 rounded-lg px-3 py-2 text-white" defaultValue={event.status} onChange={e => updateStatus(e.target.value)}>
              {["planning","confirmed","in_progress","completed","cancelled"].map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div><div className="text-[#7070A0] font-mono mb-1">Date</div><div className="text-white">{formatDate(event.event_date)}{event.end_date ? ` – ${formatDate(event.end_date)}` : ""}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Venue</div><div className="text-white">{[event.venue, event.city].filter(Boolean).join(", ") || "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Guests</div><div className="text-white font-mono">{event.expected_guests ?? "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Budget</div><div className="text-white font-mono">{formatNaira(Number(event.budget || 0))}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Client</div><div className="text-white">{clientName ?? "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Project</div><div className="text-white">{projectName ?? "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Event Lead</div><div className="text-white">{leadName ?? "—"}</div></div>
        </div>
        {event.brief && <p className="mt-5 pt-5 border-t border-white/6 text-sm text-[#B0ADCC]">{event.brief}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crew */}
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4"><Users size={16} className="text-[#FF4D00]" /><h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Crew & Assignments</h2><span className="text-xs font-mono text-[#7070A0]">({crew.length})</span></div>
          {loading ? <Spinner /> : crew.length === 0 ? <p className="text-sm text-[#7070A0] mb-4">No crew assigned yet.</p> : (
            <div className="space-y-2 mb-4">
              {crew.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{m.staff_id ? staffMap[m.staff_id] ?? "Unknown" : m.role}</div>
                    <div className="text-xs font-mono text-[#7070A0]">{m.role}{m.call_time ? ` · call ${m.call_time}` : ""}</div>
                  </div>
                  <button onClick={() => removeCrew(m.id)} className="p-1.5 rounded-lg hover:bg-red-400/10 text-[#7070A0] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addCrew} className="space-y-2 pt-4 border-t border-white/6">
            <select className={selectCls} value={crewForm.staff_id} onChange={e => setCrewForm(p => ({ ...p, staff_id: e.target.value }))}><option value="">Select staff (optional)…</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Role *" value={crewForm.role} onChange={e => setCrewForm(p => ({ ...p, role: e.target.value }))} />
              <input className={`${inputCls} w-28`} placeholder="Call time" value={crewForm.call_time} onChange={e => setCrewForm(p => ({ ...p, call_time: e.target.value }))} />
            </div>
            <button type="submit" disabled={!crewForm.role} className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/8 text-sm text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"><Plus size={14} /> Add Crew</button>
          </form>
        </div>

        {/* Run of Show */}
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4"><Clock size={16} className="text-[#FF4D00]" /><h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Run of Show</h2><span className="text-xs font-mono text-[#7070A0]">({schedule.length})</span></div>
          {loading ? <Spinner /> : schedule.length === 0 ? <p className="text-sm text-[#7070A0] mb-4">No schedule items yet.</p> : (
            <div className="space-y-2 mb-4">
              {schedule.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                  <div className="text-xs font-mono text-[#FF4D00] w-24 flex-shrink-0">{s.start_time || "—"}{s.end_time ? `–${s.end_time}` : ""}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{s.title}</div>
                    {s.owner && <div className="text-xs font-mono text-[#7070A0]">{s.owner}</div>}
                  </div>
                  <button onClick={() => removeSched(s.id)} className="p-1.5 rounded-lg hover:bg-red-400/10 text-[#7070A0] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addSched} className="space-y-2 pt-4 border-t border-white/6">
            <input className={inputCls} placeholder="Segment title *" value={schedForm.title} onChange={e => setSchedForm(p => ({ ...p, title: e.target.value }))} />
            <div className="flex gap-2">
              <input className={`${inputCls} w-24`} placeholder="Start" value={schedForm.start_time} onChange={e => setSchedForm(p => ({ ...p, start_time: e.target.value }))} />
              <input className={`${inputCls} w-24`} placeholder="End" value={schedForm.end_time} onChange={e => setSchedForm(p => ({ ...p, end_time: e.target.value }))} />
              <input className={inputCls} placeholder="Owner" value={schedForm.owner} onChange={e => setSchedForm(p => ({ ...p, owner: e.target.value }))} />
            </div>
            <button type="submit" disabled={!schedForm.title} className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/8 text-sm text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"><Plus size={14} /> Add Segment</button>
          </form>
        </div>
      </div>

      {!p3bReady ? <P3bSetupBanner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Speakers & Guests */}
          <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4"><UserSquare2 size={16} className="text-[#FF4D00]" /><h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Speakers &amp; Guests</h2><span className="text-xs font-mono text-[#7070A0]">({people.length})</span></div>
            {loading ? <Spinner /> : people.length === 0 ? <p className="text-sm text-[#7070A0] mb-4">No speakers or guests added yet.</p> : (
              <div className="space-y-2 mb-4">
                {people.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                    <button onClick={() => toggleConfirmed(p)} title="Click to toggle confirmed"
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${p.confirmed ? "bg-emerald-400 border-emerald-400" : "border-white/20"}`}>
                      {p.confirmed && <span className="text-white text-[9px]">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{p.name}</div>
                      <div className="text-xs font-mono text-[#7070A0]">{EVENT_PERSON_ROLE_LABELS[p.role] ?? p.role}{p.organisation ? ` · ${p.organisation}` : ""}</div>
                    </div>
                    <button onClick={() => removePerson(p.id)} className="p-1.5 rounded-lg hover:bg-red-400/10 text-[#7070A0] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addPerson} className="space-y-2 pt-4 border-t border-white/6">
              <input className={inputCls} placeholder="Name *" value={personForm.name} onChange={e => setPersonForm(p => ({ ...p, name: e.target.value }))} />
              <div className="flex gap-2">
                <select className={selectCls} value={personForm.role} onChange={e => setPersonForm(p => ({ ...p, role: e.target.value }))}>
                  {Object.entries(EVENT_PERSON_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input className={inputCls} placeholder="Organisation" value={personForm.organisation} onChange={e => setPersonForm(p => ({ ...p, organisation: e.target.value }))} />
              </div>
              <button type="submit" disabled={!personForm.name} className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/8 text-sm text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"><Plus size={14} /> Add Person</button>
            </form>
          </div>

          {/* Attendees */}
          <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-[#FF4D00]" /><h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Attendees</h2>
              <span className="text-xs font-mono text-[#7070A0]">({attendees.filter((a: any) => a.checked_in).length}/{attendees.length} checked in)</span>
            </div>
            <label className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border border-dashed border-white/10 text-xs text-[#7070A0] hover:border-white/20 hover:text-white transition-colors cursor-pointer w-fit">
              <input type="file" accept=".csv,text/csv" className="hidden" disabled={importing}
                onChange={e => { const f = e.target.files?.[0]; if (f) importAttendees(f); e.target.value = ""; }} />
              {importing ? <Spinner /> : <Database size={13} />} Import CSV (name, email, phone, ticket_type)
            </label>
            {importMsg && <p className="text-xs text-[#7070A0] mb-4">{importMsg}</p>}
            {loading ? <Spinner /> : attendees.length === 0 ? <p className="text-sm text-[#7070A0]">No attendees yet — import a registration list above.</p> : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attendees.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                    <button onClick={() => toggleCheckedIn(a)} title="Click to toggle check-in"
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${a.checked_in ? "bg-emerald-400 border-emerald-400" : "border-white/20"}`}>
                      {a.checked_in && <span className="text-white text-[9px]">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{a.name}</div>
                      <div className="text-xs font-mono text-[#7070A0] truncate">{[a.email, a.ticket_type].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Event Live (day-of mobile run-of-show) ────────────────────────────────────

const EventLivePage = ({ event, onExit }: { event: any; onExit: () => void }) => {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycling, setCycling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("event_schedule").select("*").eq("event_id", event.id).order("sort_order").order("start_time");
    setSchedule(data ?? []);
    setLoading(false);
  }, [event.id]);
  useEffect(() => { load(); }, [load]);

  const LIVE_CYCLE: Record<string, string> = { pending: "live", live: "done", done: "pending" };
  const cycle = async (item: any) => {
    setCycling(item.id);
    await supabase.from("event_schedule").update({ status: LIVE_CYCLE[item.status ?? "pending"] ?? "live" }).eq("id", item.id);
    await load();
    setCycling(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#08080F] flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-white/8">
        <div className="min-w-0">
          <div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest">Live Run of Show</div>
          <h1 className="text-lg font-bold text-white truncate" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{event.name}</h1>
        </div>
        <button onClick={onExit} className="flex-shrink-0 p-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors"><X size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : schedule.length === 0 ? (
          <p className="text-center text-sm text-[#7070A0] py-20">No run-of-show segments yet — add them from the event's detail page.</p>
        ) : (
          schedule.map((s: any) => {
            const status = s.status ?? "pending";
            return (
              <button key={s.id} onClick={() => cycle(s)} disabled={cycling === s.id}
                className={`w-full text-left p-5 rounded-2xl border transition-all ${
                  status === "live" ? "bg-[#FF4D00]/10 border-[#FF4D00]/40" :
                  status === "done" ? "bg-white/2 border-white/6 opacity-50" :
                  "bg-[#10101C] border-white/8"
                }`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-mono text-[#FF4D00]">{s.start_time || "—"}{s.end_time ? `–${s.end_time}` : ""}</span>
                  <span className={`text-xs font-mono uppercase tracking-widest px-2 py-1 rounded-md ${
                    status === "live" ? "bg-[#FF4D00] text-white" : status === "done" ? "text-emerald-400" : "text-[#7070A0]"
                  }`}>{status === "live" ? "● Live now" : status === "done" ? "✓ Done" : "Tap to start"}</span>
                </div>
                <div className={`text-lg font-semibold ${status === "done" ? "line-through text-[#7070A0]" : "text-white"}`}>{s.title}</div>
                {s.owner && <div className="text-sm text-[#7070A0] mt-1">{s.owner}</div>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Phase 4 Migration SQL ────────────────────────────────────────────────────

const MIGRATION_SQL_P4 = `-- BTE Admin Portal — Phase 4 Migration (Payroll · Purchase Orders · Vendors · Roles)
-- Run AFTER Phases 1–3. Paste into: Supabase Dashboard → SQL Editor → Run

-- Roles (UI-level RBAC): one profile row per auth user
CREATE TABLE IF NOT EXISTS profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, email text, name text, role text NOT NULL DEFAULT 'member', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles; CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$ BEGIN CREATE TYPE payment_type_enum AS ENUM ('salary','contractor_fee','freelance_fee','bonus','reimbursement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pay_schedule_enum AS ENUM ('monthly','one_off'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pay_status_enum AS ENUM ('pending','paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE po_status_enum AS ENUM ('draft','pending','approved','declined','paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS vendors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, category text, pillar pillar, contact_name text, contact_email text, contact_phone text, city text, rating int CHECK (rating BETWEEN 1 AND 5), notes text, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS vendors_updated_at ON vendors; CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE SEQUENCE IF NOT EXISTS po_seq START 1;
CREATE OR REPLACE FUNCTION generate_po_number() RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN 'BTE-PO-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('po_seq')::text, 4, '0'); END; $$;

CREATE TABLE IF NOT EXISTS purchase_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), po_number text NOT NULL UNIQUE DEFAULT generate_po_number(), vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL, project_id uuid REFERENCES projects(id) ON DELETE SET NULL, description text NOT NULL, amount numeric(14,2) NOT NULL DEFAULT 0, status po_status_enum NOT NULL DEFAULT 'draft', raised_date date NOT NULL DEFAULT CURRENT_DATE, approved_date date, payment_status pay_status_enum NOT NULL DEFAULT 'pending', payment_reference text, notes text, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS purchase_orders_updated_at ON purchase_orders; CREATE TRIGGER purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS payroll_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), staff_id uuid REFERENCES staff(id) ON DELETE SET NULL, payment_type payment_type_enum NOT NULL DEFAULT 'salary', gross_amount numeric(14,2) NOT NULL DEFAULT 0, wht_rate numeric(5,2) NOT NULL DEFAULT 0, wht_amount numeric(14,2) GENERATED ALWAYS AS (round(gross_amount * wht_rate / 100, 2)) STORED, net_amount numeric(14,2) GENERATED ALWAYS AS (gross_amount - round(gross_amount * wht_rate / 100, 2)) STORED, schedule pay_schedule_enum NOT NULL DEFAULT 'monthly', period_month date NOT NULL, payment_status pay_status_enum NOT NULL DEFAULT 'pending', payment_date date, payment_reference text, notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TRIGGER IF EXISTS payroll_entries_updated_at ON payroll_entries; CREATE TRIGGER payroll_entries_updated_at BEFORE UPDATE ON payroll_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS project_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE, role_on_project text, allocation_pct int CHECK (allocation_pct BETWEEN 0 AND 100), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id, staff_id));

CREATE TABLE IF NOT EXISTS project_vendors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE, engagement_notes text, debrief_notes text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id, vendor_id));

CREATE OR REPLACE VIEW v_staff_load AS
SELECT s.id AS staff_id, s.name, s.pillar, COUNT(pa.id) AS active_assignments, COALESCE(SUM(pa.allocation_pct),0) AS total_allocation
FROM staff s LEFT JOIN project_assignments pa ON pa.staff_id = s.id LEFT JOIN projects p ON p.id = pa.project_id AND p.archived_at IS NULL AND p.status <> 'complete'
WHERE s.active = true GROUP BY s.id, s.name, s.pillar;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE vendors ENABLE ROW LEVEL SECURITY; ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY; ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY; ALTER TABLE project_vendors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "auth_all_profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_vendors" ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_purchase_orders" ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_payroll_entries" ON payroll_entries FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_project_assignments" ON project_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "auth_all_project_vendors" ON project_vendors FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO vendors (name, category, city, contact_phone, rating) VALUES
('Zenith Sounds & Lighting','AV & Staging','Lagos','+234 803 000 0001',5),
('Eventful NG Rentals','Furniture & Rentals','Lagos','+234 803 000 0002',4),
('Bespoke Catering Co.','Catering','Abuja','+234 803 000 0003',5),
('PixelFrame Studios','Photography & Video','Abuja','+234 803 000 0004',4),
('Stagecraft Productions','Stage & Set Build','Lagos','+234 803 000 0005',4),
('Naija Print Hub','Print & Signage','Abuja','+234 803 000 0006',3),
('SecureGuard Services','Security','Lagos','+234 803 000 0007',4),
('SwiftMove Logistics','Logistics & Transport','Abuja','+234 803 000 0008',4),
('Glow Decor & Florals','Decor','Lagos','+234 803 000 0009',5),
('PowerGen Rentals','Power & Generators','Abuja','+234 803 000 0010',4)
ON CONFLICT DO NOTHING;`;

// ─── Phase 4b Migration SQL (RLS hardening) ────────────────────────────────────
// Run AFTER Phase 4 above. Replaces "any authenticated user, full access" policies on
// finance/payroll/vendor tables with policies that actually check profiles.role — the
// Role/PAGE_ACCESS system in the UI only hides nav items today; the database itself
// still allows any signed-in user to read/write payroll, revenue, invoices, etc. via
// the Supabase API directly. This closes that gap for the coarse-grained access the
// UI already implies (founder+ops_lead for finance/vendors/targets, founder-only for
// payroll). It intentionally does NOT implement the PRD §8 row-level nuances ("team
// lead: own pillar only", "member: own tasks only") — those need founder sign-off
// first per the PRD's own process, so Phase 1–3 tables and `projects`/`tasks` keep
// their existing "any authenticated user" policies until that's decided.
const MIGRATION_SQL_P4_SECURITY = `-- BTE Admin Portal — Phase 4b Migration (Role-aware RLS)
-- Run AFTER Phase 4. Paste into: Supabase Dashboard → SQL Editor → Run

CREATE OR REPLACE FUNCTION current_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Finance & Targets — founder + ops_lead only
DROP POLICY IF EXISTS "auth_all_revenue_entries" ON revenue_entries;
CREATE POLICY "role_revenue_entries" ON revenue_entries FOR ALL TO authenticated USING (current_role() IN ('founder','ops_lead')) WITH CHECK (current_role() IN ('founder','ops_lead'));
DROP POLICY IF EXISTS "auth_all_cost_entries" ON cost_entries;
CREATE POLICY "role_cost_entries" ON cost_entries FOR ALL TO authenticated USING (current_role() IN ('founder','ops_lead')) WITH CHECK (current_role() IN ('founder','ops_lead'));
DROP POLICY IF EXISTS "auth_all_invoices" ON invoices;
CREATE POLICY "role_invoices" ON invoices FOR ALL TO authenticated USING (current_role() IN ('founder','ops_lead')) WITH CHECK (current_role() IN ('founder','ops_lead'));
DROP POLICY IF EXISTS "auth_all_invoice_line_items" ON invoice_line_items;
CREATE POLICY "role_invoice_line_items" ON invoice_line_items FOR ALL TO authenticated USING (current_role() IN ('founder','ops_lead')) WITH CHECK (current_role() IN ('founder','ops_lead'));
DROP POLICY IF EXISTS "auth_all_quotations" ON quotations;
CREATE POLICY "role_quotations" ON quotations FOR ALL TO authenticated USING (current_role() IN ('founder','ops_lead')) WITH CHECK (current_role() IN ('founder','ops_lead'));
DROP POLICY IF EXISTS "auth_all_targets" ON targets;
CREATE POLICY "role_targets" ON targets FOR ALL TO authenticated USING (current_role() IN ('founder','ops_lead')) WITH CHECK (current_role() IN ('founder','ops_lead'));

-- Vendors & Purchase Orders — founder + ops_lead only
DROP POLICY IF EXISTS "auth_all_vendors" ON vendors;
CREATE POLICY "role_vendors" ON vendors FOR ALL TO authenticated USING (current_role() IN ('founder','ops_lead')) WITH CHECK (current_role() IN ('founder','ops_lead'));
DROP POLICY IF EXISTS "auth_all_purchase_orders" ON purchase_orders;
CREATE POLICY "role_purchase_orders" ON purchase_orders FOR ALL TO authenticated USING (current_role() IN ('founder','ops_lead')) WITH CHECK (current_role() IN ('founder','ops_lead'));

-- Payroll — founder only
DROP POLICY IF EXISTS "auth_all_payroll_entries" ON payroll_entries;
CREATE POLICY "role_payroll_entries" ON payroll_entries FOR ALL TO authenticated USING (current_role() = 'founder') WITH CHECK (current_role() = 'founder');

-- Profiles — everyone can read (needed for role bootstrap + team list), anyone may
-- insert only their own row (first-sign-in bootstrap), but only founder may change
-- anyone's role (blocks a member from self-promoting via a direct API call).
DROP POLICY IF EXISTS "auth_all_profiles" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_founder_or_self_noop" ON profiles FOR UPDATE TO authenticated
  USING (current_role() = 'founder' OR id = auth.uid())
  WITH CHECK (current_role() = 'founder' OR (id = auth.uid() AND role = current_role()));`;

const P4SecurityBanner = () => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(MIGRATION_SQL_P4_SECURITY); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="bg-[#10101C] border border-red-400/20 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Security: tighten database access by role</h3>
          <p className="text-sm text-[#7070A0]">Today, any signed-in team member can read/write finance and payroll data directly via the Supabase API, regardless of their assigned role here — the role system only hides navigation in this UI. Run this once in your <a href="https://supabase.com/dashboard/project/zsgmzknzzlorneacmnzb/sql/new" target="_blank" rel="noreferrer" className="text-[#FF4D00] underline">Supabase SQL Editor</a> to enforce it at the database level too.</p>
        </div>
      </div>
      <div className="relative">
        <pre className="text-xs font-mono text-[#7070A0] bg-black/30 rounded-xl p-4 overflow-auto max-h-48 whitespace-pre-wrap break-all">{MIGRATION_SQL_P4_SECURITY}</pre>
        <button onClick={copy} className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF4D00] text-white text-xs font-medium hover:bg-[#E04400] transition-colors">
          {copied ? <CheckCheck size={13} /> : <Database size={13} />}{copied ? "Copied!" : "Copy SQL"}
        </button>
      </div>
    </div>
  );
};

const P4SetupBanner = () => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(MIGRATION_SQL_P4); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="bg-[#10101C] border border-amber-400/20 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Phase 4 database not set up</h3>
          <p className="text-sm text-[#7070A0]">Copy the SQL below and run it in your <a href="https://supabase.com/dashboard/project/zsgmzknzzlorneacmnzb/sql/new" target="_blank" rel="noreferrer" className="text-[#FF4D00] underline">Supabase SQL Editor</a>, then refresh.</p>
        </div>
      </div>
      <div className="relative">
        <pre className="text-xs font-mono text-[#7070A0] bg-black/30 rounded-xl p-4 overflow-auto max-h-48 whitespace-pre-wrap break-all">{MIGRATION_SQL_P4}</pre>
        <button onClick={copy} className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF4D00] text-white text-xs font-medium hover:bg-[#E04400] transition-colors">
          {copied ? <CheckCheck size={13} /> : <Database size={13} />}{copied ? "Copied!" : "Copy SQL"}
        </button>
      </div>
      <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-[#7070A0] text-sm hover:bg-white/5 hover:text-white transition-colors">
        <RefreshCw size={14} /> Refresh after running SQL
      </button>
    </div>
  );
};

// ─── RBAC (UI-level) ──────────────────────────────────────────────────────────

type Role = "founder" | "ops_lead" | "team_lead" | "member";

const ROLE_LABELS: Record<Role, string> = {
  founder: "Founder", ops_lead: "Ops Lead", team_lead: "Team Lead", member: "Member",
};

// Which pages each role may open. Deny by default.
const PAGE_ACCESS: Record<string, Role[]> = {
  dashboard: ["founder", "ops_lead", "team_lead", "member"],
  clients:   ["founder", "ops_lead", "team_lead"],
  leads:     ["founder", "ops_lead", "team_lead"],
  projects:  ["founder", "ops_lead", "team_lead", "member"],
  events:    ["founder", "ops_lead", "team_lead", "member"],
  finance:   ["founder", "ops_lead"],
  vendors:   ["founder", "ops_lead"],
  staff:     ["founder", "ops_lead"],
  payroll:   ["founder"],
  library:   ["founder", "ops_lead", "team_lead", "member"],
  targets:   ["founder", "ops_lead"],
  settings:  ["founder", "ops_lead", "team_lead", "member"],
};

const canAccess = (role: Role, page: string) => (PAGE_ACCESS[page] ?? ["founder"]).includes(role);

const WHT_DEFAULTS: Record<string, number> = {
  core_staff: 0, contractor: 5, freelancer: 5, ace_collective: 5,
};

const NoAccess = () => (
  <EmptyState icon={AlertTriangle} title="No access" desc="Your role doesn't have permission to view this section. Contact your founder or ops lead if you need access." />
);

// ─── Payroll ──────────────────────────────────────────────────────────────────

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  salary: "Salary", contractor_fee: "Contractor Fee", freelance_fee: "Freelance Fee", bonus: "Bonus", reimbursement: "Reimbursement",
};

const NewPayrollModal = ({ staff, onClose, onSaved }: { staff: any[]; onClose: () => void; onSaved: () => void }) => {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [f, setF] = useState({ staff_id: "", payment_type: "salary", gross_amount: "", wht_rate: "0", schedule: "monthly", period_month: thisMonth, payment_status: "pending", payment_reference: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  // Auto-set WHT rate + payment type from the staff member's contract type
  const onStaff = (id: string) => {
    const m = staff.find((s: any) => s.id === id);
    const ct = m?.contract_type;
    setF(p => ({
      ...p, staff_id: id,
      wht_rate: ct ? String(WHT_DEFAULTS[ct] ?? 0) : p.wht_rate,
      payment_type: ct === "core_staff" ? "salary" : ct ? "contractor_fee" : p.payment_type,
    }));
  };

  const gross = parseFloat(f.gross_amount || "0");
  const rate = parseFloat(f.wht_rate || "0");
  const wht = Math.round(gross * rate) / 100;
  const net = gross - wht;

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const { error } = await supabase.from("payroll_entries").insert({
      staff_id: f.staff_id || null, payment_type: f.payment_type as any,
      gross_amount: gross, wht_rate: rate, schedule: f.schedule as any,
      period_month: f.period_month + "-01", payment_status: f.payment_status as any,
      payment_reference: f.payment_reference || null,
      payment_date: f.payment_status === "paid" ? new Date().toISOString().slice(0, 10) : null,
    });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="Log Payroll" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Staff / Payee *">
          <select required className={selectCls} value={f.staff_id} onChange={e => onStaff(e.target.value)}>
            <option value="">Select staff…</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name} · {CONTRACT_LABELS[s.contract_type] ?? s.contract_type}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Payment Type"><select className={selectCls} value={f.payment_type} onChange={e => set("payment_type", e.target.value)}>{Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Schedule"><select className={selectCls} value={f.schedule} onChange={e => set("schedule", e.target.value)}><option value="monthly">Monthly</option><option value="one_off">One-off</option></select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gross Amount (₦) *"><input required type="number" min="0" step="0.01" className={inputCls} placeholder="500000" value={f.gross_amount} onChange={e => set("gross_amount", e.target.value)} /></Field>
          <Field label="WHT Rate (%)"><input type="number" min="0" max="100" step="0.5" className={inputCls} value={f.wht_rate} onChange={e => set("wht_rate", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3 bg-white/2 border border-white/6 rounded-xl p-3 text-center">
          <div><div className="text-xs font-mono text-[#7070A0] mb-1">Gross</div><div className="text-sm font-mono font-semibold text-white">{formatNaira(gross)}</div></div>
          <div><div className="text-xs font-mono text-[#7070A0] mb-1">WHT</div><div className="text-sm font-mono font-semibold text-amber-400">−{formatNaira(wht)}</div></div>
          <div><div className="text-xs font-mono text-[#7070A0] mb-1">Net</div><div className="text-sm font-mono font-semibold text-emerald-400">{formatNaira(net)}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Period *"><input required type="month" className={inputCls} value={f.period_month} onChange={e => set("period_month", e.target.value)} /></Field>
          <Field label="Status"><select className={selectCls} value={f.payment_status} onChange={e => set("payment_status", e.target.value)}><option value="pending">Pending</option><option value="paid">Paid</option></select></Field>
        </div>
        <Field label="Payment Reference"><input className={inputCls} placeholder="Transfer ref / cheque no." value={f.payment_reference} onChange={e => set("payment_reference", e.target.value)} /></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Wallet size={15} />}{saving ? "Saving…" : "Log Payroll"}
        </button>
      </form>
    </Modal>
  );
};

const PayrollPage = ({ p4Ready, role, payroll, staff, loading, onNew, onRefresh }: {
  p4Ready: boolean; role: Role; payroll: any[]; staff: any[]; loading: boolean; onNew: () => void; onRefresh: () => void;
}) => {
  if (!canAccess(role, "payroll")) return <NoAccess />;
  if (!p4Ready) return (
    <div className="space-y-5">
      <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">People</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Payroll</h1></div>
      <P4SetupBanner />
    </div>
  );
  const staffMap = Object.fromEntries(staff.map((s: any) => [s.id, s.name]));
  const gross = payroll.reduce((s: number, e: any) => s + Number(e.gross_amount), 0);
  const wht = payroll.reduce((s: number, e: any) => s + Number(e.wht_amount), 0);
  const net = payroll.reduce((s: number, e: any) => s + Number(e.net_amount), 0);
  const pending = payroll.filter((e: any) => e.payment_status === "pending").length;

  const markPaid = async (id: string) => { await supabase.from("payroll_entries").update({ payment_status: "paid", payment_date: new Date().toISOString().slice(0, 10) }).eq("id", id); onRefresh(); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">People</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Payroll</h1></div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(payroll, "payroll")} title="Export CSV" className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><Download size={15} /></button>
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> Log Payroll</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Total Gross</div><div className="text-xl font-bold text-white font-mono">{formatNaira(gross)}</div></div>
        <div className="bg-[#10101C] border border-amber-400/20 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">WHT Withheld</div><div className="text-xl font-bold text-amber-400 font-mono">{formatNaira(wht)}</div></div>
        <div className="bg-[#10101C] border border-emerald-400/20 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Total Net</div><div className="text-xl font-bold text-emerald-400 font-mono">{formatNaira(net)}</div></div>
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Pending</div><div className="text-xl font-bold text-white font-mono">{pending}</div><div className="text-xs text-[#7070A0] mt-1 font-mono">awaiting payment</div></div>
      </div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl overflow-hidden">
        {loading ? <div className="flex justify-center py-20"><Spinner /></div>
        : payroll.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <p className="text-sm text-[#7070A0] mb-4">No payroll logged yet.</p>
            <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> Log First Payroll</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr className="border-b border-white/5">{["Payee","Type","Period","Gross","WHT","Net","Status",""].map(h => <th key={h} className="text-left text-xs font-mono text-[#7070A0] uppercase tracking-widest px-5 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {payroll.map((e: any) => (
                  <tr key={e.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-white">{e.staff_id ? staffMap[e.staff_id] ?? "—" : "—"}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[#B0ADCC]">{PAYMENT_TYPE_LABELS[e.payment_type] ?? e.payment_type}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[#7070A0]">{e.period_month ? new Date(e.period_month).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-5 py-3.5 text-sm font-mono text-white">{formatNaira(Number(e.gross_amount))}</td>
                    <td className="px-5 py-3.5 text-sm font-mono text-amber-400">−{formatNaira(Number(e.wht_amount))} <span className="text-[#7070A0]">({e.wht_rate}%)</span></td>
                    <td className="px-5 py-3.5 text-sm font-mono font-semibold text-emerald-400">{formatNaira(Number(e.net_amount))}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={e.payment_status} /></td>
                    <td className="px-5 py-3.5">{e.payment_status === "pending" && <button onClick={() => markPaid(e.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors">Mark Paid</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Vendors & Purchase Orders ──────────────────────────────────────────────────

const NewVendorModal = ({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState({ name: "", category: "", city: "", contact_name: "", contact_phone: "", contact_email: "", pillar: "", rating: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const { error } = await supabase.from("vendors").insert({
      name: f.name, category: f.category || null, city: f.city || null,
      contact_name: f.contact_name || null, contact_phone: f.contact_phone || null, contact_email: f.contact_email || null,
      pillar: f.pillar as any || null, rating: f.rating ? parseInt(f.rating) : null,
    });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };
  return (
    <Modal title="New Vendor" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Vendor Name *"><input required className={inputCls} placeholder="e.g. Zenith Sounds & Lighting" value={f.name} onChange={e => set("name", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><input className={inputCls} placeholder="AV, Catering…" value={f.category} onChange={e => set("category", e.target.value)} /></Field>
          <Field label="City"><input className={inputCls} placeholder="Abuja / Lagos" value={f.city} onChange={e => set("city", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact Name"><input className={inputCls} value={f.contact_name} onChange={e => set("contact_name", e.target.value)} /></Field>
          <Field label="Phone"><input className={inputCls} value={f.contact_phone} onChange={e => set("contact_phone", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><input type="email" className={inputCls} value={f.contact_email} onChange={e => set("contact_email", e.target.value)} /></Field>
          <Field label="Rating (1–5)"><input type="number" min="1" max="5" className={inputCls} value={f.rating} onChange={e => set("rating", e.target.value)} /></Field>
        </div>
        <Field label="Pillar"><select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}><option value="">— None —</option>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Truck size={15} />}{saving ? "Saving…" : "Add Vendor"}
        </button>
      </form>
    </Modal>
  );
};

const NewPOModal = ({ vendors, projects, onClose, onSaved }: { vendors: any[]; projects: any[]; onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState({ vendor_id: "", project_id: "", description: "", amount: "", status: "pending", notes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const { error } = await supabase.from("purchase_orders").insert({
      vendor_id: f.vendor_id || null, project_id: f.project_id || null,
      description: f.description, amount: parseFloat(f.amount || "0"), status: f.status as any, notes: f.notes || null,
    });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };
  return (
    <Modal title="New Purchase Order" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Vendor"><select className={selectCls} value={f.vendor_id} onChange={e => set("vendor_id", e.target.value)}><option value="">— Select vendor —</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
        <Field label="Project"><select className={selectCls} value={f.project_id} onChange={e => set("project_id", e.target.value)}><option value="">— None —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Description *"><input required className={inputCls} placeholder="What is being purchased" value={f.description} onChange={e => set("description", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₦) *"><input required type="number" min="0" step="0.01" className={inputCls} placeholder="750000" value={f.amount} onChange={e => set("amount", e.target.value)} /></Field>
          <Field label="Status"><select className={selectCls} value={f.status} onChange={e => set("status", e.target.value)}><option value="draft">Draft</option><option value="pending">Pending Approval</option><option value="approved">Approved</option></select></Field>
        </div>
        <Field label="Notes"><input className={inputCls} value={f.notes} onChange={e => set("notes", e.target.value)} /></Field>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Receipt size={15} />}{saving ? "Creating…" : "Raise PO"}
        </button>
      </form>
    </Modal>
  );
};

const VendorsPage = ({ p4Ready, role, vendors, purchaseOrders, projects, loading, onNew, onRefresh }: {
  p4Ready: boolean; role: Role; vendors: any[]; purchaseOrders: any[]; projects: any[]; loading: boolean; onNew: (t: string) => void; onRefresh: () => void;
}) => {
  const [tab, setTab] = useState<"orders" | "vendors">("orders");
  if (!canAccess(role, "vendors")) return <NoAccess />;
  if (!p4Ready) return (
    <div className="space-y-5">
      <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Finance</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Vendors &amp; POs</h1></div>
      <P4SetupBanner />
    </div>
  );
  const vendorMap = Object.fromEntries(vendors.map((v: any) => [v.id, v.name]));
  const projectMap = Object.fromEntries(projects.map((p: any) => [p.id, p.name]));
  const totalPO = purchaseOrders.reduce((s: number, po: any) => s + Number(po.amount), 0);
  const pendingPO = purchaseOrders.filter((po: any) => po.status === "pending").length;

  const setPOStatus = async (po: any, status: string) => {
    const patch: any = { status };
    if (status === "approved") patch.approved_date = new Date().toISOString().slice(0, 10);
    if (status === "paid") patch.payment_status = "paid";
    await supabase.from("purchase_orders").update(patch).eq("id", po.id); onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Finance</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Vendors &amp; POs</h1></div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(tab === "vendors" ? vendors : purchaseOrders, tab === "vendors" ? "vendors" : "purchase-orders")} title="Export CSV" className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><Download size={15} /></button>
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <button onClick={() => onNew(tab === "vendors" ? "vendor" : "po")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} />{tab === "vendors" ? "New Vendor" : "Raise PO"}</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Vendors</div><div className="text-xl font-bold text-white font-mono">{vendors.length}</div></div>
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">PO Value</div><div className="text-xl font-bold text-white font-mono">{formatNaira(totalPO)}</div></div>
        <div className="bg-[#10101C] border border-amber-400/20 rounded-2xl p-4"><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-2">Pending Approval</div><div className="text-xl font-bold text-amber-400 font-mono">{pendingPO}</div></div>
      </div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/6">
          {(["orders", "vendors"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-3.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "text-white border-[#FF4D00]" : "text-[#7070A0] border-transparent hover:text-white"}`}>
              {t === "orders" ? `Purchase Orders (${purchaseOrders.length})` : `Vendor Directory (${vendors.length})`}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-20"><Spinner /></div>
        : tab === "orders" ? (
          purchaseOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5"><p className="text-sm text-[#7070A0] mb-4">No purchase orders yet.</p><button onClick={() => onNew("po")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> Raise First PO</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead><tr className="border-b border-white/5">{["PO #","Vendor","Project","Amount","Status","Payment","Action"].map(h => <th key={h} className="text-left text-xs font-mono text-[#7070A0] uppercase tracking-widest px-5 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {purchaseOrders.map((po: any) => (
                    <tr key={po.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-sm text-[#FF4D00] font-semibold">{po.po_number}</td>
                      <td className="px-5 py-3.5 text-sm text-white">{po.vendor_id ? vendorMap[po.vendor_id] ?? "—" : "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-[#7070A0]">{po.project_id ? projectMap[po.project_id] ?? "—" : "—"}</td>
                      <td className="px-5 py-3.5 text-sm font-mono font-semibold text-white">{formatNaira(Number(po.amount))}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={po.status} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={po.payment_status} /></td>
                      <td className="px-5 py-3.5">
                        {po.status === "pending" && <button onClick={() => setPOStatus(po, "approved")} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors">Approve</button>}
                        {po.status === "approved" && po.payment_status !== "paid" && <button onClick={() => setPOStatus(po, "paid")} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 text-white border border-white/10 hover:bg-white/8 transition-colors">Mark Paid</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5"><p className="text-sm text-[#7070A0] mb-4">No vendors yet.</p><button onClick={() => onNew("vendor")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> Add Vendor</button></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {vendors.map((v: any) => (
                <div key={v.id} className="bg-white/2 border border-white/6 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-sm font-semibold text-white">{v.name}</div>
                    {v.rating && <span className="text-xs font-mono text-amber-400">{"★".repeat(v.rating)}</span>}
                  </div>
                  <div className="text-xs font-mono text-[#7070A0]">{v.category ?? "—"}{v.city ? ` · ${v.city}` : ""}</div>
                  {v.contact_phone && <div className="text-xs text-[#B0ADCC] mt-2 font-mono">{v.contact_phone}</div>}
                  {v.pillar && <div className="mt-3"><PillarBadge pillar={v.pillar} /></div>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

// ─── Settings / Team (RBAC management) ──────────────────────────────────────────

const SettingsPage = ({ role, profiles, currentUserId, p4Ready, onRefresh }: {
  role: Role; profiles: any[]; currentUserId: string; p4Ready: boolean; onRefresh: () => void;
}) => {
  const changeRole = async (id: string, newRole: string) => { await supabase.from("profiles").update({ role: newRole }).eq("id", id); onRefresh(); };
  return (
    <div className="space-y-6">
      <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Settings</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Settings</h1></div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Your Role</h2>
        <p className="text-sm text-[#7070A0] mb-3">You are signed in as <span className="text-white font-medium">{ROLE_LABELS[role]}</span>.</p>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono border border-[#FF4D00]/30 bg-[#FF4D00]/10 text-[#FF4D00]">{ROLE_LABELS[role]}</span>
      </div>

      {role === "founder" && p4Ready && <P4SecurityBanner />}

      {role === "founder" && (
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Team & Roles</h2>
          <p className="text-sm text-[#7070A0] mb-4">Team members appear here after their first sign-in. Assign each person a role to control what they can access.</p>
          {!p4Ready ? <p className="text-sm text-amber-400">Run the Phase 4 migration to enable role management.</p>
          : profiles.length === 0 ? <p className="text-sm text-[#7070A0]">No team members yet.</p>
          : (
            <div className="space-y-2">
              {profiles.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#A855F7] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{(p.name || p.email || "?").slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{p.name || p.email || "Unknown"}</div><div className="text-xs font-mono text-[#7070A0] truncate">{p.email}</div></div>
                  {p.id === currentUserId ? <span className="text-xs font-mono text-[#7070A0]">You</span>
                  : <select className="text-xs bg-[#1A1A2E] border border-white/10 rounded-lg px-3 py-1.5 text-white" defaultValue={p.role} onChange={e => changeRole(p.id, e.target.value)}>
                      {(Object.keys(ROLE_LABELS) as Role[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#16162A] border border-white/10 rounded-xl p-3 text-xs shadow-xl">
      <div className="text-[#7070A0] font-mono mb-2">{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ color: p.fill }} className="font-mono">{p.name}: {formatNaira(p.value)}</div>)}
    </div>
  );
};

const StatCard = ({ label, value, sub, icon: Icon, trend, trendLabel }: { label: string; value: string; sub?: string; icon: React.ElementType; trend?: "up" | "down" | "neutral"; trendLabel?: string }) => (
  <div className="bg-[#10101C] border border-white/6 rounded-2xl p-5 hover:border-white/10 transition-colors">
    <div className="flex items-start justify-between mb-4">
      <span className="text-xs font-mono text-[#7070A0] uppercase tracking-widest">{label}</span>
      <Icon size={15} className="text-[#7070A0]" />
    </div>
    <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{value}</div>
    {sub && <div className="text-xs text-[#7070A0] mt-1">{sub}</div>}
    {trendLabel && (
      <div className={`flex items-center gap-1 mt-3 text-xs font-mono ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-[#7070A0]"}`}>
        {trend === "up" && <ArrowUpRight size={11} />}
        {trend === "down" && <ArrowDownRight size={11} />}
        {trendLabel}
      </div>
    )}
  </div>
);

const Dashboard = ({ clients, projects, leads, tasks, revenueEntries, costEntries, invoices, targets, p2Ready }: {
  clients: any[]; projects: any[]; leads: any[]; tasks: any[];
  revenueEntries: any[]; costEntries: any[]; invoices: any[]; targets: any[];
  p2Ready: boolean;
}) => {
  const active = projects.filter(p => p.status !== "complete" && !p.archived_at);
  const flagged = active.filter(p => p.status === "at_risk" || p.status === "delayed");
  const openLeads = leads.filter(l => !["won", "lost"].includes(l.stage));
  const pipeline = openLeads.reduce((a: number, l: any) => a + (l.estimated_value ?? 0), 0);
  const upcoming = tasks.filter((t: any) => t.status !== "done" && t.due_date && daysUntil(t.due_date) <= 14)
    .sort((a: any, b: any) => daysUntil(a.due_date) - daysUntil(b.due_date));

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRev = revenueEntries.filter((e: any) => e.entry_month?.slice(0,7) === thisMonth).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const monthCost = costEntries.filter((e: any) => e.entry_month?.slice(0,7) === thisMonth).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const outstanding = invoices.filter((i: any) => ["sent","overdue"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.total), 0);

  const annualRevTarget = targets.find((t: any) => t.metric === "revenue" && !t.month && !t.pillar && t.year === new Date().getFullYear());
  const ytdRev = revenueEntries.filter((e: any) => new Date(e.entry_month).getFullYear() === new Date().getFullYear()).reduce((s: number, e: any) => s + Number(e.amount), 0);

  // Build chart data from real entries, grouped by month
  const buildChartData = () => {
    const map: Record<string, { month: string; Revenue: number; Costs: number }> = {};
    revenueEntries.forEach((e: any) => {
      const key = e.entry_month?.slice(0,7) ?? "";
      if (!key) return;
      const label = new Date(e.entry_month).toLocaleDateString("en-GB", { month: "short" });
      if (!map[key]) map[key] = { month: label, Revenue: 0, Costs: 0 };
      map[key].Revenue += Number(e.amount);
    });
    costEntries.forEach((e: any) => {
      const key = e.entry_month?.slice(0,7) ?? "";
      if (!key) return;
      const label = new Date(e.entry_month).toLocaleDateString("en-GB", { month: "short" });
      if (!map[key]) map[key] = { month: label, Revenue: 0, Costs: 0 };
      map[key].Costs += Number(e.amount);
    });
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).slice(-6).map(([,v]) => v);
  };

  const chartData = buildChartData();
  const showMock = !p2Ready || chartData.length === 0;
  const MOCK_PNL = [
    { month: "Mar", Revenue: 12500000, Costs: 7800000 },
    { month: "Apr", Revenue: 9800000, Costs: 6200000 },
    { month: "May", Revenue: 15200000, Costs: 9100000 },
    { month: "Jun", Revenue: 11400000, Costs: 7600000 },
    { month: "Jul", Revenue: 18700000, Costs: 11200000 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Command Centre</div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h1>
        </div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs font-mono text-[#7070A0]">Live</span></div>
      </div>

      {flagged.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300"><span className="font-medium">{flagged.length} project{flagged.length > 1 ? "s" : ""} flagged</span> — {flagged.map((p: any) => p.name).join(", ")}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {p2Ready ? (
          <>
            <StatCard label="Revenue (Month)" value={formatNaira(monthRev)} sub={annualRevTarget ? `${Math.round((ytdRev / annualRevTarget.target_value) * 100)}% of annual target` : "No target set"} icon={DollarSign} trend={monthRev > monthCost ? "up" : "down"} trendLabel={`${formatNaira(monthRev - monthCost)} margin`} />
            <StatCard label="Costs (Month)" value={formatNaira(monthCost)} sub={`${costEntries.filter((e: any) => e.entry_month?.slice(0, 7) === thisMonth && !e.paid).length} unpaid`} icon={Receipt} trend="neutral" trendLabel="This month" />
            <StatCard label="Outstanding" value={formatNaira(outstanding)} sub={`${invoices.filter((i: any) => i.status === "overdue").length} overdue invoices`} icon={BarChart3} trend={invoices.filter((i: any) => i.status === "overdue").length > 0 ? "down" : "neutral"} trendLabel="Sent & unpaid" />
            <StatCard label="Active Projects" value={String(active.length)} sub={flagged.length > 0 ? `${flagged.length} flagged` : "All on track"} icon={FolderOpen} trend={flagged.length > 0 ? "down" : "up"} trendLabel={flagged.length > 0 ? `${flagged.length} need attention` : "On track"} />
            <StatCard label="Open Pipeline" value={formatNaira(pipeline)} sub={`${openLeads.length} open leads`} icon={TrendingUp} trend="up" trendLabel={`${leads.filter((l: any) => l.stage === "negotiation").length} in negotiation`} />
            <StatCard label="Tasks Due (7d)" value={String(upcoming.filter((t: any) => daysUntil(t.due_date) <= 7).length)} sub="Next 7 days" icon={Clock} trend={upcoming.filter((t: any) => daysUntil(t.due_date) <= 0).length > 0 ? "down" : "neutral"} trendLabel={`${upcoming.filter((t: any) => daysUntil(t.due_date) <= 0).length} overdue`} />
          </>
        ) : (
          <>
            <StatCard label="Active Clients" value={String(clients.filter((c: any) => c.status === "active").length)} sub={`${clients.length} total`} icon={Building2} trend="neutral" trendLabel={`${clients.filter((c: any) => c.status === "prospect").length} prospects`} />
            <StatCard label="Active Projects" value={String(active.length)} sub={flagged.length > 0 ? `${flagged.length} flagged` : "All on track"} icon={FolderOpen} trend={flagged.length > 0 ? "down" : "up"} trendLabel={flagged.length > 0 ? `${flagged.length} need attention` : "On track"} />
            <StatCard label="Open Pipeline" value={formatNaira(pipeline)} sub={`${openLeads.length} open leads`} icon={TrendingUp} trend="up" trendLabel={`${leads.filter((l: any) => l.stage === "negotiation").length} in negotiation`} />
            <StatCard label="Tasks Due (7d)" value={String(upcoming.filter((t: any) => daysUntil(t.due_date) <= 7).length)} sub="Next 7 days" icon={Clock} trend={upcoming.filter((t: any) => daysUntil(t.due_date) <= 0).length > 0 ? "down" : "neutral"} trendLabel={`${upcoming.filter((t: any) => daysUntil(t.due_date) <= 0).length} overdue`} />
            <StatCard label="Leads Won" value={String(leads.filter((l: any) => l.stage === "won").length)} sub={`of ${leads.length} total`} icon={CheckCircle2} trend="up" trendLabel="Conversion tracking" />
            <StatCard label="Staff Active" value={String(17)} sub="17 seeded" icon={UserSquare2} trend="neutral" trendLabel="See Staff page" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#10101C] border border-white/6 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest">Revenue vs. Costs</div>
              <div className="text-sm font-medium text-white mt-1">{showMock ? "Sample data — log real entries in Finance" : "Live data"}</div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" />Revenue</span>
              <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-400" />Costs</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={showMock ? MOCK_PNL : chartData} barGap={4}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#7070A0", fontFamily: "JetBrains Mono, monospace" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="Revenue" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Costs" fill="#EF4444" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-5">
          <div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-4">Upcoming Tasks</div>
          {upcoming.length === 0
            ? <p className="text-sm text-[#7070A0]">No tasks due soon.</p>
            : <div className="space-y-3">{upcoming.slice(0, 6).map((t: any) => {
                const d = daysUntil(t.due_date);
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d <= 0 ? "bg-red-400" : d <= 3 ? "bg-amber-400" : "bg-blue-400"}`} />
                    <span className="text-sm text-white truncate flex-1">{t.title}</span>
                    <span className={`text-xs font-mono flex-shrink-0 ${d <= 0 ? "text-red-400" : d <= 3 ? "text-amber-400" : "text-[#7070A0]"}`}>{d <= 0 ? "Overdue" : d === 1 ? "Tomorrow" : `${d}d`}</span>
                  </div>
                );
              })}</div>
          }
        </div>
      </div>

      {active.length > 0 && (
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-5">
          <div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-4">Active Projects</div>
          <div className="space-y-3">
            {active.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white truncate">{p.name}</span>
                    {(p.status === "at_risk" || p.status === "delayed") && <AlertTriangle size={13} className={p.status === "delayed" ? "text-red-400" : "text-amber-400"} />}
                  </div>
                  <div className="text-xs font-mono text-[#7070A0] mt-0.5">{formatDate(p.deadline)}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Clients Page ─────────────────────────────────────────────────────────────

const ClientsPage = ({ clients, loading, onNew, onRefresh, onSelect }: { clients: any[]; loading: boolean; onNew: () => void; onRefresh: () => void; onSelect: (c: any) => void }) => {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? clients : clients.filter((c: any) => c.status === filter);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Clients</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Client Directory</h1></div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(clients, "clients")} title="Export CSV" className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><Download size={15} /></button>
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> New Client</button>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["all","active","prospect","inactive"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${filter === s ? "bg-white/10 text-white" : "text-[#7070A0] hover:text-white hover:bg-white/5"}`}>
            {s === "all" ? `All (${clients.length})` : `${STATUS_CFG[s]?.label} (${clients.filter((c: any) => c.status === s).length})`}
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-20"><Spinner /></div>
        : filtered.length === 0 ? <EmptyState icon={Building2} title="No clients yet" desc="Add your first client to start tracking relationships." action={<button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> New Client</button>} />
        : (
          <div className="bg-[#10101C] border border-white/6 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-white/5">{["Client","Pillar","Contact","Status"].map(h => <th key={h} className="text-left text-xs font-mono text-[#7070A0] uppercase tracking-widest px-5 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} onClick={() => onSelect(c)} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors cursor-pointer">
                    <td className="px-5 py-4"><div className="font-medium text-white text-sm flex items-center gap-1.5">{c.name}<ChevronRight size={13} className="text-[#3A3A5E]" /></div><div className="text-xs text-[#7070A0] capitalize mt-0.5">{c.client_type}</div></td>
                    <td className="px-5 py-4"><PillarBadge pillar={c.pillar} /></td>
                    <td className="px-5 py-4"><div className="text-sm text-[#B0ADCC]">{c.point_of_contact ?? "—"}</div>{c.contact_email && <div className="text-xs text-[#7070A0] flex items-center gap-1 mt-0.5"><Mail size={10} />{c.contact_email}</div>}</td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
};

// ─── Leads Page ───────────────────────────────────────────────────────────────

const LEAD_STAGES = ["new","contacted","proposal_sent","negotiation","won","lost"] as const;

const LeadsPage = ({ leads, loading, onNew, onRefresh, onEditLead }: { leads: any[]; loading: boolean; onNew: () => void; onRefresh: () => void; onEditLead: (l: any) => void }) => {
  const [view, setView] = useState<"kanban"|"list">("kanban");
  const pipeline = leads.reduce((a: number, l: any) => a + (l.estimated_value ?? 0), 0);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Pipeline</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{formatNaira(pipeline)} open</h1></div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/8 overflow-hidden">{(["kanban","list"] as const).map(v => <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-mono capitalize transition-colors ${view === v ? "bg-white/10 text-white" : "text-[#7070A0] hover:text-white"}`}>{v}</button>)}</div>
          <button onClick={() => exportCSV(leads, "leads")} title="Export CSV" className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><Download size={15} /></button>
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> Add Lead</button>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-20"><Spinner /></div>
        : leads.length === 0 ? <EmptyState icon={TrendingUp} title="No leads yet" desc="Add your first lead to start tracking your pipeline." action={<button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> Add Lead</button>} />
        : view === "kanban" ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {LEAD_STAGES.filter(s => s !== "lost").map(stage => {
              const items = leads.filter((l: any) => l.stage === stage);
              return (
                <div key={stage} className="flex-shrink-0 w-60">
                  <div className="flex items-center justify-between mb-3"><StatusBadge status={stage} /><span className="text-xs font-mono text-[#7070A0]">{items.length}</span></div>
                  <div className="space-y-3">
                    {items.map((l: any) => (
                      <div key={l.id} onClick={() => onEditLead(l)} className="bg-[#10101C] border border-white/6 rounded-xl p-4 hover:border-[#FF4D00]/30 transition-colors cursor-pointer">
                        <div className="font-medium text-white text-sm">{l.name}</div>
                        <div className="text-xs text-[#7070A0] mt-0.5">{l.organisation ?? "—"}</div>
                        {l.estimated_value && <div className="mt-2 font-mono text-sm font-semibold text-white">{formatNaira(l.estimated_value)}</div>}
                        <div className="mt-2"><PillarBadge pillar={l.pillar} /></div>
                        {l.next_action_date && <div className="mt-2 flex items-center gap-1 text-xs text-[#7070A0]"><Clock size={10} />{formatDate(l.next_action_date)}</div>}
                      </div>
                    ))}
                    {items.length === 0 && <div className="border-2 border-dashed border-white/6 rounded-xl p-4 text-center text-xs text-[#7070A0]">Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#10101C] border border-white/6 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-white/5">{["Lead","Pillar","Value","Stage","Next Action"].map(h => <th key={h} className="text-left text-xs font-mono text-[#7070A0] uppercase tracking-widest px-5 py-3">{h}</th>)}</tr></thead>
              <tbody>{leads.map((l: any) => (
                <tr key={l.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors cursor-pointer">
                  <td className="px-5 py-4"><div className="font-medium text-white text-sm">{l.name}</div><div className="text-xs text-[#7070A0]">{l.organisation ?? "—"}</div></td>
                  <td className="px-5 py-4"><PillarBadge pillar={l.pillar} /></td>
                  <td className="px-5 py-4 font-mono text-sm text-white">{l.estimated_value ? formatNaira(l.estimated_value) : "—"}</td>
                  <td className="px-5 py-4"><StatusBadge status={l.stage} /></td>
                  <td className="px-5 py-4 text-xs text-[#7070A0]">{l.next_action ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )
      }
    </div>
  );
};

// ─── Projects Page ────────────────────────────────────────────────────────────

const ProjectsPage = ({ projects, clients, staff, loading, onNew, onRefresh, onSelect }: { projects: any[]; clients: any[]; staff: any[]; loading: boolean; onNew: () => void; onRefresh: () => void; onSelect: (p: any) => void }) => {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? projects : projects.filter((p: any) => p.status === filter);
  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c.name]));
  const staffMap = Object.fromEntries(staff.map((s: any) => [s.id, s.name]));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Projects</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>All Projects</h1></div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(projects, "projects")} title="Export CSV" className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><Download size={15} /></button>
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> New Project</button>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["all","in_progress","at_risk","delayed","not_started","complete"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${filter === s ? "bg-white/10 text-white" : "text-[#7070A0] hover:text-white hover:bg-white/5"}`}>
            {s === "all" ? `All (${projects.length})` : STATUS_CFG[s]?.label}
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-20"><Spinner /></div>
        : filtered.length === 0 ? <EmptyState icon={FolderOpen} title="No projects here" desc="Create a project to start tracking work, budgets, and deadlines." action={<button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors mx-auto"><Plus size={15} /> New Project</button>} />
        : (
          <div className="space-y-3">
            {filtered.map((p: any) => {
              const isWarning = p.status === "at_risk" || p.status === "delayed";
              const d = daysUntil(p.deadline);
              return (
                <div key={p.id} onClick={() => onSelect(p)} className={`bg-[#10101C] border rounded-2xl p-5 hover:border-white/10 transition-all cursor-pointer ${isWarning ? "border-amber-400/20" : "border-white/6"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{p.name}</span>
                        {p.is_event && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">Event</span>}
                        {isWarning && <AlertTriangle size={13} className={p.status === "delayed" ? "text-red-400" : "text-amber-400"} />}
                      </div>
                      <div className="text-xs text-[#7070A0] mt-1">{p.client_id ? (clientMap[p.client_id] ?? "Unknown") : "Internal"}{p.project_lead_id ? ` · ${staffMap[p.project_lead_id] ?? ""}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0"><StatusBadge status={p.status} /><PillarBadge pillar={p.pillar} /></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                    <div><div className="text-[#7070A0] font-mono mb-1">Budget</div><div className="font-mono text-white">{p.budget ? formatNaira(p.budget) : "—"}</div></div>
                    <div><div className="text-[#7070A0] font-mono mb-1">Deadline</div><div className={`font-mono ${d <= 0 ? "text-red-400" : d <= 7 ? "text-amber-400" : "text-white"}`}>{formatDate(p.deadline)}</div></div>
                    <div><div className="text-[#7070A0] font-mono mb-1">Days Left</div><div className={`font-mono ${d <= 0 ? "text-red-400" : d <= 7 ? "text-amber-400" : "text-emerald-400"}`}>{p.deadline ? (d <= 0 ? "Overdue" : `${d}d`) : "—"}</div></div>
                    <div><div className="text-[#7070A0] font-mono mb-1">Type</div><div className="font-mono text-[#B0ADCC]">{p.is_event ? "Event" : "Project"}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
};

// ─── Staff Page ───────────────────────────────────────────────────────────────

const CONTRACT_LABELS: Record<string, string> = { core_staff: "Core Staff", contractor: "Contractor", freelancer: "Freelancer", ace_collective: "ACE Collective" };

const StaffPage = ({ staff, loading, onSelect }: { staff: any[]; loading: boolean; onSelect: (m: any) => void }) => (
  <div className="space-y-5">
    <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">People</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Staff — {staff.filter((s: any) => s.active).length} active</h1></div>
    {loading ? <div className="flex justify-center py-20"><Spinner /></div>
      : staff.length === 0 ? <EmptyState icon={UserSquare2} title="No staff loaded" desc="Run the migration SQL in Supabase to seed 17 BTE staff members." />
      : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((m: any) => (
            <div key={m.id} onClick={() => onSelect(m)} className="bg-[#10101C] border border-white/6 rounded-2xl p-5 hover:border-white/10 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#A855F7] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {m.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                {m.capacity_pct != null && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-md border ${m.capacity_pct > 90 ? "text-red-400 bg-red-400/10 border-red-400/20" : m.capacity_pct > 70 ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"}`}>{m.capacity_pct}%</span>
                )}
              </div>
              <div className="font-semibold text-white text-sm">{m.name}</div>
              <div className="text-xs text-[#7070A0] mt-0.5">{m.role_title ?? "—"}</div>
              <div className="text-xs text-[#7070A0]">{m.team ?? "—"}</div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono px-2 py-0.5 rounded-md border border-white/8 text-[#B0ADCC]">{CONTRACT_LABELS[m.contract_type] ?? m.contract_type}</span>
                {m.pillar && <PillarBadge pillar={m.pillar} />}
              </div>
              {m.capacity_pct != null && (
                <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(m.capacity_pct, 100)}%`, background: m.capacity_pct > 90 ? "#EF4444" : m.capacity_pct > 70 ? "#F59E0B" : "#22C55E" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }
  </div>
);

// ─── Project Detail Page ──────────────────────────────────────────────────────

const TASK_CYCLE: Record<string, string> = {
  not_started: "in_progress",
  in_progress: "done",
  done: "not_started",
  blocked: "in_progress",
};

const ProjectDetailPage = ({ project, tasks, clients, staff, vendors, p4Ready, onBack, onRefresh, onAddTask }: {
  project: any; tasks: any[]; clients: any[]; staff: any[]; vendors: any[]; p4Ready: boolean;
  onBack: () => void; onRefresh: () => void; onAddTask: () => void;
}) => {
  const [cycling, setCycling] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [projectVendors, setProjectVendors] = useState<any[]>([]);
  const [loadingRel, setLoadingRel] = useState(true);
  const [assignForm, setAssignForm] = useState({ staff_id: "", role_on_project: "", allocation_pct: "" });
  const [vendorForm, setVendorForm] = useState({ vendor_id: "", engagement_notes: "", debrief_notes: "" });
  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c.name]));
  const staffMap = Object.fromEntries(staff.map((s: any) => [s.id, s.name]));
  const vendorMap = Object.fromEntries(vendors.map((v: any) => [v.id, v.name]));
  const myTasks = tasks.filter((t: any) => t.project_id === project.id);
  const done = myTasks.filter((t: any) => t.status === "done").length;
  const d = daysUntil(project.deadline);

  const loadRel = useCallback(async () => {
    if (!p4Ready) { setLoadingRel(false); return; }
    setLoadingRel(true);
    const [as, pv] = await Promise.all([
      supabase.from("project_assignments").select("*").eq("project_id", project.id).order("created_at"),
      supabase.from("project_vendors").select("*").eq("project_id", project.id).order("created_at"),
    ]);
    setAssignments(as.data ?? []);
    setProjectVendors(pv.data ?? []);
    setLoadingRel(false);
  }, [project.id, p4Ready]);
  useEffect(() => { loadRel(); }, [loadRel]);

  const cycleTask = async (task: any) => {
    setCycling(task.id);
    await supabase.from("tasks").update({ status: TASK_CYCLE[task.status] ?? "not_started" }).eq("id", task.id);
    setCycling(null);
    onRefresh();
  };

  const setProjectStatus = async (status: string) => {
    await supabase.from("projects").update({ status }).eq("id", project.id);
    setEditingStatus(false);
    onRefresh();
  };

  const addAssignment = async (e: React.FormEvent) => {
    e.preventDefault(); if (!assignForm.staff_id) return;
    await supabase.from("project_assignments").insert({
      project_id: project.id, staff_id: assignForm.staff_id,
      role_on_project: assignForm.role_on_project || null,
      allocation_pct: assignForm.allocation_pct ? parseInt(assignForm.allocation_pct, 10) : null,
    });
    setAssignForm({ staff_id: "", role_on_project: "", allocation_pct: "" }); loadRel();
  };
  const removeAssignment = async (id: string) => { await supabase.from("project_assignments").delete().eq("id", id); loadRel(); };

  const addProjectVendor = async (e: React.FormEvent) => {
    e.preventDefault(); if (!vendorForm.vendor_id) return;
    await supabase.from("project_vendors").insert({
      project_id: project.id, vendor_id: vendorForm.vendor_id,
      engagement_notes: vendorForm.engagement_notes || null,
      debrief_notes: vendorForm.debrief_notes || null,
    });
    setVendorForm({ vendor_id: "", engagement_notes: "", debrief_notes: "" }); loadRel();
  };
  const removeProjectVendor = async (id: string) => { await supabase.from("project_vendors").delete().eq("id", id); loadRel(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="flex items-center gap-1 text-[#7070A0] hover:text-white transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Projects
        </button>
        <ChevronRight size={13} className="text-[#3A3A5E]" />
        <span className="text-white truncate">{project.name}</span>
      </div>

      <div className={`bg-[#10101C] border rounded-2xl p-6 ${project.status === "at_risk" || project.status === "delayed" ? "border-amber-400/20" : "border-white/6"}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{project.name}</h1>
              {project.is_event && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">Event</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <PillarBadge pillar={project.pillar} />
              {editingStatus ? (
                <select autoFocus className="text-xs bg-[#1A1A2E] border border-white/10 rounded-lg px-2 py-1 text-white"
                  defaultValue={project.status}
                  onBlur={() => setEditingStatus(false)}
                  onChange={e => setProjectStatus(e.target.value)}>
                  {["not_started","in_progress","at_risk","delayed","complete"].map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label}</option>)}
                </select>
              ) : (
                <button onClick={() => setEditingStatus(true)} title="Click to change status"><StatusBadge status={project.status} /></button>
              )}
            </div>
          </div>
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors flex-shrink-0"><RefreshCw size={15} /></button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/5 text-xs">
          <div><div className="text-[#7070A0] font-mono mb-1">Client</div><div className="text-white">{project.client_id ? (clientMap[project.client_id] ?? "—") : "Internal"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Project Lead</div><div className="text-white">{project.project_lead_id ? (staffMap[project.project_lead_id] ?? "—") : "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Deadline</div><div className={`font-mono ${d <= 0 ? "text-red-400" : d <= 7 ? "text-amber-400" : "text-white"}`}>{formatDate(project.deadline)}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Budget</div><div className="font-mono text-white">{project.budget ? formatNaira(project.budget) : "—"}</div></div>
        </div>
        {project.notes && <p className="mt-4 text-sm text-[#B0ADCC] leading-relaxed">{project.notes}</p>}
      </div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">Tasks</span>
            <span className="text-xs font-mono text-[#7070A0]">{done}/{myTasks.length} done</span>
            {myTasks.length > 0 && (
              <div className="h-1.5 w-20 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${(done / myTasks.length) * 100}%` }} />
              </div>
            )}
          </div>
          <button onClick={onAddTask} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00] text-xs font-medium hover:bg-[#FF4D00]/20 transition-colors">
            <Plus size={13} /> Add Task
          </button>
        </div>

        {myTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <p className="text-sm text-[#7070A0] mb-4">No tasks yet. Add tasks to track work on this project.</p>
            <button onClick={onAddTask} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> Add First Task</button>
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            {myTasks.sort((a: any, b: any) => {
              const order: Record<string, number> = { blocked: 0, in_progress: 1, not_started: 2, done: 3 };
              return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            }).map((t: any) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors group">
                <button onClick={() => cycleTask(t)} disabled={cycling === t.id}
                  title="Click to cycle status"
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    t.status === "done" ? "bg-emerald-400 border-emerald-400" :
                    t.status === "in_progress" ? "border-amber-400 group-hover:bg-amber-400/20" :
                    t.status === "blocked" ? "border-red-400" : "border-white/20 group-hover:border-white/40"
                  }`}>
                  {cycling === t.id ? <Loader2 size={10} className="animate-spin text-white" /> :
                   t.status === "done" ? <span className="text-white text-[9px]">✓</span> : null}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.status === "done" ? "line-through text-[#7070A0]" : "text-white"}`}>{t.title}</div>
                  {(t.assignee_id || t.due_date) && (
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[#7070A0]">
                      {t.assignee_id && <span>{staffMap[t.assignee_id] ?? "—"}</span>}
                      {t.due_date && <span className={daysUntil(t.due_date) <= 0 && t.status !== "done" ? "text-red-400" : ""}>{formatDate(t.due_date)}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden sm:block"><StatusBadge status={t.priority} /></span>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!p4Ready ? <P4SetupBanner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Assignments */}
          <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4"><Users size={16} className="text-[#FF4D00]" /><h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Team Assignments</h2><span className="text-xs font-mono text-[#7070A0]">({assignments.length})</span></div>
            {loadingRel ? <Spinner /> : assignments.length === 0 ? <p className="text-sm text-[#7070A0] mb-4">No one assigned yet.</p> : (
              <div className="space-y-2 mb-4">
                {assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{staffMap[a.staff_id] ?? "Unknown"}</div>
                      <div className="text-xs font-mono text-[#7070A0]">{a.role_on_project || "—"}{a.allocation_pct != null ? ` · ${a.allocation_pct}%` : ""}</div>
                    </div>
                    <button onClick={() => removeAssignment(a.id)} className="p-1.5 rounded-lg hover:bg-red-400/10 text-[#7070A0] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addAssignment} className="space-y-2 pt-4 border-t border-white/6">
              <select className={selectCls} value={assignForm.staff_id} onChange={e => setAssignForm(p => ({ ...p, staff_id: e.target.value }))}><option value="">Select staff *…</option>{staff.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <div className="flex gap-2">
                <input className={inputCls} placeholder="Role on project" value={assignForm.role_on_project} onChange={e => setAssignForm(p => ({ ...p, role_on_project: e.target.value }))} />
                <input type="number" min="0" max="200" className={`${inputCls} w-28`} placeholder="Alloc %" value={assignForm.allocation_pct} onChange={e => setAssignForm(p => ({ ...p, allocation_pct: e.target.value }))} />
              </div>
              <button type="submit" disabled={!assignForm.staff_id} className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/8 text-sm text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"><Plus size={14} /> Add Assignment</button>
            </form>
          </div>

          {/* Vendors Engaged */}
          <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4"><Truck size={16} className="text-[#FF4D00]" /><h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Vendors Engaged</h2><span className="text-xs font-mono text-[#7070A0]">({projectVendors.length})</span></div>
            {loadingRel ? <Spinner /> : projectVendors.length === 0 ? <p className="text-sm text-[#7070A0] mb-4">No vendors engaged yet.</p> : (
              <div className="space-y-2 mb-4">
                {projectVendors.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{vendorMap[v.vendor_id] ?? "Unknown"}</div>
                      {v.engagement_notes && <div className="text-xs font-mono text-[#7070A0] truncate">{v.engagement_notes}</div>}
                    </div>
                    <button onClick={() => removeProjectVendor(v.id)} className="p-1.5 rounded-lg hover:bg-red-400/10 text-[#7070A0] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addProjectVendor} className="space-y-2 pt-4 border-t border-white/6">
              <select className={selectCls} value={vendorForm.vendor_id} onChange={e => setVendorForm(p => ({ ...p, vendor_id: e.target.value }))}><option value="">Select vendor *…</option>{vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
              <input className={inputCls} placeholder="Engagement notes" value={vendorForm.engagement_notes} onChange={e => setVendorForm(p => ({ ...p, engagement_notes: e.target.value }))} />
              <input className={inputCls} placeholder="Debrief notes" value={vendorForm.debrief_notes} onChange={e => setVendorForm(p => ({ ...p, debrief_notes: e.target.value }))} />
              <button type="submit" disabled={!vendorForm.vendor_id} className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/8 text-sm text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"><Plus size={14} /> Add Vendor</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Staff Detail Page ────────────────────────────────────────────────────────

const StaffDetailPage = ({ staffMember, projects, p4Ready, onBack }: {
  staffMember: any; projects: any[]; p4Ready: boolean; onBack: () => void;
}) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [staffLoad, setStaffLoad] = useState<{ active_assignments: number; total_allocation: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const projectMap = Object.fromEntries(projects.map((p: any) => [p.id, p.name]));

  useEffect(() => {
    if (!p4Ready) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      const [as, vl] = await Promise.all([
        supabase.from("project_assignments").select("*").eq("staff_id", staffMember.id).order("created_at"),
        supabase.from("v_staff_load").select("*").eq("staff_id", staffMember.id).maybeSingle(),
      ]);
      setAssignments(as.data ?? []);
      setStaffLoad(vl.data ?? null);
      setLoading(false);
    })();
  }, [staffMember.id, p4Ready]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="flex items-center gap-1 text-[#7070A0] hover:text-white transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Staff
        </button>
        <ChevronRight size={13} className="text-[#3A3A5E]" />
        <span className="text-white truncate">{staffMember.name}</span>
      </div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#A855F7] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {staffMember.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{staffMember.name}</h1>
            <div className="text-sm text-[#7070A0] mt-0.5">{staffMember.role_title ?? "—"} · {staffMember.team ?? "—"}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/5 text-xs">
          <div><div className="text-[#7070A0] font-mono mb-1">Contract</div><div className="text-white">{CONTRACT_LABELS[staffMember.contract_type] ?? staffMember.contract_type}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Pillar</div><div className="text-white">{staffMember.pillar ? <PillarBadge pillar={staffMember.pillar} /> : "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Capacity</div><div className="text-white font-mono">{staffMember.capacity_pct != null ? `${staffMember.capacity_pct}%` : "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Active</div><div className="text-white">{staffMember.active ? "Yes" : "No"}</div></div>
        </div>
      </div>

      {!p4Ready ? <P4SetupBanner /> : (
        <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen size={16} className="text-[#FF4D00]" />
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Project Load</h2>
            {staffLoad && <span className="text-xs font-mono text-[#7070A0]">{staffLoad.active_assignments} active · {staffLoad.total_allocation}% allocated</span>}
          </div>
          {loading ? <Spinner /> : assignments.length === 0 ? <p className="text-sm text-[#7070A0]">Not assigned to any projects yet — assign them from a project's detail page.</p> : (
            <div className="space-y-2">
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{projectMap[a.project_id] ?? "Unknown project"}</div>
                    <div className="text-xs font-mono text-[#7070A0]">{a.role_on_project || "—"}{a.allocation_pct != null ? ` · ${a.allocation_pct}%` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Client Detail Page ───────────────────────────────────────────────────────

const NewContractModal = ({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState({ title: "", pillar: "experiences", contract_type: "contract", value: "", start_date: "", end_date: "", status: "draft" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("contracts").insert({
      client_id: clientId, title: f.title, pillar: f.pillar as any,
      contract_type: f.contract_type as any, value: f.value ? parseFloat(f.value) : null,
      start_date: f.start_date || null, end_date: f.end_date || null, status: f.status as any,
    });
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="New Contract" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Contract Title *"><input required className={inputCls} placeholder="Sheedx Africa Summit — Full Production" value={f.title} onChange={e => set("title", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><select className={selectCls} value={f.contract_type} onChange={e => set("contract_type", e.target.value)}><option value="contract">Contract</option><option value="sow">SOW</option><option value="retainer">Retainer</option></select></Field>
          <Field label="Status"><select className={selectCls} value={f.status} onChange={e => set("status", e.target.value)}><option value="draft">Draft</option><option value="sent">Sent</option><option value="signed">Signed</option><option value="expired">Expired</option><option value="terminated">Terminated</option></select></Field>
        </div>
        <Field label="Pillar"><select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Value (₦)"><input type="number" className={inputCls} placeholder="25000000" value={f.value} onChange={e => set("value", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date"><input type="date" className={inputCls} value={f.start_date} onChange={e => set("start_date", e.target.value)} /></Field>
          <Field label="End Date"><input type="date" className={inputCls} value={f.end_date} onChange={e => set("end_date", e.target.value)} /></Field>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving ? <Spinner /> : <Plus size={15} />}{saving ? "Saving…" : "Create Contract"}
        </button>
      </form>
    </Modal>
  );
};

const ClientDetailPage = ({ client, projects, contracts, onBack, onRefresh, onNewContract }: {
  client: any; projects: any[]; contracts: any[];
  onBack: () => void; onRefresh: () => void; onNewContract: () => void;
}) => {
  const [tab, setTab] = useState<"projects" | "contracts">("projects");
  const [editStatus, setEditStatus] = useState(false);
  const myProjects = projects.filter((p: any) => p.client_id === client.id);
  const myContracts = contracts.filter((c: any) => c.client_id === client.id);

  const setClientStatus = async (status: string) => {
    await supabase.from("clients").update({ status }).eq("id", client.id);
    setEditStatus(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="flex items-center gap-1 text-[#7070A0] hover:text-white transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Clients
        </button>
        <ChevronRight size={13} className="text-[#3A3A5E]" />
        <span className="text-white truncate">{client.name}</span>
      </div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{client.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <PillarBadge pillar={client.pillar} />
              <span className="text-xs font-mono text-[#7070A0] capitalize">{client.client_type}</span>
              {editStatus ? (
                <select autoFocus className="text-xs bg-[#1A1A2E] border border-white/10 rounded-lg px-2 py-1 text-white"
                  defaultValue={client.status}
                  onBlur={() => setEditStatus(false)}
                  onChange={e => setClientStatus(e.target.value)}>
                  {["prospect","active","inactive"].map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label}</option>)}
                </select>
              ) : (
                <button onClick={() => setEditStatus(true)} title="Click to change status"><StatusBadge status={client.status} /></button>
              )}
            </div>
          </div>
          <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors flex-shrink-0"><RefreshCw size={15} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/5 text-xs">
          <div><div className="text-[#7070A0] font-mono mb-1">Point of Contact</div><div className="text-white">{client.point_of_contact ?? "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Email</div><div className="text-white break-all">{client.contact_email ?? "—"}</div></div>
          <div><div className="text-[#7070A0] font-mono mb-1">Phone</div><div className="text-white">{client.contact_phone ?? "—"}</div></div>
        </div>
        {client.notes && <p className="mt-4 text-sm text-[#B0ADCC] leading-relaxed">{client.notes}</p>}
      </div>

      <div className="bg-[#10101C] border border-white/6 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/6 px-5">
          <div className="flex">
            {(["projects","contracts"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "text-white border-[#FF4D00]" : "text-[#7070A0] border-transparent hover:text-white"}`}>
                {t} ({t === "projects" ? myProjects.length : myContracts.length})
              </button>
            ))}
          </div>
          {tab === "contracts" && (
            <button onClick={onNewContract} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00] text-xs font-medium hover:bg-[#FF4D00]/20 transition-colors">
              <Plus size={13} /> New Contract
            </button>
          )}
        </div>

        {tab === "projects" && (
          myProjects.length === 0 ? (
            <div className="py-10 text-center"><p className="text-sm text-[#7070A0]">No projects linked to this client.</p></div>
          ) : (
            <div className="divide-y divide-white/4">
              {myProjects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{p.name}</div>
                    <div className="text-xs text-[#7070A0] mt-0.5 font-mono">{formatDate(p.deadline)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={p.status} />
                    <PillarBadge pillar={p.pillar} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "contracts" && (
          myContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-5">
              <p className="text-sm text-[#7070A0] mb-4">No contracts yet. Add a contract to formalise this relationship.</p>
              <button onClick={onNewContract} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> New Contract</button>
            </div>
          ) : (
            <div className="divide-y divide-white/4">
              {myContracts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{c.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-[#7070A0] capitalize">{c.contract_type}</span>
                      {c.value && <span className="text-xs font-mono text-white">{formatNaira(c.value)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={c.status} />
                    <PillarBadge pillar={c.pillar} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

// ─── Edit Lead Modal ──────────────────────────────────────────────────────────

const EditLeadModal = ({ lead, onClose, onSaved }: { lead: any; onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState({
    name: lead.name ?? "",
    organisation: lead.organisation ?? "",
    pillar: lead.pillar ?? "experiences",
    stage: lead.stage ?? "new",
    estimated_value: lead.estimated_value ? String(lead.estimated_value) : "",
    next_action: lead.next_action ?? "",
    next_action_date: lead.next_action_date ?? "",
    lost_reason: lead.lost_reason ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("leads").update({
      name: f.name, organisation: f.organisation || null, pillar: f.pillar as any,
      stage: f.stage as any, estimated_value: f.estimated_value ? parseFloat(f.estimated_value) : null,
      next_action: f.next_action || null, next_action_date: f.next_action_date || null,
      lost_reason: f.stage === "lost" ? (f.lost_reason || null) : null,
    }).eq("id", lead.id);
    setSaving(false);
    if (error) setErr(error.message); else { onSaved(); onClose(); }
  };

  return (
    <Modal title="Edit Lead" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Contact Name *"><input required className={inputCls} value={f.name} onChange={e => set("name", e.target.value)} /></Field>
        <Field label="Organisation"><input className={inputCls} value={f.organisation} onChange={e => set("organisation", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pillar"><select className={selectCls} value={f.pillar} onChange={e => set("pillar", e.target.value)}>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Stage"><select className={selectCls} value={f.stage} onChange={e => set("stage", e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="proposal_sent">Proposal Sent</option><option value="negotiation">Negotiation</option><option value="won">Won</option><option value="lost">Lost</option></select></Field>
        </div>
        <Field label="Estimated Value (₦)"><input type="number" className={inputCls} value={f.estimated_value} onChange={e => set("estimated_value", e.target.value)} /></Field>
        <Field label="Next Action"><input className={inputCls} value={f.next_action} onChange={e => set("next_action", e.target.value)} /></Field>
        <Field label="Next Action Date"><input type="date" className={inputCls} value={f.next_action_date} onChange={e => set("next_action_date", e.target.value)} /></Field>
        {f.stage === "lost" && <Field label="Lost Reason"><input className={inputCls} placeholder="Why was this lost?" value={f.lost_reason} onChange={e => set("lost_reason", e.target.value)} /></Field>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#7070A0] text-sm hover:bg-white/5 transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving ? <Spinner /> : null}{saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Sidebar + Nav ────────────────────────────────────────────────────────────

type Page = "dashboard" | "clients" | "leads" | "projects" | "finance" | "staff" | "payroll" | "events" | "vendors" | "library" | "targets" | "settings";

const NAV_GROUPS = [
  { label: "Operations", items: [
    { id: "dashboard" as Page, label: "Command Centre", icon: LayoutDashboard },
    { id: "clients" as Page,   label: "Clients",        icon: Building2 },
    { id: "leads" as Page,     label: "Leads & Pipeline",icon: TrendingUp },
    { id: "projects" as Page,  label: "Projects",       icon: FolderOpen },
    { id: "events" as Page,    label: "Events",         icon: Calendar },
  ]},
  { label: "Finance", items: [
    { id: "finance" as Page,   label: "Finance",        icon: DollarSign },
    { id: "vendors" as Page,   label: "Vendors & POs",  icon: Truck },
  ]},
  { label: "People", items: [
    { id: "staff" as Page,     label: "Staff",          icon: UserSquare2 },
    { id: "payroll" as Page,   label: "Payroll",        icon: Wallet },
  ]},
  { label: "Intelligence", items: [
    { id: "library" as Page,   label: "Knowledge Library", icon: BookOpen },
    { id: "targets" as Page,   label: "Targets",        icon: Target },
  ]},
];

const Sidebar = ({ current, onNav, onClose, role }: { current: Page; onNav: (p: Page) => void; onClose?: () => void; role: Role }) => (
  <aside className="flex flex-col h-full bg-[#0C0C1A] border-r border-white/6 w-64">
    <div className="flex items-center justify-between px-5 py-5 border-b border-white/6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FF4D00] flex items-center justify-center text-white font-bold text-sm" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>B</div>
        <div><div className="text-sm font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>BTE Admin</div><div className="text-xs text-[#7070A0]">{ROLE_LABELS[role]}</div></div>
      </div>
      {onClose && <button onClick={onClose} className="text-[#7070A0] hover:text-white transition-colors p-1"><X size={16} /></button>}
    </div>
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
      {NAV_GROUPS.map(g => {
        const items = g.items.filter(item => canAccess(role, item.id));
        if (items.length === 0) return null;
        return (
        <div key={g.label}>
          <div className="text-xs font-mono text-[#3A3A5E] uppercase tracking-widest mb-1.5 px-2">{g.label}</div>
          <div className="space-y-0.5">
            {items.map(item => {
              const active = current === item.id;
              return (
                <button key={item.id} onClick={() => { onNav(item.id); onClose?.(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? "bg-[#FF4D00]/10 text-white border border-[#FF4D00]/20" : "text-[#7070A0] hover:text-white hover:bg-white/4 border border-transparent"}`}>
                  <item.icon size={15} className={active ? "text-[#FF4D00]" : ""} />
                  {item.label}
                  {active && <ChevronRight size={13} className="ml-auto text-[#FF4D00]" />}
                </button>
              );
            })}
          </div>
        </div>
      );
      })}
    </nav>
    <div className="border-t border-white/6 p-3 flex-shrink-0 space-y-1">
      <button onClick={() => { onNav("settings"); onClose?.(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${current === "settings" ? "bg-white/8 text-white" : "text-[#7070A0] hover:text-white hover:bg-white/4"}`}><Settings size={15} /> Settings</button>
      <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#7070A0] hover:text-red-400 hover:bg-red-400/5 transition-all"><LogOut size={15} /> Sign out</button>
    </div>
  </aside>
);

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState<Session | null | "loading">("loading");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [revenueEntries, setRevenueEntries] = useState<any[]>([]);
  const [costEntries, setCostEntries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [role, setRole] = useState<Role>("founder");
  const [p2Ready, setP2Ready] = useState(false);
  const [p3Ready, setP3Ready] = useState(false);
  const [p3bReady, setP3bReady] = useState(false);
  const [p4Ready, setP4Ready] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [liveEvent, setLiveEvent] = useState<any | null>(null);
  const [editingLead, setEditingLead] = useState<any | null>(null);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setSession(s);
      } else {
        setPasswordRecovery(false);
        setSession(s);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check if tables exist
  useEffect(() => {
    if (!session || session === "loading") return;
    supabase.from("staff").select("id", { count: "exact", head: true }).then(({ error }) => {
      if (error?.code === "42P01") setNeedsSetup(true);
    });
  }, [session]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    if (!session || session === "loading" || needsSetup) return;
    setLoadingData(true);
    const [c, l, p, t, s, ct] = await Promise.all([
      supabase.from("clients").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("leads").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("due_date", { ascending: true }),
      supabase.from("staff").select("*").eq("active", true).order("name"),
      supabase.from("contracts").select("*").is("archived_at", null).order("created_at", { ascending: false }),
    ]);
    setClients(c.data ?? []);
    setLeads(l.data ?? []);
    setProjects(p.data ?? []);
    setTasks(t.data ?? []);
    setStaff(s.data ?? []);
    setContracts(ct.data ?? []);

    // Phase 2 tables — attempt fetch; any error means tables aren't set up yet
    const revCheck = await supabase.from("revenue_entries").select("id").limit(1);
    const p2TablesMissing = !!revCheck.error;
    if (p2TablesMissing) { setP2Ready(false); }
    else {
      const revFull = await supabase.from("revenue_entries").select("*").order("entry_month", { ascending: false });
      setP2Ready(true);
      const [cost, inv, li, quot, targ] = await Promise.all([
        supabase.from("cost_entries").select("*").order("entry_month", { ascending: false }),
        supabase.from("invoices").select("*").is("archived_at", null).order("created_at", { ascending: false }),
        supabase.from("invoice_line_items").select("*"),
        supabase.from("quotations").select("*").is("archived_at", null).order("created_at", { ascending: false }),
        supabase.from("targets").select("*").order("year").order("month"),
      ]);
      setRevenueEntries(revFull.data ?? []);
      setCostEntries(cost.data ?? []);
      setInvoices(inv.data ?? []);
      setLineItems(li.data ?? []);
      setQuotations(quot.data ?? []);
      setTargets(targ.data ?? []);
    }

    // Phase 3 tables (events) — attempt fetch; any error means tables aren't set up yet
    const evCheck = await supabase.from("events").select("*").is("archived_at", null).order("event_date", { ascending: true });
    if (evCheck.error) { setP3Ready(false); }
    else { setP3Ready(true); setEvents(evCheck.data ?? []); }

    // Phase 3b tables (event_people · attendees) — optional addendum on top of Phase 3
    const epCheck = await supabase.from("event_people").select("id").limit(1);
    setP3bReady(!epCheck.error);

    // Phase 4 tables (payroll · POs · vendors · roles)
    const profCheck = await supabase.from("profiles").select("*").order("created_at");
    if (profCheck.error) { setP4Ready(false); }
    else {
      setP4Ready(true);
      const allProfiles = profCheck.data ?? [];

      // Bootstrap: ensure the current user has a profile. First-ever user becomes founder.
      const uid = session !== "loading" && session ? session.user.id : null;
      if (uid && !allProfiles.some((p: any) => p.id === uid)) {
        const isFirst = allProfiles.length === 0 || !allProfiles.some((p: any) => p.role === "founder");
        await supabase.from("profiles").insert({ id: uid, email: session!.user.email ?? null, name: (session!.user.user_metadata as any)?.name ?? null, role: isFirst ? "founder" : "member" });
        const reload = await supabase.from("profiles").select("*").order("created_at");
        setProfiles(reload.data ?? []);
        setRole((reload.data?.find((p: any) => p.id === uid)?.role ?? (isFirst ? "founder" : "member")) as Role);
      } else {
        setProfiles(allProfiles);
        if (uid) setRole((allProfiles.find((p: any) => p.id === uid)?.role ?? "member") as Role);
      }

      const [pay, ven, po] = await Promise.all([
        supabase.from("payroll_entries").select("*").order("period_month", { ascending: false }),
        supabase.from("vendors").select("*").is("archived_at", null).order("name"),
        supabase.from("purchase_orders").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      ]);
      setPayroll(pay.data ?? []);
      setVendors(ven.data ?? []);
      setPurchaseOrders(po.data ?? []);
    }

    setLoadingData(false);
  }, [session, needsSetup]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setQuickAdd(true); }
      if (e.key === "Escape") { setQuickAdd(false); setModal(null); setMobileOpen(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleQuickAction = (action: string) => {
    if (action === "New Client") { setPage("clients"); setSelectedClient(null); setModal("client"); }
    else if (action === "New Project") { setPage("projects"); setSelectedProject(null); setModal("project"); }
    else if (action === "Add Lead") { setPage("leads"); setModal("lead"); }
    else if (action === "Add Task") setModal("task");
    else if (action === "New Event") { setPage("events"); setSelectedEvent(null); setModal("event"); }
    else if (action === "Log Revenue") { setPage("finance"); setModal("revenue"); }
    else if (action === "Log Cost") { setPage("finance"); setModal("cost"); }
  };

  const navTo = (p: Page) => { setPage(p); setSelectedProject(null); setSelectedClient(null); setSelectedInvoice(null); setSelectedEvent(null); setSelectedStaff(null); setMobileOpen(false); };

  const convertQuotationToInvoice = async (q: any) => {
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14);
    const { error } = await supabase.from("invoices").insert({
      client_id: q.client_id, project_id: q.project_id ?? null,
      due_date: dueDate.toISOString().slice(0, 10),
      status: "draft", subtotal: q.subtotal, total: q.total,
      notes: q.title,
    });
    if (!error) await supabase.from("quotations").update({ status: "accepted" }).eq("id", q.id);
    await fetchAll();
  };

  // ── Render gates ──────────────────────────────────────────────────────────

  if (session === "loading") {
    return (
      <div className="min-h-screen bg-[#08080F] flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="flex items-center gap-3 text-[#7070A0]"><Spinner /><span className="text-sm">Loading…</span></div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (passwordRecovery) return <SetNewPasswordScreen onDone={() => setPasswordRecovery(false)} />;

  if (needsSetup) return <SetupScreen onComplete={() => { setNeedsSetup(false); fetchAll(); }} />;

  if (liveEvent) return <EventLivePage event={liveEvent} onExit={() => setLiveEvent(null)} />;

  const renderPage = () => {
    if (!canAccess(role, page)) return <NoAccess />;
    switch (page) {
      case "dashboard": return <Dashboard clients={clients} projects={projects} leads={leads} tasks={tasks} revenueEntries={revenueEntries} costEntries={costEntries} invoices={invoices} targets={targets} p2Ready={p2Ready} />;
      case "clients":
        if (selectedClient) return (
          <ClientDetailPage
            client={selectedClient}
            projects={projects}
            contracts={contracts}
            onBack={() => setSelectedClient(null)}
            onRefresh={() => { fetchAll(); }}
            onNewContract={() => setModal("contract")}
          />
        );
        return <ClientsPage clients={clients} loading={loadingData} onNew={() => setModal("client")} onRefresh={fetchAll} onSelect={c => setSelectedClient(c)} />;
      case "leads":     return <LeadsPage leads={leads} loading={loadingData} onNew={() => setModal("lead")} onRefresh={fetchAll} onEditLead={l => setEditingLead(l)} />;
      case "projects":
        if (selectedProject) return (
          <ProjectDetailPage
            project={projects.find((p: any) => p.id === selectedProject.id) ?? selectedProject}
            tasks={tasks}
            clients={clients}
            staff={staff}
            vendors={vendors}
            p4Ready={p4Ready}
            onBack={() => setSelectedProject(null)}
            onRefresh={fetchAll}
            onAddTask={() => setModal("task-for-project")}
          />
        );
        return <ProjectsPage projects={projects} clients={clients} staff={staff} loading={loadingData} onNew={() => setModal("project")} onRefresh={fetchAll} onSelect={p => setSelectedProject(p)} />;
      case "staff":
        if (selectedStaff) return (
          <StaffDetailPage
            staffMember={staff.find((s: any) => s.id === selectedStaff.id) ?? selectedStaff}
            projects={projects}
            p4Ready={p4Ready}
            onBack={() => setSelectedStaff(null)}
          />
        );
        return <StaffPage staff={staff} loading={loadingData} onSelect={m => setSelectedStaff(m)} />;
      case "payroll":   return <PayrollPage p4Ready={p4Ready} role={role} payroll={payroll} staff={staff} loading={loadingData} onNew={() => setModal("payroll")} onRefresh={fetchAll} />;
      case "vendors":   return <VendorsPage p4Ready={p4Ready} role={role} vendors={vendors} purchaseOrders={purchaseOrders} projects={projects} loading={loadingData} onNew={(t) => setModal(t)} onRefresh={fetchAll} />;
      case "settings":  return <SettingsPage role={role} profiles={profiles} currentUserId={session && session !== "loading" ? session.user.id : ""} p4Ready={p4Ready} onRefresh={fetchAll} />;
      case "events":
        if (selectedEvent) return (
          <EventDetailPage
            event={events.find((e: any) => e.id === selectedEvent.id) ?? selectedEvent}
            clients={clients}
            projects={projects}
            staff={staff}
            p3bReady={p3bReady}
            onBack={() => setSelectedEvent(null)}
            onRefresh={fetchAll}
            onGoLive={() => setLiveEvent(events.find((e: any) => e.id === selectedEvent.id) ?? selectedEvent)}
          />
        );
        return <EventsPage p3Ready={p3Ready} events={events} clients={clients} staff={staff} loading={loadingData} onNew={() => setModal("event")} onRefresh={fetchAll} onSelect={e => setSelectedEvent(e)} />;
      case "finance":
        if (selectedInvoice) return (
          <InvoiceDetailPage
            invoice={invoices.find((i: any) => i.id === selectedInvoice.id) ?? selectedInvoice}
            lineItems={lineItems}
            clients={clients}
            projects={projects}
            onBack={() => setSelectedInvoice(null)}
            onRefresh={fetchAll}
          />
        );
        return (
          <FinancePage
            p2Ready={p2Ready}
            revenueEntries={revenueEntries}
            costEntries={costEntries}
            invoices={invoices}
            lineItems={lineItems}
            quotations={quotations}
            clients={clients}
            projects={projects}
            loading={loadingData}
            onNew={(t) => setModal(t)}
            onRefresh={fetchAll}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            onConvertQuotation={convertQuotationToInvoice}
          />
        );
      case "targets":
        return (
          <TargetsPage
            p2Ready={p2Ready}
            targets={targets}
            revenueEntries={revenueEntries}
            onNew={() => setModal("target")}
            onRefresh={fetchAll}
            loading={loadingData}
          />
        );
      default: return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
            <BarChart3 size={24} className="text-[#7070A0]" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Coming in a later phase</h3>
          <p className="text-sm text-[#7070A0] max-w-xs">This module is scheduled for a future phase per the PRD.</p>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-[#08080F] overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0"><Sidebar current={page} onNav={navTo} role={role} /></div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64"><Sidebar current={page} onNav={navTo} onClose={() => setMobileOpen(false)} role={role} /></div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/6 bg-[#08080F]/90 backdrop-blur-md">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-[#7070A0] hover:text-white transition-colors p-1"><Menu size={20} /></button>
          <div className="flex-1 max-w-xs">
            <div onClick={() => setQuickAdd(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/4 border border-white/6 text-[#7070A0] cursor-pointer hover:border-white/10 transition-colors">
              <Search size={13} /><span className="text-sm hidden sm:block">Quick add or search…</span>
              <span className="ml-auto text-xs font-mono bg-white/6 px-1.5 py-0.5 rounded hidden sm:block">⌘K</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#7070A0]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</div>
            <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors" title="Refresh"><RefreshCw size={15} /></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">{renderPage()}</div>
        </main>
      </div>

      {/* Floating quick add */}
      <button onClick={() => setQuickAdd(true)} title="Quick Add (⌘K)"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#FF4D00] text-white shadow-2xl shadow-[#FF4D00]/30 hover:bg-[#E04400] hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-30">
        <Plus size={24} />
      </button>

      {/* Modals */}
      {quickAdd && <QuickAddModal onClose={() => setQuickAdd(false)} onAction={handleQuickAction} />}
      {modal === "client"   && <NewClientModal  onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "lead"     && <NewLeadModal    onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "project"  && <NewProjectModal onClose={() => setModal(null)} onSaved={fetchAll} clients={clients} staff={staff} />}
      {modal === "task"     && <NewTaskModal    onClose={() => setModal(null)} onSaved={fetchAll} projects={projects} staff={staff} />}
      {modal === "task-for-project" && selectedProject && (
        <NewTaskModal onClose={() => setModal(null)} onSaved={() => { setModal(null); fetchAll(); }} projects={[selectedProject]} staff={staff} />
      )}
      {modal === "contract" && selectedClient && (
        <NewContractModal clientId={selectedClient.id} onClose={() => setModal(null)} onSaved={fetchAll} />
      )}
      {modal === "revenue"  && <NewRevenueModal clients={clients} projects={projects} onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "cost"     && <NewCostModal projects={projects} onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "invoice"  && <NewInvoiceModal clients={clients} projects={projects} onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "quotation" && <NewQuotationModal clients={clients} projects={projects} onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "target"   && <NewTargetModal onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "event"    && <NewEventModal clients={clients} projects={projects} staff={staff} onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "payroll"  && <NewPayrollModal staff={staff} onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "vendor"   && <NewVendorModal onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "po"       && <NewPOModal vendors={vendors} projects={projects} onClose={() => setModal(null)} onSaved={fetchAll} />}
      {editingLead && <EditLeadModal lead={editingLead} onClose={() => setEditingLead(null)} onSaved={() => { setEditingLead(null); fetchAll(); }} />}
    </div>
  );
}
