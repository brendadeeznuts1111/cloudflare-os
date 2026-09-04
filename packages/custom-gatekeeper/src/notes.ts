/**
 * Operator-note ledger.
 *
 * Pending writes are visible to agents as if already applied (Gatekeeper
 * simulation rule). Status is never returned through Session types.
 * Action IDs are sequential integers, matching ApprovalQueue.submitAction.
 */

export interface OperatorNote {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface StoredNoteRecord {
  actionId: number;
  note: OperatorNote;
}

export interface NoteKv {
  get<T = unknown>(key: string): Promise<T | undefined> | T | undefined;
  put(key: string, value: unknown): Promise<void> | void;
}

export interface NoteStorage {
  nextActionId(): Promise<number>;
  loadApplied(): Promise<StoredNoteRecord[]>;
  loadPending(): Promise<StoredNoteRecord[]>;
  saveApplied(records: StoredNoteRecord[]): Promise<void>;
  savePending(records: StoredNoteRecord[]): Promise<void>;
}

const APPLIED_KEY = "brenda-os:notes:applied";
const PENDING_KEY = "brenda-os:notes:pending";
const NEXT_ACTION_KEY = "brenda-os:notes:next-action";

function cloneRecords(records: StoredNoteRecord[]): StoredNoteRecord[] {
  return records.map((record) => ({
    actionId: record.actionId,
    note: { ...record.note },
  }));
}

export class MemoryNoteStorage implements NoteStorage {
  #applied: StoredNoteRecord[] = [];
  #pending: StoredNoteRecord[] = [];
  #next = 0;

  async nextActionId(): Promise<number> {
    this.#next += 1;
    return this.#next;
  }

  async loadApplied(): Promise<StoredNoteRecord[]> {
    return cloneRecords(this.#applied);
  }

  async loadPending(): Promise<StoredNoteRecord[]> {
    return cloneRecords(this.#pending);
  }

  async saveApplied(records: StoredNoteRecord[]): Promise<void> {
    this.#applied = cloneRecords(records);
  }

  async savePending(records: StoredNoteRecord[]): Promise<void> {
    this.#pending = cloneRecords(records);
  }
}

export class KvNoteStorage implements NoteStorage {
  constructor(private readonly kv: NoteKv) {}

  async nextActionId(): Promise<number> {
    const current = (await this.kv.get<number>(NEXT_ACTION_KEY)) ?? 0;
    const next = current + 1;
    await this.kv.put(NEXT_ACTION_KEY, next);
    return next;
  }

  async loadApplied(): Promise<StoredNoteRecord[]> {
    return this.#load(APPLIED_KEY);
  }

  async loadPending(): Promise<StoredNoteRecord[]> {
    return this.#load(PENDING_KEY);
  }

  async saveApplied(records: StoredNoteRecord[]): Promise<void> {
    await this.kv.put(APPLIED_KEY, cloneRecords(records));
  }

  async savePending(records: StoredNoteRecord[]): Promise<void> {
    await this.kv.put(PENDING_KEY, cloneRecords(records));
  }

  async #load(key: string): Promise<StoredNoteRecord[]> {
    const value = await this.kv.get<StoredNoteRecord[]>(key);
    return Array.isArray(value) ? cloneRecords(value) : [];
  }
}

export class NoteLedger {
  constructor(private readonly storage: NoteStorage) {}

  nextActionId(): Promise<number> {
    return this.storage.nextActionId();
  }

  async queuePending(actionId: number, note: OperatorNote): Promise<void> {
    const pending = await this.storage.loadPending();
    const next = pending.filter((entry) => entry.actionId !== actionId && entry.note.id !== note.id);
    next.push({ actionId, note: { ...note } });
    await this.storage.savePending(next);
  }

  async apply(actionId: number): Promise<void> {
    const pending = await this.storage.loadPending();
    const applied = await this.storage.loadApplied();
    const record = pending.find((entry) => entry.actionId === actionId);
    if (!record) {
      return;
    }
    await this.storage.savePending(pending.filter((entry) => entry.actionId !== actionId));
    await this.storage.saveApplied([
      ...applied.filter((entry) => entry.actionId !== actionId && entry.note.id !== record.note.id),
      record,
    ]);
  }

  async reject(actionId: number): Promise<void> {
    const pending = await this.storage.loadPending();
    await this.storage.savePending(pending.filter((entry) => entry.actionId !== actionId));
  }

  async revert(actionId: number): Promise<void> {
    const applied = await this.storage.loadApplied();
    const pending = await this.storage.loadPending();
    await this.storage.saveApplied(applied.filter((entry) => entry.actionId !== actionId));
    await this.storage.savePending(pending.filter((entry) => entry.actionId !== actionId));
  }

  /**
   * Agent-visible list: pending overlays applied. No status or actionId field.
   */
  async list(): Promise<OperatorNote[]> {
    const byId = new Map<string, OperatorNote>();
    for (const record of await this.storage.loadApplied()) {
      byId.set(record.note.id, { ...record.note });
    }
    for (const record of await this.storage.loadPending()) {
      byId.set(record.note.id, { ...record.note });
    }
    return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<OperatorNote | null> {
    const notes = await this.list();
    return notes.find((note) => note.id === id) ?? null;
  }

  /** Test helper — never expose through Session. */
  async debugDump(): Promise<Array<StoredNoteRecord & { status: "pending" | "applied" }>> {
    const applied = await this.storage.loadApplied();
    const pending = await this.storage.loadPending();
    return [
      ...applied.map((record) => ({ ...record, note: { ...record.note }, status: "applied" as const })),
      ...pending.map((record) => ({ ...record, note: { ...record.note }, status: "pending" as const })),
    ];
  }
}

export function storageFromDurableObjectState(ctx: {
  storage?: { kv?: NoteKv };
}): NoteStorage {
  const kv = ctx.storage?.kv;
  return kv ? new KvNoteStorage(kv) : new MemoryNoteStorage();
}

export function newOperatorNote(title: string, body: string): OperatorNote {
  return {
    id: `note-${crypto.randomUUID()}`,
    title,
    body,
    createdAt: new Date().toISOString(),
  };
}
