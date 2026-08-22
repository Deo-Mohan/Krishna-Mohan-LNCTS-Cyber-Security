# Application Profiles & Configurations

This document profiles the four security test applications built for the Zero-Trust Hybrid Datacenter / Cloud simulator. These workloads act as targets for network policies, firewall rules, and SIEM monitoring.

---

## 1. Student Portal (`apps/student`)
* **Purpose**: Provides a student-facing portal to view profiles and check account details.
* **Environment Configuration**:
  * **Port**: `8081` (inside container maps to exposed port `8081`, overridden via `PORT`)
  * **Database Host**: `DB_HOST` (default: `127.0.0.1`)
  * **Database Port**: `DB_PORT` (default: `5432` - PostgreSQL)
  * **Database User**: `DB_USER` (default: `student_user`)
  * **Database Password**: `DB_PASSWORD` (loaded dynamically via environment)
* **REST APIs**:
  * `GET /health`: Checks database TCP availability. Returns `200` with JSON status payload if healthy; returns `503` if database is down.
  * `GET /api/students`: Returns mock list of student accounts.
* **Web UI**: Serves static HTML under `public/index.html` featuring interactive health status updates and REST client queries.
* **Container Config**:
  * **Base Image**: `node:18-alpine`
  * **User**: `node` (non-root)
  * **Port Exposed**: `8081`

---

## 2. Faculty Portal (`apps/faculty`)
* **Purpose**: Provides a faculty portal to view assigned academic schedules and course details.
* **Environment Configuration**:
  * **Port**: `8082`
  * **Database Host**: `DB_HOST` (default: `127.0.0.1`)
  * **Database Port**: `DB_PORT` (default: `3306` - MySQL)
  * **Database User**: `DB_USER` (default: `faculty_user`)
  * **Database Password**: `DB_PASSWORD` (loaded dynamically via environment)
* **REST APIs**:
  * `GET /health`: Checks database TCP availability. Returns `200` or `503`.
  * `GET /api/faculty/courses`: Returns list of assigned courses.
* **Web UI**: Static HTML portal dashboard under `public/index.html`.
* **Container Config**:
  * **Base Image**: `node:18-alpine`
  * **User**: `node` (non-root)
  * **Port Exposed**: `8082`

---

## 3. Examination Portal (`apps/exam`)
* **Purpose**: Provides administrative examiners with access to questionnaires and grades database.
* **Environment Configuration**:
  * **Port**: `8083`
  * **Database Host**: `DB_HOST` (default: `127.0.0.1`)
  * **Database Port**: `DB_PORT` (default: `1521` - Oracle/SQL)
  * **Database User**: `DB_USER` (default: `exam_user`)
  * **Database Password**: `DB_PASSWORD` (loaded dynamically via environment)
* **REST APIs**:
  * `GET /health`: Checks database TCP availability. Returns `200` or `503`.
  * `GET /api/exams/questions`: Returns list of current exam questions.
* **Web UI**: Dashboard for exam questions and grades view.
* **Container Config**:
  * **Base Image**: `node:18-alpine`
  * **User**: `node` (non-root)
  * **Port Exposed**: `8083`

---

## 4. Research Portal (`apps/research`)
* **Purpose**: Provides researchers with collaboration utilities and project metadata.
* **Environment Configuration**:
  * **Port**: `8084`
  * **Database Host**: `DB_HOST` (default: `127.0.0.1`)
  * **Database Port**: `DB_PORT` (default: `5432` - PostgreSQL)
  * **Database User**: `DB_USER` (default: `research_user`)
  * **Database Password**: `DB_PASSWORD` (loaded dynamically via environment)
* **REST APIs**:
  * `GET /health`: Checks database TCP availability. Returns `200` or `503`.
  * `GET /api/research/projects`: Returns list of collaborative research projects.
* **Web UI**: Dashboard showing current research studies.
* **Container Config**:
  * **Base Image**: `node:18-alpine`
  * **User**: `node` (non-root)
  * **Port Exposed**: `8084`
