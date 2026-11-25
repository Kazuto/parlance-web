import type {
  CreateTaskRequest,
  ExportFormat,
  GitExportConfig,
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

/** What an export renders: its files, for which languages and entries. */
export type ExportSelectionForm = {
  files: ExportFileForm[];
  localeIds: string[];
  scopeIds: string[];
  /** Narrows each scope to the entries with any of its chosen tags */
  tagIds: string[];
  includeDrafts: boolean;
};

export type GitExportForm = ExportSelectionForm & {
  apiUrl: string;
  repository: string;
  baseBranch: string;
  branch: string;
};

export type S3ExportForm = ExportSelectionForm & {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  pathStyle: boolean;
  manifestPath: string;
  /** Hex digits of the SHA-256 in each key, 8 to 64 */
  hashLength: number;
};

export type TaskForm = {
  name: string;
  type: TaskType;
  enabled: boolean;
  schedule: ScheduleChoice;
  onApproval: boolean;
  onRelease: boolean;
  delay: number;
  ai: AiTranslateForm;
  git: GitExportForm;
  s3: S3ExportForm;
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

/** The keys of an S3 export's files unless changed, named by their hash. */
export const DEFAULT_S3_PATHS: Record<string, string> = {
  EXPORT_FORMAT_JSON: "i18n/{locale}.{hash}.json",
  EXPORT_FORMAT_PHP: "i18n/{locale}.{hash}.php",
  EXPORT_FORMAT_PO: "i18n/{locale}.{hash}.po",
};

export const DEFAULT_MANIFEST_PATH = "i18n/manifest.json";

/** A whole SHA-256 in hex; the server takes 0 for it too. */
export const FULL_HASH_LENGTH = 64;

/** What git and S3 exports save alike. */
type SavedSelection = Pick<
  GitExportConfig,
  "files" | "localeIds" | "scopeIds" | "tagIds" | "includeDrafts"
>;

/** The form of an export's files and selection, or a new one's. */
function selectionToForm(
  saved: SavedSelection | null | undefined,
  defaultPaths: Record<string, string>,
): ExportSelectionForm {
  return {
    files: saved?.files?.length
      ? saved.files.map((file) => ({
          format: file.format ?? "EXPORT_FORMAT_JSON",
          path: file.path ?? "",
        }))
      : [
          {
            format: "EXPORT_FORMAT_JSON",
            path: defaultPaths.EXPORT_FORMAT_JSON!,
          },
        ],
    localeIds: [...(saved?.localeIds ?? [])],
    scopeIds: [...(saved?.scopeIds ?? [])],
    tagIds: [...(saved?.tagIds ?? [])],
    includeDrafts: !!saved?.includeDrafts,
  };
}

/** The selection as sent, with the paths trimmed. */
function selectionToSettings(form: ExportSelectionForm): ExportSelectionForm {
  return {
    files: form.files.map((file) => ({
      format: file.format,
      path: file.path.trim(),
    })),
    localeIds: [...form.localeIds],
    scopeIds: [...form.scopeIds],
    tagIds: [...form.tagIds],
    includeDrafts: form.includeDrafts,
  };
}

/** The form for a task, or a new one of the type. */
export function taskToForm(
  task?: Task,
  type: TaskType = "TASK_TYPE_AI_TRANSLATE",
): TaskForm {
  const ai = task?.aiTranslate;
  const git = task?.gitExport;
  const s3 = task?.s3Export;

  return {
    name: task?.name ?? "",
    type: task?.type ?? type,
    // The API leaves out false values, so a missing one means off; only a new
    // task starts on.
    enabled: task ? !!task.enabled : true,
    schedule: parseSchedule(task?.schedule),
    onApproval: !!task?.events?.includes("TASK_EVENT_TRANSLATIONS_APPROVED"),
    onRelease: !!task?.events?.includes("TASK_EVENT_TRANSLATIONS_RELEASED"),
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
      ...selectionToForm(git, DEFAULT_PATHS),
    },
    s3: {
      endpoint: s3?.endpoint ?? "",
      region: s3?.region ?? "",
      bucket: s3?.bucket ?? "",
      accessKeyId: s3?.accessKeyId ?? "",
      pathStyle: !!s3?.pathStyle,
      manifestPath: s3?.manifestPath ?? DEFAULT_MANIFEST_PATH,
      hashLength: s3?.hashLength || FULL_HASH_LENGTH,
      ...selectionToForm(s3, DEFAULT_S3_PATHS),
    },
  };
}

/** Whether tasks of the type export translations, with a token or key to store. */
export function isExportType(type?: TaskType | null) {
  return type === "TASK_TYPE_GIT_EXPORT" || type === "TASK_TYPE_S3_EXPORT";
}

/** The request settings of the form; only the type's own config is sent. */
export function formToSettings(form: TaskForm): TaskSettings {
  const settings: TaskSettings = {
    name: form.name.trim(),
    enabled: form.enabled,
    schedule: buildSchedule(form.schedule),
    events: [
      ...(form.onApproval ? ["TASK_EVENT_TRANSLATIONS_APPROVED" as const] : []),
      ...(form.onRelease ? ["TASK_EVENT_TRANSLATIONS_RELEASED" as const] : []),
    ],
    eventDelayMinutes: form.delay,
  };

  if (form.type === "TASK_TYPE_AI_TRANSLATE") {
    settings.aiTranslate = { ...form.ai };
  } else if (form.type === "TASK_TYPE_S3_EXPORT") {
    settings.s3Export = {
      ...selectionToSettings(form.s3),
      endpoint: form.s3.endpoint.trim(),
      region: form.s3.region.trim(),
      bucket: form.s3.bucket.trim(),
      accessKeyId: form.s3.accessKeyId.trim(),
      pathStyle: form.s3.pathStyle,
      manifestPath: form.s3.manifestPath.trim(),
      hashLength: form.s3.hashLength,
    };
  } else {
    settings.gitExport = {
      ...selectionToSettings(form.git),
      apiUrl: form.git.apiUrl.trim(),
      repository: form.git.repository.trim(),
      baseBranch: form.git.baseBranch.trim(),
      branch: form.git.branch.trim(),
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
