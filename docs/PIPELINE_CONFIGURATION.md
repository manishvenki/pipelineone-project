# Pipeline One — Pipeline Configuration Specification

## 1. Overview

Each project in Pipeline One has an associated `pipeline_configurations` record that dictates how CI/CD pipelines build, test, containerize, and deploy the application. Configurations can be edited from the UI modal or managed programmatically via REST API.

---

## 2. Configuration Schema

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | UUID | Auto | Primary key |
| `project_id` | UUID | Required | Foreign key referencing `projects.id` |
| `branch` | String | `main` | Target branch to checkout and build |
| `auto_deploy_on_push` | Boolean | `true` | Whether pushed commits trigger builds automatically |
| `build_command` | String | Framework default | Compilation command (`npm run build` or empty) |
| `install_command` | String | Framework default | Dependency command (`npm install` or empty) |
| `output_directory` | String | Framework default | Artifact directory (`dist`, `build`, or `.`) |
| `node_version` | String | `18` | Node.js LTS version (`18`, `20`, `22`) |
| `deploy_to_vercel` | Boolean | `true` | Whether to deploy artifacts to Vercel edge |
| `vercel_project_name` | String | Project slug | Destination Vercel project name |
| `build_docker_image` | Boolean | `false` | Whether to generate Docker image during CI |
| `docker_image_name` | String | Project name | Image tag name |
| `docker_image_tag` | String | `latest` | Image tag version |
| `push_to_dockerhub` | Boolean | `false` | Push built Docker image to Docker Hub |
| `jenkins_job_name` | String | Auto | Name of Jenkins `WorkflowJob` |
| `webhook_secret` | String | Auto (Crypto) | 64-character hex secret for GitHub webhooks |

---

## 3. Intelligent Framework Defaults

When a project is created, `pipelineConfigService.js` automatically populates defaults based on detected static architecture:

- **Pure Static HTML/CSS/JS (`pure_html`):**
  - `build_command`: `""` (no compilation needed)
  - `install_command`: `""` (no dependencies)
  - `output_directory`: `"."`
- **React + Vite (`react_vite`):**
  - `build_command`: `"npm run build"`
  - `install_command`: `"npm install"`
  - `output_directory`: `"dist"`
- **Create React App (`cra`):**
  - `build_command`: `"npm run build"`
  - `install_command`: `"npm install"`
  - `output_directory`: `"build"`
- **Astro (`astro`):**
  - `build_command`: `"npm run build"`
  - `install_command`: `"npm install"`
  - `output_directory`: `"dist"`

---

## 4. API Endpoints

- `GET /api/pipelines/config/:projectId`: Retrieve project pipeline configuration.
- `POST /api/pipelines/config/:projectId`: Upsert custom configuration.
- `DELETE /api/pipelines/config/:projectId`: Reset configuration back to framework defaults.
