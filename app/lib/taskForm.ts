import type {
  CreateTaskRequest,
  ExportFormat,
  Task,
  TaskRunStatus,
  TaskType,
} from "~/lib/api/schemas/parlance/v1/TaskSchema";
import {
  buildSchedule,
  parseSchedule,
  type ScheduleChoice,
} from "~/lib/taskSchedule";

export type Option = { label: string; value: string };

export type AiTranslateForm = {
  sourceLocaleId: string;
  targetLocaleIds: string[];
  scopeIds: string[];
  applyTerminology: boolean;
  maxPairs: number;
  redoMachineDrafts: boolean;
};

export type ExportFileForm = { format: ExportFormat; path: string };

export type GitExportForm = {
  apiUrl: string;
  repository: string;
  baseBranch: string;
  branch: string;
  files: ExportFileForm[];
  localeIds: string[];
  scopeIds: string[];
  includeDrafts: boolean;
};

export type TaskForm = {
  name: string;
  type: TaskType;
  enabled: boolean;
  schedule: ScheduleChoice;
  onApproval: boolean;
  delay: number;
  ai: AiTranslateForm;
  git: GitExportForm;
};

/** The settings shared by creating and updating, without the type and token. */
export type TaskSettings = Omit<CreateTaskRequest, "type" | "token">;

export const DEFAULT_MAX_PAIRS = 200;

/** Where each format's files go unless changed, by the usual layouts. */
export const DEFAULT_PATHS: Record<string, string> = {
  EXPORT_FORMAT_JSON: "lang/{locale}.json",
  EXPORT_FORMAT_PHP: "lang/{locale}/messages.php",
  EXPORT_FORMAT_PO: "locale/{locale}/LC_MESSAGES/messages.po",
};

/** The form for a task, or a new one of the type. */
export function taskToForm(
  task?: Task,
  type: TaskType = "TASK_TYPE_AI_TRANSLATE",
): TaskForm {
  const ai = task?.aiTranslate;
  const git = task?.gitExport;

  return {
    name: task?.name ?? "",
    type: task?.type ?? type,
    // The API leaves out false values, so a missing one means off; only a new
    // task starts on.
    enabled: task ? !!task.enabled : true,
    schedule: parseSchedule(task?.schedule),
    onApproval: !!task?.events?.includes("TASK_EVENT_TRANSLATIONS_APPROVED"),
    delay: task ? (task.eventDelayMinutes ?? 0) : 10,
    ai: {
      sourceLocaleId: ai?.sourceLocaleId ?? "",
      targetLocaleIds: [...(ai?.targetLocaleIds ?? [])],
      scopeIds: [...(ai?.scopeIds ?? [])],
      applyTerminology: task ? !!ai?.applyTerminology : true,
      maxPairs: ai?.maxPairs || DEFAULT_MAX_PAIRS,
      redoMachineDrafts: !!ai?.redoMachineDrafts,
    },
    git: {
      apiUrl: git?.apiUrl ?? "",
      repository: git?.repository ?? "",
      baseBranch: git?.baseBranch ?? "main",
      branch: git?.branch ?? "parlance/translations",
      files: git?.files?.length
        ? git.files.map((file) => ({
            format: file.format ?? "EXPORT_FORMAT_JSON",
            path: file.path ?? "",
          }))
        : [
            {
              format: "EXPORT_FORMAT_JSON",
              path: DEFAULT_PATHS.EXPORT_FORMAT_JSON!,
            },
          ],
      localeIds: [...(git?.localeIds ?? [])],
      scopeIds: [...(git?.scopeIds ?? [])],
      includeDrafts: !!git?.includeDrafts,
    },
  };
}

/** The request settings of the form; only the type's own config is sent. */
export function formToSettings(form: TaskForm): TaskSettings {
  const settings: TaskSettings = {
    name: form.name.trim(),
    enabled: form.enabled,
    schedule: buildSchedule(form.schedule),
    events: form.onApproval ? ["TASK_EVENT_TRANSLATIONS_APPROVED"] : [],
    eventDelayMinutes: form.delay,
  };

  if (form.type === "TASK_TYPE_AI_TRANSLATE") {
    settings.aiTranslate = { ...form.ai };
  } else {
    settings.gitExport = {
      ...form.git,
      apiUrl: form.git.apiUrl.trim(),
      repository: form.git.repository.trim(),
      baseBranch: form.git.baseBranch.trim(),
      branch: form.git.branch.trim(),
      files: form.git.files.map((file) => ({
        format: file.format,
        path: file.path.trim(),
      })),
    };
  }

  return settings;
}

/** Whether a run is still to end: queued or running. */
export function isActiveRun(status?: TaskRunStatus | null) {
  return (
    status === "TASK_RUN_STATUS_QUEUED" || status === "TASK_RUN_STATUS_RUNNING"
  );
}
