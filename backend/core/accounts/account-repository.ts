/**
 * Account Repository
 * Database access layer for accounts/companies
 */

import { Pool } from 'pg'

import { getPool } from '../../database/postgresql/pool'

import {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilters,
  AccountListOptions,
  AccountListResponse,
  AccountWithRelations,
} from './account-types'

export class AccountRepository {
  private pool: Pool

  constructor() {
    this.pool = getPool()
  }

  /**
   * Create a new account
   */
  async create(tenantId: string, data: CreateAccountInput): Promise<Account> {
    const result = await this.pool.query<Account>(
      `INSERT INTO accounts (
        tenant_id, owner_id, name, website, industry, company_size,
        annual_revenue, phone, email, description, account_type, account_status,
        parent_account_id, tags, billing_address_street, billing_address_city,
        billing_address_state, billing_address_postal_code, billing_address_country,
        shipping_address_street, shipping_address_city, shipping_address_state,
        shipping_address_postal_code, shipping_address_country, social_linkedin,
        social_twitter, social_facebook, employee_count, founded_year, stock_symbol
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      )
      RETURNING
        id,
        tenant_id as "tenantId",
        owner_id as "ownerId",
        name,
        website,
        industry,
        company_size as "companySize",
        annual_revenue as "annualRevenue",
        phone,
        email,
        description,
        account_type as "accountType",
        account_status as "accountStatus",
        parent_account_id as "parentAccountId",
        tags,
        billing_address_street as "billingAddressStreet",
        billing_address_city as "billingAddressCity",
        billing_address_state as "billingAddressState",
        billing_address_postal_code as "billingAddressPostalCode",
        billing_address_country as "billingAddressCountry",
        shipping_address_street as "shippingAddressStreet",
        shipping_address_city as "shippingAddressCity",
        shipping_address_state as "shippingAddressState",
        shipping_address_postal_code as "shippingAddressPostalCode",
        shipping_address_country as "shippingAddressCountry",
        social_linkedin as "socialLinkedin",
        social_twitter as "socialTwitter",
        social_facebook as "socialFacebook",
        employee_count as "employeeCount",
        founded_year as "foundedYear",
        stock_symbol as "stockSymbol",
        is_active as "isActive",
        last_activity_at as "lastActivityAt",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"`,
      [
        tenantId,
        data.ownerId,
        data.name,
        data.website || null,
        data.industry || null,
        data.companySize || null,
        data.annualRevenue || null,
        data.phone || null,
        data.email || null,
        data.description || null,
        data.accountType || null,
        data.accountStatus || 'active',
        data.parentAccountId || null,
        data.tags || null,
        data.billingAddressStreet || null,
        data.billingAddressCity || null,
        data.billingAddressState || null,
        data.billingAddressPostalCode || null,
        data.billingAddressCountry || null,
        data.shippingAddressStreet || null,
        data.shippingAddressCity || null,
        data.shippingAddressState || null,
        data.shippingAddressPostalCode || null,
        data.shippingAddressCountry || null,
        data.socialLinkedin || null,
        data.socialTwitter || null,
        data.socialFacebook || null,
        data.employeeCount || null,
        data.foundedYear || null,
        data.stockSymbol || null,
      ]
    )

    return result.rows[0]
  }

  /**
   * Find account by ID
   */
  async findById(id: string, tenantId: string): Promise<Account | null> {
    const result = await this.pool.query<Account>(
      `SELECT
        id,
        tenant_id as "tenantId",
        owner_id as "ownerId",
        name,
        website,
        industry,
        company_size as "companySize",
        annual_revenue as "annualRevenue",
        phone,
        email,
        description,
        account_type as "accountType",
        account_status as "accountStatus",
        parent_account_id as "parentAccountId",
        tags,
        billing_address_street as "billingAddressStreet",
        billing_address_city as "billingAddressCity",
        billing_address_state as "billingAddressState",
        billing_address_postal_code as "billingAddressPostalCode",
        billing_address_country as "billingAddressCountry",
        shipping_address_street as "shippingAddressStreet",
        shipping_address_city as "shippingAddressCity",
        shipping_address_state as "shippingAddressState",
        shipping_address_postal_code as "shippingAddressPostalCode",
        shipping_address_country as "shippingAddressCountry",
        social_linkedin as "socialLinkedin",
        social_twitter as "socialTwitter",
        social_facebook as "socialFacebook",
        employee_count as "employeeCount",
        founded_year as "foundedYear",
        stock_symbol as "stockSymbol",
        is_active as "isActive",
        last_activity_at as "lastActivityAt",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM accounts
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] || null
  }

  /**
   * Find account by ID with relations
   */
  async findByIdWithRelations(id: string, tenantId: string): Promise<AccountWithRelations | null> {
    const result = await this.pool.query<AccountWithRelations>(
      `SELECT
        a.*,
        json_build_object(
          'id', u.id,
          'firstName', u.first_name,
          'lastName', u.last_name,
          'email', u.email
        ) as owner,
        json_build_object(
          'id', pa.id,
          'name', pa.name,
          'industry', pa.industry
        ) as "parentAccount",
        (SELECT COUNT(*) FROM contacts c WHERE c.account_id = a.id AND c.deleted_at IS NULL)::integer as "contactCount",
        (SELECT COUNT(*) FROM deals d WHERE d.account_id = a.id AND d.deleted_at IS NULL)::integer as "dealCount",
        (SELECT COALESCE(SUM(d.amount), 0) FROM deals d WHERE d.account_id = a.id AND d.deleted_at IS NULL) as "totalDealValue"
      FROM accounts a
      LEFT JOIN users u ON u.id = a.owner_id
      LEFT JOIN accounts pa ON pa.id = a.parent_account_id
      WHERE a.id = $1 AND a.tenant_id = $2 AND a.deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] || null
  }

  /**
   * List accounts with pagination and filters
   */
  async list(tenantId: string, options: AccountListOptions): Promise<AccountListResponse> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', filters = {} } = options

    const whereClauses: string[] = ['a.tenant_id = $1', 'a.deleted_at IS NULL']
    const params: any[] = [tenantId]
    let paramIndex = 2

    // Build dynamic WHERE clause
    if (filters.search) {
      whereClauses.push(`(
        a.name ILIKE $${paramIndex} OR
        a.industry ILIKE $${paramIndex} OR
        a.email ILIKE $${paramIndex}
      )`)
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    if (filters.ownerId) {
      whereClauses.push(`a.owner_id = $${paramIndex}`)
      params.push(filters.ownerId)
      paramIndex++
    }

    if (filters.industry) {
      whereClauses.push(`a.industry = $${paramIndex}`)
      params.push(filters.industry)
      paramIndex++
    }

    if (filters.companySize) {
      if (Array.isArray(filters.companySize)) {
        whereClauses.push(`a.company_size = ANY($${paramIndex}::text[])`)
        params.push(filters.companySize)
      } else {
        whereClauses.push(`a.company_size = $${paramIndex}`)
        params.push(filters.companySize)
      }
      paramIndex++
    }

    if (filters.accountType) {
      if (Array.isArray(filters.accountType)) {
        whereClauses.push(`a.account_type = ANY($${paramIndex}::text[])`)
        params.push(filters.accountType)
      } else {
        whereClauses.push(`a.account_type = $${paramIndex}`)
        params.push(filters.accountType)
      }
      paramIndex++
    }

    if (filters.accountStatus) {
      if (Array.isArray(filters.accountStatus)) {
        whereClauses.push(`a.account_status = ANY($${paramIndex}::text[])`)
        params.push(filters.accountStatus)
      } else {
        whereClauses.push(`a.account_status = $${paramIndex}`)
        params.push(filters.accountStatus)
      }
      paramIndex++
    }

    if (filters.revenueMin !== undefined) {
      whereClauses.push(`a.annual_revenue >= $${paramIndex}`)
      params.push(filters.revenueMin)
      paramIndex++
    }

    if (filters.revenueMax !== undefined) {
      whereClauses.push(`a.annual_revenue <= $${paramIndex}`)
      params.push(filters.revenueMax)
      paramIndex++
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClauses.push(`a.tags && $${paramIndex}::text[]`)
      params.push(filters.tags)
      paramIndex++
    }

    if (filters.isActive !== undefined) {
      whereClauses.push(`a.is_active = $${paramIndex}`)
      params.push(filters.isActive)
      paramIndex++
    }

    if (filters.parentAccountId) {
      whereClauses.push(`a.parent_account_id = $${paramIndex}`)
      params.push(filters.parentAccountId)
      paramIndex++
    }

    if (filters.hasParent !== undefined) {
      whereClauses.push(filters.hasParent ? 'a.parent_account_id IS NOT NULL' : 'a.parent_account_id IS NULL')
    }

    const whereClause = whereClauses.join(' AND ')
    const offset = (page - 1) * limit

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM accounts a WHERE ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    // Get paginated results
    const validSortColumns = [
      'createdAt', 'updatedAt', 'name', 'industry', 'annualRevenue', 'lastActivityAt'
    ]
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt'
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await this.pool.query<Account>(
      `SELECT
        id,
        tenant_id as "tenantId",
        owner_id as "ownerId",
        name,
        website,
        industry,
        company_size as "companySize",
        annual_revenue as "annualRevenue",
        phone,
        email,
        description,
        account_type as "accountType",
        account_status as "accountStatus",
        parent_account_id as "parentAccountId",
        tags,
        billing_address_street as "billingAddressStreet",
        billing_address_city as "billingAddressCity",
        billing_address_state as "billingAddressState",
        billing_address_postal_code as "billingAddressPostalCode",
        billing_address_country as "billingAddressCountry",
        shipping_address_street as "shippingAddressStreet",
        shipping_address_city as "shippingAddressCity",
        shipping_address_state as "shippingAddressState",
        shipping_address_postal_code as "shippingAddressPostalCode",
        shipping_address_country as "shippingAddressCountry",
        social_linkedin as "socialLinkedin",
        social_twitter as "socialTwitter",
        social_facebook as "socialFacebook",
        employee_count as "employeeCount",
        founded_year as "foundedYear",
        stock_symbol as "stockSymbol",
        is_active as "isActive",
        last_activity_at as "lastActivityAt",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM accounts a
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    const totalPages = Math.ceil(total / limit)

    return {
      accounts: result.rows,
      total,
      page,
      limit,
      totalPages,
    }
  }

  /**
   * Update account
   */
  async update(id: string, tenantId: string, data: UpdateAccountInput): Promise<Account> {
    const fields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    const fieldMap: Record<string, string> = {
      ownerId: 'owner_id',
      name: 'name',
      website: 'website',
      industry: 'industry',
      companySize: 'company_size',
      annualRevenue: 'annual_revenue',
      phone: 'phone',
      email: 'email',
      description: 'description',
      accountType: 'account_type',
      accountStatus: 'account_status',
      parentAccountId: 'parent_account_id',
      tags: 'tags',
      billingAddressStreet: 'billing_address_street',
      billingAddressCity: 'billing_address_city',
      billingAddressState: 'billing_address_state',
      billingAddressPostalCode: 'billing_address_postal_code',
      billingAddressCountry: 'billing_address_country',
      shippingAddressStreet: 'shipping_address_street',
      shippingAddressCity: 'shipping_address_city',
      shippingAddressState: 'shipping_address_state',
      shippingAddressPostalCode: 'shipping_address_postal_code',
      shippingAddressCountry: 'shipping_address_country',
      socialLinkedin: 'social_linkedin',
      socialTwitter: 'social_twitter',
      socialFacebook: 'social_facebook',
      employeeCount: 'employee_count',
      foundedYear: 'founded_year',
      stockSymbol: 'stock_symbol',
      isActive: 'is_active',
      lastActivityAt: 'last_activity_at',
    }

    Object.entries(data).forEach(([key, value]) => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })

    fields.push(`updated_at = CURRENT_TIMESTAMP`)

    params.push(id, tenantId)

    const result = await this.pool.query<Account>(
      `UPDATE accounts
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING
        id,
        tenant_id as "tenantId",
        owner_id as "ownerId",
        name,
        website,
        industry,
        company_size as "companySize",
        annual_revenue as "annualRevenue",
        phone,
        email,
        description,
        account_type as "accountType",
        account_status as "accountStatus",
        parent_account_id as "parentAccountId",
        tags,
        billing_address_street as "billingAddressStreet",
        billing_address_city as "billingAddressCity",
        billing_address_state as "billingAddressState",
        billing_address_postal_code as "billingAddressPostalCode",
        billing_address_country as "billingAddressCountry",
        shipping_address_street as "shippingAddressStreet",
        shipping_address_city as "shippingAddressCity",
        shipping_address_state as "shippingAddressState",
        shipping_address_postal_code as "shippingAddressPostalCode",
        shipping_address_country as "shippingAddressCountry",
        social_linkedin as "socialLinkedin",
        social_twitter as "socialTwitter",
        social_facebook as "socialFacebook",
        employee_count as "employeeCount",
        founded_year as "foundedYear",
        stock_symbol as "stockSymbol",
        is_active as "isActive",
        last_activity_at as "lastActivityAt",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"`,
      params
    )

    return result.rows[0]
  }

  /**
   * Soft delete account
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE accounts
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rowCount > 0
  }

  /**
   * Find accounts by name (for duplicate checking)
   */
  async findByName(name: string, tenantId: string): Promise<Account[]> {
    const result = await this.pool.query<Account>(
      `SELECT * FROM accounts
       WHERE LOWER(name) = LOWER($1) AND tenant_id = $2 AND deleted_at IS NULL`,
      [name, tenantId]
    )

    return result.rows
  }

  /**
   * Full-text search on accounts
   */
  async search(tenantId: string, query: string, limit: number = 20): Promise<Account[]> {
    const result = await this.pool.query<Account>(
      `SELECT
        id,
        tenant_id as "tenantId",
        owner_id as "ownerId",
        name,
        website,
        industry,
        company_size as "companySize",
        annual_revenue as "annualRevenue",
        phone,
        email,
        description,
        account_type as "accountType",
        account_status as "accountStatus",
        parent_account_id as "parentAccountId",
        tags,
        is_active as "isActive",
        created_at as "createdAt",
        ts_rank(
          to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(industry, '') || ' ' || COALESCE(description, '')),
          plainto_tsquery('english', $2)
        ) as rank
      FROM accounts
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(industry, '') || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT $3`,
      [tenantId, query, limit]
    )

    return result.rows
  }

  /**
   * Bulk delete accounts
   */
  async bulkDelete(accountIds: string[], tenantId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE accounts
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1::uuid[]) AND tenant_id = $2 AND deleted_at IS NULL`,
      [accountIds, tenantId]
    )

    return result.rowCount
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(id: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `UPDATE accounts
       SET last_activity_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )
  }

  /**
   * Get account hierarchy (parent and children)
   */
  async getHierarchy(id: string, tenantId: string): Promise<Account[]> {
    const result = await this.pool.query<Account>(
      `WITH RECURSIVE account_tree AS (
        -- Get the account itself
        SELECT a.*, 0 as depth
        FROM accounts a
        WHERE a.id = $1 AND a.tenant_id = $2 AND a.deleted_at IS NULL

        UNION ALL

        -- Get all descendants
        SELECT a.*, at.depth + 1
        FROM accounts a
        INNER JOIN account_tree at ON a.parent_account_id = at.id
        WHERE a.tenant_id = $2 AND a.deleted_at IS NULL
      )
      SELECT * FROM account_tree
      ORDER BY depth, name`,
      [id, tenantId]
    )

    return result.rows
  }
}

// Export singleton instance
export const accountRepository = new AccountRepository()
