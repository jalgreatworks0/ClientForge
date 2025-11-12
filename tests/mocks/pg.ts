/**
 * Realistic PostgreSQL Mock for Tests
 * SQL router that handles common patterns without external connections
 */

type Row = Record<string, unknown>
type Result = { rows: Row[]; rowCount: number }

let idCounter = 1000
function newId(prefix = 't') {
  idCounter += 1
  return `${prefix}_${idCounter}`
}

// In-memory storage for test data
const mem = {
  tenants: [{ id: 'tenant_test', name: 'Test Tenant', subdomain: 'test' }] as Row[],
  users: [] as Row[],
  accounts: [] as Row[],
  deals: [] as Row[],
  contacts: [] as Row[],
  tasks: [] as Row[],
  files: [] as Row[],
}

function norm(sql: string) {
  return sql.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function route(sql: string, params: unknown[] = []): Promise<Result> {
  const s = norm(sql)

  // Sanity/info queries
  if (s.startsWith('select version()')) {
    return { rows: [{ version: 'PostgreSQL 15-mock' }], rowCount: 1 }
  }
  if (s.includes('current_setting(')) {
    return { rows: [{ current_setting: 'mock' }], rowCount: 1 }
  }

  // INSERT ... RETURNING id for various tables
  if (/insert into tenants .* returning id/.test(s)) {
    const id = newId('tenant')
    mem.tenants.push({
      id,
      name: (params[0] as string) ?? 'Tenant',
      subdomain: (params[1] as string) ?? 'test',
    })
    return { rows: [{ id }], rowCount: 1 }
  }

  if (/insert into users .* returning id/.test(s)) {
    const id = newId('user')
    mem.users.push({ id, tenant_id: params[0] })
    return { rows: [{ id }], rowCount: 1 }
  }

  if (/insert into accounts .* returning id/.test(s)) {
    const id = newId('acct')
    mem.accounts.push({ id, tenant_id: params[0] })
    return { rows: [{ id }], rowCount: 1 }
  }

  if (/insert into deals .* returning id/.test(s)) {
    const id = newId('deal')
    mem.deals.push({ id, tenant_id: params[0] })
    return { rows: [{ id }], rowCount: 1 }
  }

  if (/insert into contacts .* returning id/.test(s)) {
    const id = newId('contact')
    mem.contacts.push({ id, tenant_id: params[0] })
    return { rows: [{ id }], rowCount: 1 }
  }

  if (/insert into tasks .* returning id/.test(s)) {
    const id = newId('task')
    mem.tasks.push({ id, tenant_id: params[0] })
    return { rows: [{ id }], rowCount: 1 }
  }

  if (/insert into files .* returning id/.test(s)) {
    const id = newId('file')
    mem.files.push({ id, tenant_id: params[0] })
    return { rows: [{ id }], rowCount: 1 }
  }

  // Generic INSERT/UPDATE/DELETE success paths
  if (s.startsWith('insert into ')) return { rows: [], rowCount: 1 }
  if (s.startsWith('update ')) return { rows: [], rowCount: 1 }
  if (s.startsWith('delete ')) return { rows: [], rowCount: 1 }

  // SELECT queries
  if (/select \* from tenants/.test(s)) {
    return { rows: mem.tenants.slice(0, 1), rowCount: mem.tenants.length }
  }

  if (/select \* from users/.test(s)) {
    return { rows: mem.users, rowCount: mem.users.length }
  }

  if (/select \* from accounts/.test(s)) {
    return { rows: mem.accounts, rowCount: mem.accounts.length }
  }

  if (/select \* from deals/.test(s)) {
    return { rows: mem.deals, rowCount: mem.deals.length }
  }

  if (/select \* from contacts/.test(s)) {
    return { rows: mem.contacts, rowCount: mem.contacts.length }
  }

  if (/select \* from tasks/.test(s)) {
    return { rows: mem.tasks, rowCount: mem.tasks.length }
  }

  if (/select \* from files/.test(s)) {
    return { rows: mem.files, rowCount: mem.files.length }
  }

  // Default: empty result (explicit non-throw to avoid connection failures)
  return { rows: [], rowCount: 0 }
}

export class Pool {
  query = (sql: string, params?: unknown[]) => route(sql, params)
  connect = async () => ({
    query: (sql: string, params?: unknown[]) => route(sql, params),
    release: () => {},
  })
  end = async () => {}
  on = () => {}
}

export class Client {
  connect = async () => {}
  query = (sql: string, params?: unknown[]) => route(sql, params)
  end = async () => {}
  on = () => {}
}

export default { Pool, Client }
