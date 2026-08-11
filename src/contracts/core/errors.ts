export interface AppError {
  readonly code: string;
  readonly moduleId: string;
  readonly severity: "info" | "warning" | "error" | "fatal";
  readonly userMessage: string;
  readonly technicalMessage: string;
  readonly recoverable: boolean;
  readonly recoveryAction?: string;
}
