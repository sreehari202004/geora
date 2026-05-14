export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'REJECTED';

export type SyncStatus = 'PENDING' | 'QUEUED' | 'UPLOADING' | 'RETRYING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type Task = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedDurationMinutes?: number | null;
  versionNumber?: number;
  recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  geofenceLatitude?: number | null;
  geofenceLongitude?: number | null;
  geofenceRadiusMeters?: number | null;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
};

export type ManagedTask = Task & {
  assignedTo: Employee;
};

export type PendingProof = {
  id: string;
  localUuid: string;
  imageUrl?: string | null;
  latitude: number;
  longitude: number;
  locationAccuracy?: number | null;
  outsideGeofence?: boolean;
  capturedAt: string;
  remarks?: string | null;
  verificationStatus: VerificationStatus;
  dailyReport?: {
    id: string;
    title: string;
    reportText: string;
    submittedAt: string;
    attachments?: ReportAttachment[];
  } | null;
  attempts?: {
    id: string;
    proofVersion: number;
    status: VerificationStatus;
    submittedAt: string;
  }[];
  task: Task;
  user: Employee;
};

export type LocalProof = {
  localUuid: string;
  taskId: string;
  imageUri: string;
  latitude: number;
  longitude: number;
  locationAccuracy?: number | null;
  outsideGeofence?: boolean;
  capturedAt: string;
  remarks?: string;
  taskVersion?: number;
  reportTitle?: string;
  reportText?: string;
  reportAttachments?: ReportAttachmentDraft[];
  syncStatus: SyncStatus;
  verificationStatus: VerificationStatus;
};

export type ReportAttachmentDraft = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export type ReportAttachment = {
  id: string;
  fileUrl: string;
  filePublicId?: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
};

export type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  taskTitle: string;
  occurredAt: string;
};

export type ManagerMapPoint = {
  id: string;
  taskTitle: string;
  employeeName: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  verificationStatus: VerificationStatus;
  outsideGeofence: boolean;
};

export type ManagerDashboard = {
  tasksByStatus: Record<string, number>;
  pendingReviews: number;
  activeSessions: number;
  reportsToday: number;
  rejectedProofs: number;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
};
