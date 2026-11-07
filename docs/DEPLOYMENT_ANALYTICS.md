# Pipeline One — Deployment Analytics & Telemetry Engine

## 1. Overview

The Deployment Analytics engine collects, aggregates, and computes pipeline reliability, duration performance, and project-wise distribution from PostgreSQL. No metrics are fabricated or hardcoded.

```
+-------------------------------------------------------------+
|                     Analytics Overview                      |
+-------------------------------------------------------------+
|  Total Runs  |  Success Rate  |  Avg Build Time  | Projects |
|      24      |      92%       |       28s        |    3     |
+-------------------------------------------------------------+
|  [Daily Trends Bar Chart]      |  [Reliability Gauge]       |
|  - Stacked Success/Fail bars   |  - SVG circular gauge      |
+-------------------------------------------------------------+
|  [Build Latency Metrics]       |  [Project Volume List]     |
|  - Fastest, Avg, Slowest       |  - Pass/Fail per project   |
+-------------------------------------------------------------+
```

---

## 2. Calculation Formulas & Queries

### 2.1 Overall Success Rate (%)
The platform calculates deployment success rate using:

$$\text{Success Rate} = \begin{cases} 0 & \text{if } \text{Total Deployments} = 0 \\ \operatorname{ROUND}\left(\frac{\text{Successful Deployments}}{\text{Total Deployments}} \times 100\right) & \text{otherwise} \end{cases}$$

SQL implementation in `analyticsService.js`:
```sql
SELECT
  COUNT(*) as total_deployments,
  COUNT(CASE WHEN status IN ('completed', 'success') THEN 1 END) as successful_deployments,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_deployments,
  ROUND(
    (COUNT(CASE WHEN status IN ('completed', 'success') THEN 1 END)::NUMERIC / 
     NULLIF(COUNT(*), 0)::NUMERIC) * 100, 1
  ) as success_rate
FROM pipeline_executions
WHERE user_id = $1 AND created_at >= $2;
```

### 2.2 Date Range Filters
Supported query intervals:
- `7d`: `NOW() - INTERVAL '7 days'`
- `30d`: `NOW() - INTERVAL '30 days'`
- `90d`: `NOW() - INTERVAL '90 days'`
- `all`: `NOW() - INTERVAL '10 years'` (All-time recorded history)

### 2.3 Build Performance Latency
Measures completed pipeline executions with positive runtime `duration_ms`:
```sql
SELECT
  COALESCE(ROUND(AVG(duration_ms)), 0) as avg_duration_ms,
  COALESCE(MIN(duration_ms), 0) as min_duration_ms,
  COALESCE(MAX(duration_ms), 0) as max_duration_ms,
  COUNT(*) as measured_runs
FROM pipeline_executions
WHERE user_id = $1 AND status IN ('completed', 'success') AND duration_ms > 0 AND created_at >= $2;
```

### 2.4 Daily Trend Aggregation
Groups runs by calendar date (`DATE_TRUNC('day', created_at)`):
```sql
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_count,
  COUNT(CASE WHEN status IN ('completed', 'success') THEN 1 END) as successful_count,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
FROM pipeline_executions
WHERE user_id = $1 AND created_at >= $2
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date ASC;
```

---

## 3. Endpoints

| Endpoint | Method | Query Params | Description |
|---|---|---|---|
| `/api/analytics/overview` | `GET` | `dateRange=30d` | Summary, daily trends, performance, project distribution |
| `/api/analytics/deployments` | `GET` | `dateRange=30d` | Daily time-series breakdown of executions |
| `/api/analytics/build-performance` | `GET` | `dateRange=30d` | Average, minimum, and maximum build runtimes |
| `/api/analytics/project-activity` | `GET` | `dateRange=30d` | Project-wise volume and reliability breakdown |
