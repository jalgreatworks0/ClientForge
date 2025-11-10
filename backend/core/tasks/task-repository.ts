/**
 * Task Repository
 * Data access layer for tasks and activities
 */

import { Pool } from 'pg'

import { getPool } from '../../database/postgresql/pool'

import {
  Task,
  TaskWithRelations,
  Activity,
  ActivityWithRelations,
  ActivityParticipant,
  TaskReminder,
  CreateTaskInput,
  UpdateTaskInput,
  CreateActivityInput,
  UpdateActivityInput,
  CreateActivityParticipantInput,
  CreateTaskReminderInput,
  TaskListOptions,
  TaskListResult,
  ActivityListOptions,
  ActivityListResult,
} from './task-types'

export class TaskRepository {
  private pool: Pool

  constructor() {
    this.pool = getPool()
  }

  // =====================================================
  // TASK CRUD OPERATIONS
  // =====================================================

  async create(tenantId: string, data: CreateTaskInput): Promise<Task> {
    const result = await this.pool.query<Task>(
      `INSERT INTO tasks (
        tenant_id, title, description, status, priority,
        assigned_to, created_by, due_date, start_date,
        related_entity_type, related_entity_id, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        tenantId,
        data.title,
        data.description || null,
        data.status || 'pending',
        data.priority || 'medium',
        data.assignedTo || null,
        data.assignedTo || null, // createdBy defaults to assignedTo for now
        data.dueDate || null,
        data.startDate || null,
        data.relatedEntityType || null,
        data.relatedEntityId || null,
        data.tags || [],
      ]
    )

    return this.mapTask(result.rows[0])
  }

  async findById(id: string, tenantId: string): Promise<Task | null> {
    const result = await this.pool.query<Task>(
      `SELECT * FROM tasks
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] ? this.mapTask(result.rows[0]) : null
  }

  async findByIdWithRelations(id: string, tenantId: string): Promise<TaskWithRelations | null> {
    const result = await this.pool.query<any>(
      `SELECT
        t.*,
        json_build_object(
          'id', u1.id,
          'firstName', u1.first_name,
          'lastName', u1.last_name,
          'email', u1.email
        ) as assignee,
        json_build_object(
          'id', u2.id,
          'firstName', u2.first_name,
          'lastName', u2.last_name,
          'email', u2.email
        ) as creator
       FROM tasks t
       LEFT JOIN users u1 ON t.assigned_to = u1.id AND u1.deleted_at IS NULL
       LEFT JOIN users u2 ON t.created_by = u2.id AND u2.deleted_at IS NULL
       WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] ? this.mapTaskWithRelations(result.rows[0]) : null
  }

  async list(tenantId: string, options: TaskListOptions): Promise<TaskListResult> {
    const { page, limit, sortBy, sortOrder, filters } = options
    const offset = (page - 1) * limit

    const whereConditions: string[] = ['t.tenant_id = $1', 't.deleted_at IS NULL']
    const params: any[] = [tenantId]
    let paramIndex = 2

    // Build WHERE clause from filters
    if (filters) {
      if (filters.search) {
        whereConditions.push(`(
          t.title ILIKE $${paramIndex} OR
          t.description ILIKE $${paramIndex}
        )`)
        params.push(`%${filters.search}%`)
        paramIndex++
      }

      if (filters.status) {
        whereConditions.push(`t.status = $${paramIndex}`)
        params.push(filters.status)
        paramIndex++
      }

      if (filters.priority) {
        whereConditions.push(`t.priority = $${paramIndex}`)
        params.push(filters.priority)
        paramIndex++
      }

      if (filters.assignedTo) {
        whereConditions.push(`t.assigned_to = $${paramIndex}`)
        params.push(filters.assignedTo)
        paramIndex++
      }

      if (filters.createdBy) {
        whereConditions.push(`t.created_by = $${paramIndex}`)
        params.push(filters.createdBy)
        paramIndex++
      }

      if (filters.dueDateFrom) {
        whereConditions.push(`t.due_date >= $${paramIndex}`)
        params.push(filters.dueDateFrom)
        paramIndex++
      }

      if (filters.dueDateTo) {
        whereConditions.push(`t.due_date <= $${paramIndex}`)
        params.push(filters.dueDateTo)
        paramIndex++
      }

      if (filters.relatedEntityType) {
        whereConditions.push(`t.related_entity_type = $${paramIndex}`)
        params.push(filters.relatedEntityType)
        paramIndex++
      }

      if (filters.relatedEntityId) {
        whereConditions.push(`t.related_entity_id = $${paramIndex}`)
        params.push(filters.relatedEntityId)
        paramIndex++
      }

      if (filters.tags && filters.tags.length > 0) {
        whereConditions.push(`t.tags && $${paramIndex}::text[]`)
        params.push(filters.tags)
        paramIndex++
      }
    }

    const whereClause = whereConditions.join(' AND ')

    // Count query
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM tasks t WHERE ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    // Data query
    const dataResult = await this.pool.query<Task>(
      `SELECT t.* FROM tasks t
       WHERE ${whereClause}
       ORDER BY t.${this.sanitizeSortBy(sortBy)} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    return {
      tasks: dataResult.rows.map((row) => this.mapTask(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async update(id: string, tenantId: string, data: UpdateTaskInput): Promise<Task> {
    const fields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    // Build SET clause dynamically
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = this.camelToSnake(key)
        fields.push(`${snakeKey} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })

    if (fields.length === 0) {
      throw new Error('No fields to update')
    }

    params.push(id, tenantId)

    const result = await this.pool.query<Task>(
      `UPDATE tasks
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      throw new Error('Task not found')
    }

    return this.mapTask(result.rows[0])
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    )
  }

  async bulkDelete(ids: string[], tenantId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE tasks SET deleted_at = NOW()
       WHERE id = ANY($1::uuid[]) AND tenant_id = $2 AND deleted_at IS NULL`,
      [ids, tenantId]
    )
    return result.rowCount || 0
  }

  async search(tenantId: string, query: string, limit: number): Promise<Task[]> {
    const result = await this.pool.query<Task>(
      `SELECT * FROM tasks
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
         @@ plainto_tsquery('english', $2)
       ORDER BY created_at DESC
       LIMIT $3`,
      [tenantId, query, limit]
    )

    return result.rows.map((row) => this.mapTask(row))
  }

  // =====================================================
  // ACTIVITY CRUD OPERATIONS
  // =====================================================

  async createActivity(tenantId: string, userId: string, data: CreateActivityInput): Promise<Activity> {
    const result = await this.pool.query<Activity>(
      `INSERT INTO activities (
        tenant_id, type, title, description, outcome,
        entity_type, entity_id, performed_by, performed_at, duration_minutes,
        email_subject, email_to, email_cc, email_bcc,
        meeting_location, meeting_start_time, meeting_end_time,
        call_direction, call_phone_number, tags, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        tenantId,
        data.type,
        data.title,
        data.description || null,
        data.outcome || null,
        data.entityType,
        data.entityId,
        userId,
        data.performedAt || new Date(),
        data.durationMinutes || null,
        data.emailSubject || null,
        data.emailTo || null,
        data.emailCc || null,
        data.emailBcc || null,
        data.meetingLocation || null,
        data.meetingStartTime || null,
        data.meetingEndTime || null,
        data.callDirection || null,
        data.callPhoneNumber || null,
        data.tags || [],
        data.attachments ? JSON.stringify(data.attachments) : null,
      ]
    )

    const activity = this.mapActivity(result.rows[0])

    // Create participants if provided
    if (data.participants && data.participants.length > 0) {
      await this.addActivityParticipants(activity.id, tenantId, data.participants)
    }

    return activity
  }

  async findActivityById(id: string, tenantId: string): Promise<Activity | null> {
    const result = await this.pool.query<Activity>(
      `SELECT * FROM activities
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] ? this.mapActivity(result.rows[0]) : null
  }

  async listActivities(tenantId: string, options: ActivityListOptions): Promise<ActivityListResult> {
    const { page, limit, sortBy, sortOrder, filters } = options
    const offset = (page - 1) * limit

    const whereConditions: string[] = ['a.tenant_id = $1', 'a.deleted_at IS NULL']
    const params: any[] = [tenantId]
    let paramIndex = 2

    // Build WHERE clause from filters
    if (filters) {
      if (filters.search) {
        whereConditions.push(`(
          a.title ILIKE $${paramIndex} OR
          a.description ILIKE $${paramIndex} OR
          a.email_subject ILIKE $${paramIndex}
        )`)
        params.push(`%${filters.search}%`)
        paramIndex++
      }

      if (filters.type) {
        whereConditions.push(`a.type = $${paramIndex}`)
        params.push(filters.type)
        paramIndex++
      }

      if (filters.entityType) {
        whereConditions.push(`a.entity_type = $${paramIndex}`)
        params.push(filters.entityType)
        paramIndex++
      }

      if (filters.entityId) {
        whereConditions.push(`a.entity_id = $${paramIndex}`)
        params.push(filters.entityId)
        paramIndex++
      }

      if (filters.performedBy) {
        whereConditions.push(`a.performed_by = $${paramIndex}`)
        params.push(filters.performedBy)
        paramIndex++
      }

      if (filters.performedAtFrom) {
        whereConditions.push(`a.performed_at >= $${paramIndex}`)
        params.push(filters.performedAtFrom)
        paramIndex++
      }

      if (filters.performedAtTo) {
        whereConditions.push(`a.performed_at <= $${paramIndex}`)
        params.push(filters.performedAtTo)
        paramIndex++
      }

      if (filters.tags && filters.tags.length > 0) {
        whereConditions.push(`a.tags && $${paramIndex}::text[]`)
        params.push(filters.tags)
        paramIndex++
      }
    }

    const whereClause = whereConditions.join(' AND ')

    // Count query
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM activities a WHERE ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    // Data query
    const dataResult = await this.pool.query<Activity>(
      `SELECT a.* FROM activities a
       WHERE ${whereClause}
       ORDER BY a.${this.sanitizeSortBy(sortBy)} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    return {
      activities: dataResult.rows.map((row) => this.mapActivity(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async updateActivity(id: string, tenantId: string, data: UpdateActivityInput): Promise<Activity> {
    const fields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    // Build SET clause dynamically
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = this.camelToSnake(key)
        fields.push(`${snakeKey} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })

    if (fields.length === 0) {
      throw new Error('No fields to update')
    }

    params.push(id, tenantId)

    const result = await this.pool.query<Activity>(
      `UPDATE activities
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      throw new Error('Activity not found')
    }

    return this.mapActivity(result.rows[0])
  }

  async deleteActivity(id: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `UPDATE activities SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    )
  }

  // =====================================================
  // ACTIVITY PARTICIPANTS
  // =====================================================

  async addActivityParticipants(
    activityId: string,
    tenantId: string,
    participants: CreateActivityParticipantInput[]
  ): Promise<void> {
    const values = participants
      .map(
        (p, idx) =>
          `($${idx * 7 + 1}, $${idx * 7 + 2}, $${idx * 7 + 3}, $${idx * 7 + 4}, $${idx * 7 + 5}, $${idx * 7 + 6}, $${idx * 7 + 7})`
      )
      .join(', ')

    const params: any[] = []
    participants.forEach((p) => {
      params.push(
        tenantId,
        activityId,
        p.participantType,
        p.participantId || null,
        p.participantEmail || null,
        p.participantName || null,
        p.role || null
      )
    })

    await this.pool.query(
      `INSERT INTO activity_participants (
        tenant_id, activity_id, participant_type, participant_id,
        participant_email, participant_name, role
      ) VALUES ${values}`,
      params
    )
  }

  async getActivityParticipants(activityId: string, tenantId: string): Promise<ActivityParticipant[]> {
    const result = await this.pool.query<ActivityParticipant>(
      `SELECT * FROM activity_participants
       WHERE activity_id = $1 AND tenant_id = $2
       ORDER BY created_at`,
      [activityId, tenantId]
    )

    return result.rows.map((row) => this.mapActivityParticipant(row))
  }

  // =====================================================
  // TASK REMINDERS
  // =====================================================

  async createTaskReminder(tenantId: string, data: CreateTaskReminderInput): Promise<TaskReminder> {
    const result = await this.pool.query<TaskReminder>(
      `INSERT INTO task_reminders (tenant_id, task_id, remind_at, reminder_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenantId, data.taskId, data.remindAt, data.reminderType]
    )

    return this.mapTaskReminder(result.rows[0])
  }

  async getTaskReminders(taskId: string, tenantId: string): Promise<TaskReminder[]> {
    const result = await this.pool.query<TaskReminder>(
      `SELECT * FROM task_reminders
       WHERE task_id = $1 AND tenant_id = $2
       ORDER BY remind_at`,
      [taskId, tenantId]
    )

    return result.rows.map((row) => this.mapTaskReminder(row))
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private mapTask(row: any): Task {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assigned_to,
      createdBy: row.created_by,
      dueDate: row.due_date,
      completedAt: row.completed_at,
      startDate: row.start_date,
      relatedEntityType: row.related_entity_type,
      relatedEntityId: row.related_entity_id,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }
  }

  private mapTaskWithRelations(row: any): TaskWithRelations {
    return {
      ...this.mapTask(row),
      assignee: row.assignee,
      creator: row.creator,
    }
  }

  private mapActivity(row: any): Activity {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type,
      title: row.title,
      description: row.description,
      outcome: row.outcome,
      entityType: row.entity_type,
      entityId: row.entity_id,
      performedBy: row.performed_by,
      performedAt: row.performed_at,
      durationMinutes: row.duration_minutes,
      emailSubject: row.email_subject,
      emailTo: row.email_to,
      emailCc: row.email_cc,
      emailBcc: row.email_bcc,
      meetingLocation: row.meeting_location,
      meetingStartTime: row.meeting_start_time,
      meetingEndTime: row.meeting_end_time,
      callDirection: row.call_direction,
      callPhoneNumber: row.call_phone_number,
      tags: row.tags || [],
      attachments: row.attachments ? JSON.parse(row.attachments) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }
  }

  private mapActivityParticipant(row: any): ActivityParticipant {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      activityId: row.activity_id,
      participantType: row.participant_type,
      participantId: row.participant_id,
      participantEmail: row.participant_email,
      participantName: row.participant_name,
      role: row.role,
      responseStatus: row.response_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapTaskReminder(row: any): TaskReminder {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      taskId: row.task_id,
      remindAt: row.remind_at,
      reminderType: row.reminder_type,
      isSent: row.is_sent,
      sentAt: row.sent_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }

  private sanitizeSortBy(sortBy: string): string {
    const allowedFields = [
      'created_at',
      'updated_at',
      'title',
      'status',
      'priority',
      'due_date',
      'performed_at',
    ]
    const snakeCase = this.camelToSnake(sortBy)
    return allowedFields.includes(snakeCase) ? snakeCase : 'created_at'
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository()
