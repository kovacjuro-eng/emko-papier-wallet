export type Role = "employee" | "admin";
export type RewardStatus = "active" | "used" | "expired";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gdpr_consent: boolean;
  cycle_started_at: string;
  created_at: string;
}

export interface Stamp {
  id: string;
  customer_id: string;
  store_id: string;
  employee_id: string;
  amount: number;
  created_at: string;
}

export interface Reward {
  id: string;
  customer_id: string;
  status: RewardStatus;
  discount_percent: number;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export interface Settings {
  id: number;
  min_purchase_amount: number;
  stamps_required: number;
  discount_percent: number;
  reward_validity_days: number;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  employee_id: string | null;
  action: string;
  customer_id: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface StampWithRelations extends Stamp {
  store_name: string | null;
  employee_name: string | null;
}

export interface CustomerDetail {
  customer: Customer;
  stampCount: number;
  stampsRequired: number;
  activeReward: Reward | null;
  stamps: StampWithRelations[];
  rewards: Reward[];
}

/** Chyba service vrstvy s kódom a HTTP statusom pre API vrstvu. */
export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
