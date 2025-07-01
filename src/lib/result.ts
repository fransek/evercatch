import { ResultErr, ResultOk } from "./types";

export function errorFrom(source: unknown): Error {
  if (source instanceof Error) {
    return source;
  }
  const options: ErrorOptions = { cause: source };
  if (typeof source === "string") {
    return new Error(source, options);
  }
  try {
    return new Error(JSON.stringify(source), options);
  } catch {
    return new Error(String(source), options);
  }
}

export const ok = <T = null>(value: T = null as T): ResultOk<T> => [
  null,
  value,
];

export function err(message: string): ResultErr<Error>;
export function err<E>(error: E): ResultErr<E>;
export function err<E>(messageOrError: E): ResultErr<E> {
  const error =
    typeof messageOrError === "string"
      ? new Error(messageOrError)
      : messageOrError;
  return [error as E, null];
}
