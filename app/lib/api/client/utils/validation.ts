import type { AnyOperation } from "../operations";
import type { core, ZodError, ZodType } from "zod";

export enum OperationValidationType {
  INPUT,
  OUTPUT,
}

export class OperationValidationError extends Error {
  public override name = "OperationValidationError";

  constructor(
    type: OperationValidationType,
    cause: ZodError,
    operation: AnyOperation,
  ) {
    let message = `Operation validation error in ${type === OperationValidationType.INPUT ? "input" : "output"} of "${operation.key ?? ""}"\n${stringifyZodIssues(cause.issues)}`;

    if (message.length > 500_000) {
      message = message.slice(0, 499_997) + "...";
    }

    super(message);
  }
}

export function validate<T>(
  schema: ZodType<T> | undefined,
  input: unknown,
  type: OperationValidationType,
  operation: AnyOperation,
  onValidationError?: (error: OperationValidationError) => void,
) {
  if (schema) {
    const parseResult = schema.safeParse(input);

    if (parseResult.success) {
      return parseResult.data;
    } else {
      const error = new OperationValidationError(
        type,
        parseResult.error,
        operation,
      );

      if (onValidationError) {
        onValidationError(error);
      } else {
        throw error;
      }
    }
  }

  return input as T;
}

function stringifyZodIssues(issues: core.$ZodIssue[], indent = 0) {
  const stringifiedIssues = new Set<string>();

  for (const issue of issues) {
    const { path, ...issue_ } = issue;
    let stringifiedIssue = `${path
      .map((segment) => (typeof segment === "number" ? "[]" : segment))
      .join(".")}: `;

    if (issue_.code === "invalid_union") {
      const { errors, ...issue__ } = issue_;
      stringifiedIssue += `${JSON.stringify(issue__)}\n`;
      const stringifiedUnionErrors = [];

      for (const error of errors) {
        stringifiedUnionErrors.push(stringifyZodIssues(error, indent + 1));
      }

      stringifiedIssue += stringifiedUnionErrors.join(
        `\n${"  ".repeat(indent + 1)}---\n`,
      );
    } else {
      stringifiedIssue += JSON.stringify(issue_);
    }

    stringifiedIssues.add(stringifiedIssue);
  }

  return `${"  ".repeat(indent)}${[...stringifiedIssues].join(`\n${"  ".repeat(indent)}`)}`;
}
