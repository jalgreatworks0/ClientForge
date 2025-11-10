/**
 * Task Types & Interfaces
 * TypeScript definitions for task management and activity tracking
 */

// =====================================================
// ENUMS
// =====================================================

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  CUSTOM = 'custom',
}

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum ParticipantType {
  USER = 'user',
  CONTACT = 'contact',
  EXTERNAL = 'external',
}

export enum ParticipantRole {
  ORGANIZER = 'organizer',
  REQUIRED = 'required',
  OPTIONAL = 'optional',
  ATTENDEE = 'attendee',
}

export enum ParticipantResponseStatus {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  NO_RESPONSE = 'no_response',
}

export enum ReminderType {
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  SMS = 'sms',
}

// =====================================================
// TASK INTERFACES
// =====================================================

export interface Task {
  id: string
  tenantId: string

  // Task Details
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority

  // Assignment
  assignedTo: string | null
  createdBy: string

  // Dates
  dueDate: Date | null
  completedAt: Date | null
  startDate: Date | null

  // Related Entity (polymorphic)
  relatedEntityType: string | null
  relatedEntityId: string | null

  // Metadata
  tags: string[]

  // Timestamps
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface TaskWithRelations extends Task {
  assignee?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  creator?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

// =====================================================
// ACTIVITY INTERFACES
// =====================================================

export interface Activity {
  id: string
  tenantId: string

  // Activity Details
  type: ActivityType
  title: string
  description: string | null
  outcome: string | null

  // Related Entity (polymorphic)
  entityType: string
  entityId: string

  // Activity Metadata
  performedBy: string
  performedAt: Date
  durationMinutes: number | null

  // Email-specific fields
  emailSubject: string | null
  emailTo: string[] | null
  emailCc: string[] | null
  emailBcc: string[] | null

  // Meeting-specific fields
  meetingLocation: string | null
  meetingStartTime: Date | null
  meetingEndTime: Date | null

  // Call-specific fields
  callDirection: CallDirection | null
  callPhoneNumber: string | null

  // Metadata
  tags: string[]
  attachments: any | null

  // Timestamps
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface ActivityWithRelations extends Activity {
  performer?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  participants?: ActivityParticipant[]
}

// =====================================================
// ACTIVITY PARTICIPANT INTERFACES
// =====================================================

export interface ActivityParticipant {
  id: string
  tenantId: string
  activityId: string

  // Participant Details
  participantType: ParticipantType
  participantId: string | null
  participantEmail: string | null
  participantName: string | null

  // Participation Details
  role: ParticipantRole | null
  responseStatus: ParticipantResponseStatus | null

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// =====================================================
// TASK REMINDER INTERFACES
// =====================================================

export interface TaskReminder {
  id: string
  tenantId: string
  taskId: string

  // Reminder Details
  remindAt: Date
  reminderType: ReminderType
  isSent: boolean
  sentAt: Date | null

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// =====================================================
// INPUT TYPES (for creating/updating)
// =====================================================

export interface CreateTaskInput {
  title?: string // Made optional to match Zod schema
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: Date
  startDate?: Date
  relatedEntityType?: string
  relatedEntityId?: string
  tags?: string[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: Date
  completedAt?: Date
  startDate?: Date
  relatedEntityType?: string
  relatedEntityId?: string
  tags?: string[]
}

export interface CreateActivityInput {
  type?: ActivityType // Made optional to match Zod schema
  title?: string // Made optional to match Zod schema
  description?: string
  outcome?: string
  entityType?: string // Made optional to match Zod schema
  entityId?: string // Made optional to match Zod schema
  performedAt?: Date
  durationMinutes?: number

  // Email fields
  emailSubject?: string
  emailTo?: string[]
  emailCc?: string[]
  emailBcc?: string[]

  // Meeting fields
  meetingLocation?: string
  meetingStartTime?: Date
  meetingEndTime?: Date

  // Call fields
  callDirection?: CallDirection
  callPhoneNumber?: string

  // Metadata
  tags?: string[]
  attachments?: any
  participants?: CreateActivityParticipantInput[]
}

export interface UpdateActivityInput {
  title?: string
  description?: string
  outcome?: string
  performedAt?: Date
  durationMinutes?: number
  emailSubject?: string
  meetingLocation?: string
  meetingStartTime?: Date
  meetingEndTime?: Date
  callDirection?: CallDirection
  callPhoneNumber?: string
  tags?: string[]
  attachments?: any
}

export interface CreateActivityParticipantInput {
  participantType: ParticipantType
  participantId?: string
  participantEmail?: string
  participantName?: string
  role?: ParticipantRole
  responseStatus?: ParticipantResponseStatus
}

export interface CreateTaskReminderInput {
  taskId?: string // Made optional to match Zod schema
  remindAt?: Date // Made optional to match Zod schema
  reminderType?: ReminderType // Made optional to match Zod schema
}

// =====================================================
// LIST OPTIONS & FILTERS
// =====================================================

export interface TaskListOptions {
  page?: number // Made optional to match Zod schema
  limit?: number // Made optional to match Zod schema
  sortBy?: string // Made optional to match Zod schema
  sortOrder?: 'asc' | 'desc' // Made optional to match Zod schema
  filters?: {
    search?: string
    status?: TaskStatus
    priority?: TaskPriority
    assignedTo?: string
    createdBy?: string
    dueDateFrom?: Date
    dueDateTo?: Date
    relatedEntityType?: string
    relatedEntityId?: string
    tags?: string[]
  }
}

export interface TaskListResult {
  tasks: Task[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ActivityListOptions {
  page?: number // Made optional to match Zod schema
  limit?: number // Made optional to match Zod schema
  sortBy?: string // Made optional to match Zod schema
  sortOrder?: 'asc' | 'desc' // Made optional to match Zod schema
  filters?: {
    search?: string
    type?: ActivityType
    entityType?: string
    entityId?: string
    performedBy?: string
    performedAtFrom?: Date
    performedAtTo?: Date
    tags?: string[]
  }
}

export interface ActivityListResult {
  activities: Activity[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// =====================================================
// BULK OPERATION TYPES
// =====================================================

export type TaskBulkOperation =
  | 'update'
  | 'delete'
  | 'assign'
  | 'change_status'
  | 'change_priority'
  | 'add_tags'
  | 'remove_tags'

export interface BulkTaskOperationInput {
  taskIds?: string[] // Made optional to match Zod schema - will be validated at runtime
  operation?: TaskBulkOperation // Made optional to match Zod schema
  data?: {
    status?: TaskStatus
    priority?: TaskPriority
    assignedTo?: string
    tags?: string[]
  }
}

export interface BulkOperationResult {
  success: number
  failed: number
  errors?: Array<{ id: string; error: string }>
}

// =====================================================
// STATISTICS TYPES
// =====================================================

export interface TaskStatistics {
  totalTasks: number
  pendingTasks: number
  inProgressTasks: number
  completedTasks: number
  cancelledTasks: number
  onHoldTasks: number
  overdueTasks: number
  dueTodayTasks: number
  dueThisWeekTasks: number
  byPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  byAssignee: Array<{
    userId: string
    userName: string
    taskCount: number
  }>
  completionRate: number
  averageCompletionTime: number | null
}

export interface ActivityStatistics {
  totalActivities: number
  byType: {
    call: number
    email: number
    meeting: number
    note: number
    task: number
    custom: number
  }
  byEntity: Array<{
    entityType: string
    count: number
  }>
  lastActivityDate: Date | null
  mostActiveUser: {
    userId: string
    userName: string
    activityCount: number
  } | null
}
