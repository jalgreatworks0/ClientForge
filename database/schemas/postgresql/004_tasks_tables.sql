-- =====================================================
-- Tasks & Activities Schema
-- Week 7-8: Task Management and Activity Tracking
-- =====================================================

-- =====================================================
-- TASKS TABLE
-- Core task management with assignments and due dates
-- =====================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Task Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled, on_hold
  priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent

  -- Assignment
  assigned_to UUID, -- References users.id
  created_by UUID NOT NULL, -- References users.id

  -- Dates
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,

  -- Related Entity (polymorphic relationship)
  related_entity_type VARCHAR(50), -- contact, account, deal, etc.
  related_entity_id UUID,

  -- Metadata
  tags TEXT[], -- Array of tags

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Indexes
  CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Indexes for tasks
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_created_by ON tasks(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority ON tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_related_entity ON tasks(related_entity_type, related_entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_tasks_search ON tasks USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
) WHERE deleted_at IS NULL;

-- =====================================================
-- ACTIVITIES TABLE
-- Activity logging (calls, emails, meetings, notes)
-- =====================================================
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Activity Details
  type VARCHAR(50) NOT NULL, -- call, email, meeting, note, task, custom
  title VARCHAR(255) NOT NULL,
  description TEXT,
  outcome VARCHAR(100), -- completed, rescheduled, no_answer, left_voicemail, etc.

  -- Related Entity (polymorphic relationship)
  entity_type VARCHAR(50) NOT NULL, -- contact, account, deal, etc.
  entity_id UUID NOT NULL,

  -- Activity Metadata
  performed_by UUID NOT NULL, -- References users.id
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_minutes INTEGER, -- For calls/meetings

  -- Email-specific fields
  email_subject VARCHAR(255),
  email_to TEXT[],
  email_cc TEXT[],
  email_bcc TEXT[],

  -- Meeting-specific fields
  meeting_location VARCHAR(255),
  meeting_start_time TIMESTAMP WITH TIME ZONE,
  meeting_end_time TIMESTAMP WITH TIME ZONE,

  -- Call-specific fields
  call_direction VARCHAR(20), -- inbound, outbound
  call_phone_number VARCHAR(50),

  -- Metadata
  tags TEXT[],
  attachments JSONB, -- Array of attachment metadata

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT activities_type_check CHECK (type IN ('call', 'email', 'meeting', 'note', 'task', 'custom')),
  CONSTRAINT activities_call_direction_check CHECK (call_direction IS NULL OR call_direction IN ('inbound', 'outbound'))
);

-- Indexes for activities
CREATE INDEX idx_activities_tenant_id ON activities(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_type ON activities(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_performed_by ON activities(performed_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_performed_at ON activities(performed_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_tags ON activities USING GIN(tags) WHERE deleted_at IS NULL;

-- Full-text search index for activities
CREATE INDEX idx_activities_search ON activities USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(email_subject, ''))
) WHERE deleted_at IS NULL;

-- =====================================================
-- ACTIVITY PARTICIPANTS TABLE
-- Track who participated in activities (meetings, calls)
-- =====================================================
CREATE TABLE activity_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  activity_id UUID NOT NULL,

  -- Participant Details
  participant_type VARCHAR(50) NOT NULL, -- user, contact, external
  participant_id UUID, -- References users.id or contacts.id (null for external)
  participant_email VARCHAR(255), -- For external participants
  participant_name VARCHAR(255), -- For external participants

  -- Participation Details
  role VARCHAR(50), -- organizer, required, optional, attendee
  response_status VARCHAR(50), -- accepted, declined, tentative, no_response

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT activity_participants_type_check CHECK (participant_type IN ('user', 'contact', 'external')),
  CONSTRAINT activity_participants_role_check CHECK (role IS NULL OR role IN ('organizer', 'required', 'optional', 'attendee')),
  CONSTRAINT activity_participants_response_check CHECK (response_status IS NULL OR response_status IN ('accepted', 'declined', 'tentative', 'no_response')),

  -- Foreign Keys
  CONSTRAINT fk_activity_participants_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Indexes for activity_participants
CREATE INDEX idx_activity_participants_tenant_id ON activity_participants(tenant_id);
CREATE INDEX idx_activity_participants_activity_id ON activity_participants(activity_id);
CREATE INDEX idx_activity_participants_participant ON activity_participants(participant_type, participant_id);

-- =====================================================
-- TASK REMINDERS TABLE
-- Task reminder notifications
-- =====================================================
CREATE TABLE task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  task_id UUID NOT NULL,

  -- Reminder Details
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type VARCHAR(50) NOT NULL, -- email, notification, sms
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT task_reminders_type_check CHECK (reminder_type IN ('email', 'notification', 'sms')),

  -- Foreign Keys
  CONSTRAINT fk_task_reminders_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Indexes for task_reminders
CREATE INDEX idx_task_reminders_tenant_id ON task_reminders(tenant_id);
CREATE INDEX idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX idx_task_reminders_remind_at ON task_reminders(remind_at) WHERE is_sent = false;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp for tasks
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_tasks_updated_at();

-- Update updated_at timestamp for activities
CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activities_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_activities_updated_at();

-- Auto-set completed_at when task status changes to completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_task_completed_at
BEFORE UPDATE OF status ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_task_completed_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE tasks IS 'Task management with assignments, due dates, and polymorphic entity relationships';
COMMENT ON TABLE activities IS 'Activity logging for calls, emails, meetings, and notes';
COMMENT ON TABLE activity_participants IS 'Participants in activities (meetings, calls)';
COMMENT ON TABLE task_reminders IS 'Reminders for tasks';

COMMENT ON COLUMN tasks.related_entity_type IS 'Type of related entity (contact, account, deal, etc.)';
COMMENT ON COLUMN tasks.related_entity_id IS 'ID of related entity';
COMMENT ON COLUMN activities.entity_type IS 'Type of entity this activity is associated with';
COMMENT ON COLUMN activities.entity_id IS 'ID of the entity this activity is associated with';
COMMENT ON COLUMN activities.attachments IS 'JSON array of attachment metadata (file names, URLs, etc.)';
