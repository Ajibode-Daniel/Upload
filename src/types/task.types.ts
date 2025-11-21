export enum TaskStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum FileType {
  CSV = 'csv',
  PDF = 'pdf',
  IMAGE = 'image'
}

export interface Task {
  id: string;
  fileName: string;
  fileType: FileType;
  filePath: string;
  fileSize: number;
  status: TaskStatus;
  progress: number;
  resultData: any | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface CreateTaskDTO {
  fileName: string;
  fileType: FileType;
  filePath: string;
  fileSize: number;
}

export interface UpdateTaskDTO {
  status?: TaskStatus;
  progress?: number;
  resultData?: any;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  progress: number;
  result: any | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}
