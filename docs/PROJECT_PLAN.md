# Geora Project Plan

## Product Vision

Geora helps companies verify field work with authentic, geo-tagged proof captured from a mobile device. The app must work reliably in low-connectivity environments, preserve evidence locally, and sync safely when the internet returns.

## MVP

A field employee can:

1. Log in securely.
2. See assigned tasks.
3. Capture a proof photo from the camera.
4. Automatically attach GPS coordinates, timestamp, task details, and a local proof id.
5. Save work offline first.
6. Sync proofs automatically when internet returns.
7. See sync state for every proof.

A manager can:

1. Create and assign tasks.
2. Review submitted proofs.
3. Approve or reject proof submissions.
4. See proof metadata and verification state.

## Recommended Stack

### Mobile App

Use React Native with Expo.

Core libraries:

```txt
expo-router
expo-camera
expo-location
expo-sqlite
@react-native-community/netinfo
@tanstack/react-query
zustand
react-hook-form
axios
```

Expo is the right fit because Geora needs native camera, location, local storage, and cross-platform delivery without adding Flutter or fully native app complexity.

### Backend

Use Node.js, Express, PostgreSQL, Prisma, JWT auth, and Cloudinary for the first media storage provider.

PostgreSQL is preferred over MongoDB because Geora is relational:

```txt
Organizations -> Users -> Tasks -> Work Proofs -> Media -> Sync Logs
```

## Architecture

Geora uses local-first capture and cloud-later sync.

```txt
Employee captures proof
        |
        v
Save image reference and metadata locally
        |
        v
Create sync queue item
        |
        v
Show Pending Sync
        |
        v
Network returns
        |
        v
Upload media
        |
        v
Submit proof metadata
        |
        v
Mark local item as Synced
```

The golden rule is: never require internet to record field work.

## Data Model

### organizations

```txt
id
name
industry
created_at
updated_at
```

### users

```txt
id
name
email
phone
password_hash
role
organization_id
created_at
updated_at
```

Roles:

```txt
ADMIN
MANAGER
EMPLOYEE
```

### tasks

```txt
id
title
description
assigned_to_id
assigned_by_id
priority
status
due_date
organization_id
created_at
updated_at
```

Statuses:

```txt
PENDING
IN_PROGRESS
COMPLETED
VERIFIED
REJECTED
```

### work_proofs

```txt
id
local_uuid
task_id
user_id
image_url
latitude
longitude
address
captured_at
remarks
sync_status
verification_status
created_at
updated_at
```

Sync statuses:

```txt
PENDING
SYNCED
FAILED
```

Verification statuses:

```txt
PENDING
APPROVED
REJECTED
```

### sync_logs

```txt
id
local_record_id
operation_type
payload
retry_count
status
last_error
created_at
updated_at
```

## Mobile Folder Structure

```txt
apps/mobile/src
  app
  components
  screens
  services
    api
    auth
    sync
  store
  hooks
  database
  utils
  constants
  types
  assets
```

## Backend Folder Structure

```txt
apps/api/src
  modules
    auth
    users
    tasks
    workProofs
    sync
  middleware
  prisma
  routes
  services
  utils
  config
```

## Implementation Phases

### Phase 1: Planning, Setup, Auth

Deliverables:

```txt
Expo app shell
Express API shell
Prisma schema
JWT auth
Role-aware user model
Login/register screens
```

### Phase 2: Task Management

Deliverables:

```txt
Manager creates tasks
Manager assigns tasks
Employee sees assigned tasks
Employee updates task status
```

### Phase 3: Camera and Geo Proof

Deliverables:

```txt
Camera-only proof capture
GPS capture
Timestamp capture
Task metadata attachment
Local proof record
```

Do not support gallery upload in the MVP. Proof must come from live camera capture.

### Phase 4: Offline System

Deliverables:

```txt
Expo SQLite tables
Local task cache
Local proof store
Sync queue
Pending Sync UI
Retry status
```

### Phase 5: Cloud Sync

Deliverables:

```txt
Network detection
Queue processor
Image upload
Proof metadata submission
Idempotency with local_uuid
Retry and failure tracking
```

### Phase 6: Manager Review

Deliverables:

```txt
Proof list
Proof detail
Approve/reject
Map coordinates
Employee activity overview
```

### Phase 7: Notifications

Deliverables:

```txt
Task assigned notification
Proof approved notification
Proof rejected notification
Resubmit request
```

### Phase 8: Analytics

Deliverables:

```txt
Daily completions
Employee productivity
Location coverage
Rejection reasons
Sync failure trends
```

## Implementation Order

Follow this order:

```txt
1. UI setup
2. Auth
3. Roles
4. Task management
5. Camera
6. GPS
7. Proof submission
8. Local DB
9. Offline queue
10. Sync engine
11. Dashboard
12. Analytics
```

## Improvements Added To The Original Plan

### Idempotent Proof Sync

Every proof gets a `local_uuid`. The backend treats this as unique per user, preventing duplicate proof rows when the mobile app retries after timeout, crash, or half-complete upload.

### Proof Authenticity Score

The MVP should store authenticity signals even if it does not block submission yet:

```txt
camera_capture_only
location_accuracy
mock_location_detected
captured_at_device_time
received_at_server_time
network_type
device_id_hash
```

These signals can later produce a manager-facing confidence score.

### Server Time Comparison

Compare `captured_at` with server receive time. Large drift should be flagged for review.

### Rejection Reasons

Managers should choose a rejection reason:

```txt
Blurry photo
Wrong location
Wrong task
Incomplete work
Duplicate proof
Other
```

This turns verification into useful analytics later.

### Audit Trail

Store verification actions as audit events, not only current state. This protects trust and helps resolve disputes.

### Media Provider Abstraction

Cloudinary is the MVP media provider for proof photos and future report attachments. The mobile app captures and stores the image locally first, then the sync engine sends image bytes to the API. The API uploads to Cloudinary and stores only the returned `secure_url` and `public_id` in PostgreSQL.

Do not store proof images as base64/data URLs in the database. The database should store:

```txt
image_url
image_public_id
```

Cloudinary folder convention:

```txt
geora/work-proofs/{organization_id}/{task_id}/{local_uuid}
```

Keep Cloudinary behind a backend media service so S3 or another provider can be added later without rewriting work proof routes.

Required backend env vars:

```txt
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_PROOF_FOLDER
```

## Critical Edge Cases

Handle these from the beginning:

```txt
No internet during capture
Permission denied for camera
Permission denied for location
Low GPS accuracy
Mock location detected
App killed before sync
Upload interrupted
Duplicate retries
Expired access token
Refresh token revoked
Large image upload on slow network
Manager rejects proof after sync
```

## MVP Timeline

For one developer:

```txt
Week 1: Setup, auth, roles, tasks
Week 2: Camera, GPS, proof capture
Week 3: SQLite, sync queue, retry system
Week 4: Manager dashboard, verification, polish
```

The biggest risk is offline sync. The codebase should be shaped around it from day one, but the sync engine should be completed after proof capture works.

## MVP+ Upgrade Plan

The next version of Geora should use this scalable flow:

```txt
Task
  -> Work Session
  -> Proof Attempt
  -> Daily Report
  -> Verification
```

This allows one task to have multiple sessions, multiple proof submissions, daily report text, optional files, comments, and full verification history without redesigning the database later.

### Daily Work Report

Employees submit a text-first daily work report with proof capture. This is more practical than forcing file uploads in the field.

```txt
daily_reports
id
task_id
user_id
work_proof_id
title
report_text
submitted_at
sync_status
created_at
updated_at
```

Optional document support is modeled separately:

```txt
report_attachments
id
daily_report_id
file_url
file_name
file_type
file_size
uploaded_at
```

### Work Sessions

Employees can check in and check out for a task.

```txt
work_sessions
id
user_id
task_id
check_in_time
check_out_time
check_in_lat
check_in_long
check_out_lat
check_out_long
session_status
created_at
updated_at
```

This supports attendance, active employee tracking, and employee timeline views.

### Task Comments

Tasks should support operational communication:

```txt
task_comments
id
task_id
user_id
message
comment_type
created_at
```

Comment types:

```txt
INFO
ISSUE
BLOCKER
UPDATE
```

### Proof Versioning

Managers may reject a proof and ask for resubmission. Preserve each submission:

```txt
work_proof_attempts
id
local_uuid
task_id
proof_version
submitted_by
image_url
report_id
remarks
status
submitted_at
```

### Stronger Offline Sync

Use precise sync states:

```txt
QUEUED
UPLOADING
RETRYING
FAILED
SYNCED
CONFLICT
```

Retries should use backoff:

```txt
1 minute
5 minutes
15 minutes
30 minutes
```

If a task changes while the employee is offline, mobile submits the captured `task_version`. The API returns a conflict when it does not match the server `version_number`.

### Task Enhancements

Add:

```txt
start_date
due_date
estimated_duration_minutes
version_number
recurrence
geofence_latitude
geofence_longitude
geofence_radius_meters
checklist_items
```

Recurring tasks support daily, weekly, and monthly work. Geo-fence validation warns when proof is captured outside the allowed area. Checklist items let managers define task-specific proof requirements.

### Anti-Cheating Enhancements

MVP+ should include:

```txt
camera-only capture
GPS accuracy warnings
mock location signal storage
server/device time comparison
watermark metadata payload
future face-in-photo verification
```

### Updated Screen Map

Employee app:

```txt
Dashboard
Tasks
Proof Upload
Daily Reports
Pending Sync
Notifications
Profile
```

Manager dashboard:

```txt
Overview
Employees
Tasks
Proof Verification
Reports
Map View
Analytics
```

### Updated Implementation Order

```txt
1. UI setup
2. Auth and roles
3. Task management
4. Camera and GPS
5. Proof submission
6. Daily report text
7. Local DB
8. Offline queue
9. Sync engine
10. Work sessions
11. Task comments
12. Proof attempts and verification history
13. Dashboard widgets
14. Geo-fencing and checklists
15. Analytics
```
