export type Pillar = "experiences" | "production" | "communications" | "brand_marketing" | "people_culture";
export type ClientType = "institutional" | "corporate" | "individual";
export type ClientStatus = "prospect" | "active" | "inactive";
export type LeadStage = "new" | "contacted" | "proposal_sent" | "negotiation" | "won" | "lost";
export type ProposalStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type ContractType = "contract" | "sow" | "retainer";
export type ContractStatus = "draft" | "sent" | "signed" | "expired" | "terminated";
export type ProjectStatus = "not_started" | "in_progress" | "at_risk" | "delayed" | "complete";
export type TaskStatus = "not_started" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type StaffContractType = "core_staff" | "contractor" | "freelancer" | "ace_collective";

export interface Client {
  id: string;
  name: string;
  client_type: ClientType;
  pillar: Pillar;
  point_of_contact: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_details: Record<string, unknown> | null;
  status: ClientStatus;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  organisation: string | null;
  client_id: string | null;
  pillar: Pillar;
  source: string | null;
  stage: LeadStage;
  estimated_value: number | null;
  next_action: string | null;
  next_action_date: string | null;
  owner_id: string | null;
  lost_reason: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  title: string;
  lead_id: string | null;
  client_id: string | null;
  pillar: Pillar;
  body: string | null;
  value: number | null;
  version: number;
  status: ProposalStatus;
  sent_date: string | null;
  decision_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  client_id: string;
  title: string;
  pillar: Pillar;
  contract_type: ContractType;
  body: string | null;
  value: number | null;
  start_date: string | null;
  end_date: string | null;
  status: ContractStatus;
  file_url: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string | null;
  contract_id: string | null;
  pillar: Pillar;
  project_lead_id: string | null;
  start_date: string | null;
  deadline: string | null;
  status: ProjectStatus;
  budget: number | null;
  is_event: boolean;
  deliverables: { label: string; done: boolean }[] | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  assignee_id: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  name: string;
  role_title: string | null;
  team: string | null;
  pillar: Pillar | null;
  contract_type: StaffContractType;
  start_date: string | null;
  nda_signed: boolean;
  capacity_pct: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      clients: { Row: Client; Insert: Omit<Client, "id" | "created_at" | "updated_at">; Update: Partial<Client> };
      leads: { Row: Lead; Insert: Omit<Lead, "id" | "created_at" | "updated_at">; Update: Partial<Lead> };
      proposals: { Row: Proposal; Insert: Omit<Proposal, "id" | "created_at" | "updated_at">; Update: Partial<Proposal> };
      contracts: { Row: Contract; Insert: Omit<Contract, "id" | "created_at" | "updated_at">; Update: Partial<Contract> };
      projects: { Row: Project; Insert: Omit<Project, "id" | "created_at" | "updated_at">; Update: Partial<Project> };
      tasks: { Row: Task; Insert: Omit<Task, "id" | "created_at" | "updated_at">; Update: Partial<Task> };
      staff: { Row: Staff; Insert: Omit<Staff, "id" | "created_at" | "updated_at">; Update: Partial<Staff> };
    };
  };
}
