/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, errorFrom, ok } from "./result";
import { Result, ResultErr, ResultFn } from "./types";

export const safe = <T, E = Error>(
  fn: () => T,
  factory?: (error: unknown) => E,
): Result<T, E> => {
  try {
    return ok(fn());
  } catch (error) {
    if (factory) {
      return err(factory(error));
    }
    return err(errorFrom(error)) as ResultErr<E>;
  }
};

export const unsafe = <T, E>(result: Result<T, E>): T => {
  const [error, value] = result;
  if (error) {
    throw error;
  }
  return value as T;
};

export const fromThrowable = <A extends any[], T, E = Error>(
  fn: (...args: A) => T,
  factory?: (error: unknown) => E,
): ResultFn<A, T, E> => {
  return (...args: A): Result<T, E> => {
    return safe(() => fn(...args), factory);
  };
};
