// Aliases for names that were renamed so the standalone exports follow one
// scheme. They will be removed in a future release.
import {
  fromAsync,
  fromThrowableAsync,
  tryOrAsync,
  tryOrElseAsync,
  tryOrThrowAsync,
  unwrapOrAsync,
  unwrapOrElseAsync,
  unwrapOrThrowAsync,
} from "./async";
import { fromSync } from "./sync";
import type { NonNullishError } from "./types";

/** @deprecated Renamed to {@link fromSync}. */
export const resultFrom = fromSync;
/** @deprecated Renamed to {@link fromAsync}. */
export const fromPromise = fromAsync;
/** @deprecated Renamed to {@link fromThrowableAsync}. */
export const fromAsyncThrowable = fromThrowableAsync;
/** @deprecated Renamed to {@link unwrapOrAsync}. */
export const unwrapAsyncOr = unwrapOrAsync;
/** @deprecated Renamed to {@link unwrapOrElseAsync}. */
export const unwrapAsyncOrElse = unwrapOrElseAsync;
/** @deprecated Renamed to {@link unwrapOrThrowAsync}. */
export const unwrapAsyncOrThrow = unwrapOrThrowAsync;
/** @deprecated Renamed to {@link tryOrAsync}. */
export const tryPromiseOr = tryOrAsync;
/** @deprecated Renamed to {@link tryOrElseAsync}. */
export const tryPromiseOrElse = tryOrElseAsync;
/** @deprecated Renamed to {@link tryOrThrowAsync}. */
export const tryPromiseOrThrow = tryOrThrowAsync;
/** @deprecated Renamed to {@link NonNullishError}. */
export type NotNullish<E> = NonNullishError<E>;
