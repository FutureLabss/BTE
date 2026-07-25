import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, TrendingUp, FolderOpen, Calendar, DollarSign,
  UserSquare2, Truck, BookOpen, Target, Settings, Plus, X,
  ChevronRight, Search, Menu, AlertTriangle, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownRight, Building2, BarChart3, Receipt,
  Mail, RefreshCw, LogOut, CheckCheck, Database, Loader2, Eye, EyeOff,
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (err) setError(err.message);
      else setSignedUp(true);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) setError(err.message === "Invalid login credentials" ? "Wrong email or password." : err.message);
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
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </h1>
            <p className="text-sm text-[#7070A0] mb-8">
              {mode === "signin"
                ? "Welcome back to the BTE Admin Portal."
                : "Founder account setup. Team joins by invitation later."}
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-[#7070A0] uppercase tracking-wider block mb-1.5">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="emediong@breaktheeyes.com" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-mono text-[#7070A0] uppercase tracking-wider block mb-1.5">Password</label>
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
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#FF4D00] text-white font-medium text-sm hover:bg-[#E04400] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {loading && <Spinner />}
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#7070A0]">
              {mode === "signin" ? (
                <>No account? <button onClick={() => { setMode("signup"); setError(""); }} className="text-white hover:text-[#FF4D00] transition-colors font-medium">Create one</button></>
              ) : (
                <>Have an account? <button onClick={() => { setMode("signin"); setError(""); }} className="text-white hover:text-[#FF4D00] transition-colors font-medium">Sign in</button></>
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

// ─── Quick Add ────────────────────────────────────────────────────────────────

const QuickAddModal = ({ onClose, onAction }: { onClose: () => void; onAction: (a: string) => void }) => (
  <Modal title="Quick Add" onClose={onClose}>
    <p className="text-xs text-[#7070A0] mb-5">Log data in under 30 seconds. <kbd className="font-mono bg-white/8 px-1.5 py-0.5 rounded">Esc</kbd> to close.</p>
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "New Client", icon: Building2, color: "text-[#FF4D00]" },
        { label: "New Project", icon: FolderOpen, color: "text-purple-400" },
        { label: "Add Lead", icon: TrendingUp, color: "text-blue-400" },
        { label: "Add Task", icon: CheckCircle2, color: "text-amber-400" },
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

const MOCK_PNL = [
  { month: "Feb", Revenue: 8200000, Costs: 5400000 },
  { month: "Mar", Revenue: 12500000, Costs: 7800000 },
  { month: "Apr", Revenue: 9800000, Costs: 6200000 },
  { month: "May", Revenue: 15200000, Costs: 9100000 },
  { month: "Jun", Revenue: 11400000, Costs: 7600000 },
  { month: "Jul", Revenue: 18700000, Costs: 11200000 },
];

const Dashboard = ({ clients, projects, leads, tasks }: { clients: any[]; projects: any[]; leads: any[]; tasks: any[] }) => {
  const active = projects.filter(p => p.status !== "complete" && !p.archived_at);
  const flagged = active.filter(p => p.status === "at_risk" || p.status === "delayed");
  const openLeads = leads.filter(l => !["won", "lost"].includes(l.stage));
  const pipeline = openLeads.reduce((a: number, l: any) => a + (l.estimated_value ?? 0), 0);
  const upcoming = tasks.filter((t: any) => t.status !== "done" && t.due_date && daysUntil(t.due_date) <= 14)
    .sort((a: any, b: any) => daysUntil(a.due_date) - daysUntil(b.due_date));

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
        <StatCard label="Active Clients" value={String(clients.filter((c: any) => c.status === "active").length)} sub={`${clients.length} total`} icon={Building2} trend="neutral" trendLabel={`${clients.filter((c: any) => c.status === "prospect").length} prospects`} />
        <StatCard label="Active Projects" value={String(active.length)} sub={flagged.length > 0 ? `${flagged.length} flagged` : "All on track"} icon={FolderOpen} trend={flagged.length > 0 ? "down" : "up"} trendLabel={flagged.length > 0 ? `${flagged.length} need attention` : "On track"} />
        <StatCard label="Open Pipeline" value={formatNaira(pipeline)} sub={`${openLeads.length} open leads`} icon={TrendingUp} trend="up" trendLabel={`${leads.filter((l: any) => l.stage === "negotiation").length} in negotiation`} />
        <StatCard label="Tasks Due (7d)" value={String(upcoming.filter((t: any) => daysUntil(t.due_date) <= 7).length)} sub="Next 7 days" icon={Clock} trend={upcoming.filter((t: any) => daysUntil(t.due_date) <= 0).length > 0 ? "down" : "neutral"} trendLabel={`${upcoming.filter((t: any) => daysUntil(t.due_date) <= 0).length} overdue`} />
        <StatCard label="Leads Won" value={String(leads.filter((l: any) => l.stage === "won").length)} sub={`of ${leads.length} total`} icon={CheckCircle2} trend="up" trendLabel="Conversion tracking" />
        <StatCard label="Staff Loaded" value={String(0)} sub="See Staff page" icon={UserSquare2} trend="neutral" trendLabel="17 seeded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#10101C] border border-white/6 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest">Revenue vs. Costs</div><div className="text-sm font-medium text-white mt-1">Feb – Jul 2026 (sample)</div></div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" />Revenue</span>
              <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-400" />Costs</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MOCK_PNL} barGap={4}>
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

const ClientsPage = ({ clients, loading, onNew, onRefresh }: { clients: any[]; loading: boolean; onNew: () => void; onRefresh: () => void }) => {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? clients : clients.filter((c: any) => c.status === filter);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Clients</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Client Directory</h1></div>
        <div className="flex gap-2"><button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button><button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> New Client</button></div>
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
                  <tr key={c.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors cursor-pointer">
                    <td className="px-5 py-4"><div className="font-medium text-white text-sm">{c.name}</div><div className="text-xs text-[#7070A0] capitalize mt-0.5">{c.client_type}</div></td>
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

const LeadsPage = ({ leads, loading, onNew, onRefresh }: { leads: any[]; loading: boolean; onNew: () => void; onRefresh: () => void }) => {
  const [view, setView] = useState<"kanban"|"list">("kanban");
  const pipeline = leads.reduce((a: number, l: any) => a + (l.estimated_value ?? 0), 0);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Pipeline</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{formatNaira(pipeline)} open</h1></div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/8 overflow-hidden">{(["kanban","list"] as const).map(v => <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-mono capitalize transition-colors ${view === v ? "bg-white/10 text-white" : "text-[#7070A0] hover:text-white"}`}>{v}</button>)}</div>
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
                      <div key={l.id} className="bg-[#10101C] border border-white/6 rounded-xl p-4 hover:border-white/10 transition-colors cursor-pointer">
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

const ProjectsPage = ({ projects, clients, staff, loading, onNew, onRefresh }: { projects: any[]; clients: any[]; staff: any[]; loading: boolean; onNew: () => void; onRefresh: () => void }) => {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? projects : projects.filter((p: any) => p.status === filter);
  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c.name]));
  const staffMap = Object.fromEntries(staff.map((s: any) => [s.id, s.name]));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">Projects</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>All Projects</h1></div>
        <div className="flex gap-2"><button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/5 text-[#7070A0] hover:text-white transition-colors"><RefreshCw size={15} /></button><button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D00] text-white text-sm font-medium hover:bg-[#E04400] transition-colors"><Plus size={15} /> New Project</button></div>
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
                <div key={p.id} className={`bg-[#10101C] border rounded-2xl p-5 hover:border-white/10 transition-all ${isWarning ? "border-amber-400/20" : "border-white/6"}`}>
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

const StaffPage = ({ staff, loading }: { staff: any[]; loading: boolean }) => (
  <div className="space-y-5">
    <div><div className="text-xs font-mono text-[#7070A0] uppercase tracking-widest mb-1">People</div><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Staff — {staff.filter((s: any) => s.active).length} active</h1></div>
    {loading ? <div className="flex justify-center py-20"><Spinner /></div>
      : staff.length === 0 ? <EmptyState icon={UserSquare2} title="No staff loaded" desc="Run the migration SQL in Supabase to seed 17 BTE staff members." />
      : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((m: any) => (
            <div key={m.id} className="bg-[#10101C] border border-white/6 rounded-2xl p-5 hover:border-white/10 transition-colors">
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

// ─── Sidebar + Nav ────────────────────────────────────────────────────────────

type Page = "dashboard" | "clients" | "leads" | "projects" | "finance" | "staff" | "events" | "vendors" | "library" | "targets" | "settings";

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
    { id: "staff" as Page,     label: "Staff & Payroll",icon: UserSquare2 },
  ]},
  { label: "Intelligence", items: [
    { id: "library" as Page,   label: "Knowledge Library", icon: BookOpen },
    { id: "targets" as Page,   label: "Targets",        icon: Target },
  ]},
];

const Sidebar = ({ current, onNav, onClose }: { current: Page; onNav: (p: Page) => void; onClose?: () => void }) => (
  <aside className="flex flex-col h-full bg-[#0C0C1A] border-r border-white/6 w-64">
    <div className="flex items-center justify-between px-5 py-5 border-b border-white/6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FF4D00] flex items-center justify-center text-white font-bold text-sm" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>B</div>
        <div><div className="text-sm font-bold text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>BTE Admin</div><div className="text-xs text-[#7070A0]">Phase 1</div></div>
      </div>
      {onClose && <button onClick={onClose} className="text-[#7070A0] hover:text-white transition-colors p-1"><X size={16} /></button>}
    </div>
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
      {NAV_GROUPS.map(g => (
        <div key={g.label}>
          <div className="text-xs font-mono text-[#3A3A5E] uppercase tracking-widest mb-1.5 px-2">{g.label}</div>
          <div className="space-y-0.5">
            {g.items.map(item => {
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
      ))}
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
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
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
    const [c, l, p, t, s] = await Promise.all([
      supabase.from("clients").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("leads").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("due_date", { ascending: true }),
      supabase.from("staff").select("*").eq("active", true).order("name"),
    ]);
    setClients(c.data ?? []);
    setLeads(l.data ?? []);
    setProjects(p.data ?? []);
    setTasks(t.data ?? []);
    setStaff(s.data ?? []);
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
    if (action === "New Client") { setPage("clients"); setModal("client"); }
    else if (action === "New Project") { setPage("projects"); setModal("project"); }
    else if (action === "Add Lead") { setPage("leads"); setModal("lead"); }
    else if (action === "Add Task") setModal("task");
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

  if (needsSetup) return <SetupScreen onComplete={() => { setNeedsSetup(false); fetchAll(); }} />;

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard clients={clients} projects={projects} leads={leads} tasks={tasks} />;
      case "clients":   return <ClientsPage clients={clients} loading={loadingData} onNew={() => setModal("client")} onRefresh={fetchAll} />;
      case "leads":     return <LeadsPage leads={leads} loading={loadingData} onNew={() => setModal("lead")} onRefresh={fetchAll} />;
      case "projects":  return <ProjectsPage projects={projects} clients={clients} staff={staff} loading={loadingData} onNew={() => setModal("project")} onRefresh={fetchAll} />;
      case "staff":     return <StaffPage staff={staff} loading={loadingData} />;
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
      <div className="hidden lg:flex flex-shrink-0"><Sidebar current={page} onNav={setPage} /></div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64"><Sidebar current={page} onNav={setPage} onClose={() => setMobileOpen(false)} /></div>
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
      {modal === "client"  && <NewClientModal  onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "lead"    && <NewLeadModal    onClose={() => setModal(null)} onSaved={fetchAll} />}
      {modal === "project" && <NewProjectModal onClose={() => setModal(null)} onSaved={fetchAll} clients={clients} staff={staff} />}
      {modal === "task"    && <NewTaskModal    onClose={() => setModal(null)} onSaved={fetchAll} projects={projects} staff={staff} />}
    </div>
  );
}
