import { ResultErr, ResultOk } from "./types";

export class Err<E extends string = string> extends Error {
  label: E;

  constructor(label: E, message?: string) {
    super(message);
    this.label = label;
    this.name = "Error";
  }

  private static fromError<E extends string = string>(
    error: Error,
    label: E,
  ): Err<E> {
    const err = new Err(label, error.message);
    err.cause = error.cause;
    err.name = error.name;
    err.stack = error.stack;
    return err;
  }

  public static from<E extends string = string>(
    error: unknown,
    label: E,
  ): Err<E> {
    if (error instanceof Error) {
      return Err.fromError(error, label);
    }
    if (typeof error === "string") {
      return new Err(label, error);
    }
    try {
      return new Err(label, JSON.stringify(error));
    } catch {
      return new Err(label);
    }
  }
}

export const ok = <T = null>(value: T = null as T): ResultOk<T> => [
  null,
  value,
];

export const err = <E extends string>(
  labelOrErr: E | Err<E>,
  message?: string,
): ResultErr<E> => {
  const error =
    typeof labelOrErr === "string" ? new Err(labelOrErr, message) : labelOrErr;
  return [error, null];
};
