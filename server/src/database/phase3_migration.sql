-- ========================================================
-- PIPELINE ONE: PHASE 3 DATABASE MIGRATIONS
-- Automated CI/CD Pipeline Orchestration Engine
-- ========================================================

-- 1. Pipeline Configurations Table
CREATE TABLE IF NOT EXISTS pipeline_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    github_branch VARCHAR(255) NOT NULL DEFAULT 'main',
    build_command VARCHAR(255),
    install_command VARCHAR(255),
    output_directory VARCHAR(255) DEFAULT '.',
    node_version VARCHAR(50) DEFAULT '20',
    docker_enabled BOOLEAN DEFAULT FALSE,
    docker_publish_enabled BOOLEAN DEFAULT FALSE,
    docker_repository VARCHAR(255),
    docker_tag VARCHAR(100) DEFAULT 'latest',
    vercel_project_id VARCHAR(255),
    deployment_environment VARCHAR(50) DEFAULT 'production',
    auto_deploy_enabled BOOLEAN DEFAULT TRUE,
    webhook_secret VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pipeline_config_project UNIQUE (project_id)
);

-- Index on user and project
CREATE INDEX IF NOT EXISTS idx_pipeline_config_user ON pipeline_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_config_project ON pipeline_configurations(project_id);

-- 2. Pipeline Executions Table
CREATE TABLE IF NOT EXISTS pipeline_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    configuration_id UUID REFERENCES pipeline_configurations(id) ON DELETE SET NULL,
    repository VARCHAR(255),
    branch VARCHAR(255) NOT NULL,
    commit_sha VARCHAR(100),
    commit_message TEXT,
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'webhook', 'retry', 'api'
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_stage VARCHAR(50) DEFAULT 'queued',
    jenkins_job_name VARCHAR(255),
    jenkins_build_number INTEGER,
    docker_image VARCHAR(255),
    docker_digest VARCHAR(255),
    vercel_deployment_id VARCHAR(255),
    deployment_url VARCHAR(500),
    error_summary TEXT,
    duration_seconds INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipeline_exec_user ON pipeline_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_exec_project ON pipeline_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_exec_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_exec_created ON pipeline_executions(created_at DESC);

-- 3. Pipeline Events Table (Audit log and SSE stream buffer)
CREATE TABLE IF NOT EXISTS pipeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'state_change', 'log', 'stage_start', 'stage_complete', 'stage_fail', 'deployment_ready'
    stage VARCHAR(50),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipeline_events_execution ON pipeline_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_created ON pipeline_events(created_at ASC);

-- 4. GitHub Webhook Delivery & Idempotency Table
CREATE TABLE IF NOT EXISTS github_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    delivery_id VARCHAR(255) NOT NULL UNIQUE, -- Github X-GitHub-Delivery header (idempotency key)
    event_type VARCHAR(100) NOT NULL, -- 'push', 'ping', etc.
    commit_sha VARCHAR(100),
    branch VARCHAR(255),
    sender VARCHAR(255),
    processing_status VARCHAR(50) NOT NULL DEFAULT 'processed', -- 'processed', 'ignored', 'failed', 'duplicate'
    triggered_execution_id UUID REFERENCES pipeline_executions(id) ON DELETE SET NULL,
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_id ON github_webhook_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_webhook_project ON github_webhook_events(project_id);
