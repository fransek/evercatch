import { Err } from "./result";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ResultOk<T> = readonly [null, T];
export type ResultErr<E extends string = string> = readonly [Err<E>, null];
export type Result<T, E extends string = string> = ResultOk<T> | ResultErr<E>;
export type ResultFn<
  A extends any[] = any[],
  T = any,
  E extends string = string,
> = (...args: A) => Result<T, E>;
export type ResultAsync<T, E extends string = string> = Promise<Result<T, E>>;
export type ResultAsyncFn<
  A extends any[] = any[],
  T = any,
  E extends string = string,
> = (...args: A) => ResultAsync<T, E>;
