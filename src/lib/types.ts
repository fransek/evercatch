/* eslint-disable @typescript-eslint/no-explicit-any */
export type ResultOk<T> = readonly [null, T];
export type ResultErr<E> = readonly [E, null];
export type Result<T, E> = ResultOk<T> | ResultErr<E>;
export type ResultFn<A extends any[] = any[], T = any, E = any> = (
  ...args: A
) => Result<T, E>;
export type ResultAsync<T, E> = Promise<Result<T, E>>;
export type ResultAsyncOk<T> = Promise<ResultOk<T>>;
export type ResultAsyncErr<E> = Promise<ResultErr<E>>;
export type ResultAsyncFn<A extends any[] = any[], T = any, E = any> = (
  ...args: A
) => ResultAsync<T, E>;
