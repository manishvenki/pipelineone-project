-- Pipeline One — Phase 4 Migration: Real-Time Monitoring, Stage Events & Notifications

-- 1. Pipeline Stage Events Table (Granular tracking of the 10 workflow stages)
CREATE TABLE IF NOT EXISTS pipeline_stage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    stage_status VARCHAR(50) NOT NULL DEFAULT 'waiting',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER DEFAULT 0,
    error_message TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stage_events_execution_id ON pipeline_stage_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_stage_events_stage_name ON pipeline_stage_events(stage_name);
CREATE INDEX IF NOT EXISTS idx_stage_events_status ON pipeline_stage_events(stage_status);

-- 2. In-App Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES pipeline_executions(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
