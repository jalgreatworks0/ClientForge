export type DunningStatus = 'PENDING' | 'RETRYING' | 'FAILED' | 'RESOLVED';

export interface DunningContactRef {
  id: string;
  email: string;
  tenantId: string;
}

export interface DunningAttempt {
  id: string;
  at: string;               // ISO string
  channel: 'EMAIL' | 'SMS' | 'CALL' | 'WEBHOOK';
  success: boolean;
  notes?: string;
}

export interface DunningPlan {
  id: string;
  scheduleDays: number[];   // e.g. [3, 7, 14]
  maxAttempts: number;      // hard stop to prevent spam
}

export interface DunningRecord {
  id: string;
  invoiceId: string;
  amountDueCents: number;
  currency: string;
  status: DunningStatus;
  contact: DunningContactRef;
  attempts: DunningAttempt[];
  nextAttemptAt?: string;   // ISO
  planId?: string;
}

export interface CreateDunningInput {
  invoiceId: string;
  amountDueCents: number;
  currency: string;
  contact: DunningContactRef;
  planId?: string;
}

export interface DunningService {
  create(input: CreateDunningInput): Promise<DunningRecord>;
  get(id: string): Promise<DunningRecord | null>;
  markResolved(id: string, note?: string): Promise<DunningRecord>;
  scheduleNextAttempt(id: string): Promise<DunningRecord>;
  recordAttempt(id: string, attempt: DunningAttempt): Promise<DunningRecord>;
}
