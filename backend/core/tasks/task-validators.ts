/**
 * Task Validators
 * Zod schemas for validating task and activity inputs
 */

import { z } from 'zod'
import {
  TaskStatus,
  TaskPriority,
  ActivityType,
  CallDirection,
  ParticipantType,
  ParticipantRole,
  ParticipantResponseStatus,
  ReminderType,
  TaskBulkOperation,
} from './task-types'

// =====================================================
// TASK VALIDATION SCHEMAS
// =====================================================

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(10000, 'Description too long').optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedTo: z.string().uuid('Invalid user ID').optional(),
  dueDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  relatedEntityType: z.string().max(50).optional(),
  relatedEntityId: z.string().uuid('Invalid entity ID').optional(),
  tags: z.array(z.string().max(50)).max(20, 'Too many tags').optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().max(10000, 'Description too long').optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedTo: z.string().uuid('Invalid user ID').optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  relatedEntityType: z.string().max(50).optional().nullable(),
  relatedEntityId: z.string().uuid('Invalid entity ID').optional().nullable(),
  tags: z.array(z.string().max(50)).max(20, 'Too many tags').optional(),
})

export const taskListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: z
    .object({
      search: z.string().optional(),
      status: z.nativeEnum(TaskStatus).optional(),
      priority: z.nativeEnum(TaskPriority).optional(),
      assignedTo: z.string().uuid().optional(),
      createdBy: z.string().uuid().optional(),
      dueDateFrom: z.coerce.date().optional(),
      dueDateTo: z.coerce.date().optional(),
      relatedEntityType: z.string().optional(),
      relatedEntityId: z.string().uuid().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
})

export const bulkTaskOperationSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, 'At least one task ID required').max(100, 'Too many tasks'),
  operation: z.enum([
    'update',
    'delete',
    'assign',
    'change_status',
    'change_priority',
    'add_tags',
    'remove_tags',
  ] as const),
  data: z
    .object({
      status: z.nativeEnum(TaskStatus).optional(),
      priority: z.nativeEnum(TaskPriority).optional(),
      assignedTo: z.string().uuid('Invalid user ID').optional(),
      tags: z.array(z.string().max(50)).max(20, 'Too many tags').optional(),
    })
    .optional(),
})

// =====================================================
// ACTIVITY VALIDATION SCHEMAS
// =====================================================

export const activityParticipantSchema = z.object({
  participantType: z.nativeEnum(ParticipantType),
  participantId: z.string().uuid('Invalid participant ID').optional(),
  participantEmail: z.string().email('Invalid email').max(255).optional(),
  participantName: z.string().max(255).optional(),
  role: z.nativeEnum(ParticipantRole).optional(),
  responseStatus: z.nativeEnum(ParticipantResponseStatus).optional(),
})

export const createActivitySchema = z.object({
  type: z.nativeEnum(ActivityType),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(10000, 'Description too long').optional(),
  outcome: z.string().max(100).optional(),
  entityType: z.string().min(1, 'Entity type is required').max(50),
  entityId: z.string().uuid('Invalid entity ID'),
  performedAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().max(1440).optional(),

  // Email fields
  emailSubject: z.string().max(255).optional(),
  emailTo: z.array(z.string().email()).max(50).optional(),
  emailCc: z.array(z.string().email()).max(50).optional(),
  emailBcc: z.array(z.string().email()).max(50).optional(),

  // Meeting fields
  meetingLocation: z.string().max(255).optional(),
  meetingStartTime: z.coerce.date().optional(),
  meetingEndTime: z.coerce.date().optional(),

  // Call fields
  callDirection: z.nativeEnum(CallDirection).optional(),
  callPhoneNumber: z.string().max(50).optional(),

  // Metadata
  tags: z.array(z.string().max(50)).max(20, 'Too many tags').optional(),
  attachments: z.any().optional(),
  participants: z.array(activityParticipantSchema).max(100, 'Too many participants').optional(),
})

export const updateActivitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().max(10000, 'Description too long').optional().nullable(),
  outcome: z.string().max(100).optional().nullable(),
  performedAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().max(1440).optional().nullable(),
  emailSubject: z.string().max(255).optional().nullable(),
  meetingLocation: z.string().max(255).optional().nullable(),
  meetingStartTime: z.coerce.date().optional().nullable(),
  meetingEndTime: z.coerce.date().optional().nullable(),
  callDirection: z.nativeEnum(CallDirection).optional().nullable(),
  callPhoneNumber: z.string().max(50).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20, 'Too many tags').optional(),
  attachments: z.any().optional().nullable(),
})

export const activityListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('performedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: z
    .object({
      search: z.string().optional(),
      type: z.nativeEnum(ActivityType).optional(),
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
      performedBy: z.string().uuid().optional(),
      performedAtFrom: z.coerce.date().optional(),
      performedAtTo: z.coerce.date().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
})

// =====================================================
// TASK REMINDER VALIDATION SCHEMAS
// =====================================================

export const createTaskReminderSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  remindAt: z.coerce.date(),
  reminderType: z.nativeEnum(ReminderType),
})

// =====================================================
// SEARCH & QUERY VALIDATION SCHEMAS
// =====================================================

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(255),
  limit: z.number().int().positive().max(100).default(20),
})

// =====================================================
// ENTITY RELATIONSHIP VALIDATION
// =====================================================

export const entityActivitiesQuerySchema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: z.string().uuid('Invalid entity ID'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  type: z.nativeEnum(ActivityType).optional(),
})

export const entityTasksQuerySchema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: z.string().uuid('Invalid entity ID'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  status: z.nativeEnum(TaskStatus).optional(),
})
