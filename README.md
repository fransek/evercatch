# Evercatch

[![Version](https://img.shields.io/npm/v/evercatch)](https://npmjs.com/package/evercatch)
[![Downloads](https://img.shields.io/npm/dm/evercatch.svg)](https://npmjs.com/package/evercatch)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/evercatch)](https://bundlephobia.com/package/evercatch)

No more try/catch blocks. Evercatch provides a simple API for handling errors in a functional way, using result tuples.

```bash
npm install evercatch
# or
yarn add evercatch
# or
pnpm add evercatch
```

```typescript
const [error, value] = ok(42);
const [error, value] = err(new Error("Something went wrong"));
```

## Basic usage

```typescript
function parseNumber(str: string): Result<number, Error> {
  const num = Number(str);
  if (Number.isNaN(num)) {
    return err(new Error(`"${str}" is not a number`));
  }
  return ok(num);
}

const [error, value] = parseNumber("42");
```

## Errors have to be truthy

The error is what you branch on, so it can never be falsy. `err` rejects falsy
errors at compile time, and falls back to a new `Error` at runtime:

```typescript
err(new Error("Oops")); // [Error: Oops, null]
err(); // [Error, null]

err(null); // Type error: null is falsy
err(0); // Type error: 0 is falsy

declare const maybeError: Error | null;
err(maybeError); // Type error: the error could be null
```

Values, on the other hand, are passed through untouched, so a falsy value is
still a perfectly good success:

```typescript
ok(); // [null, undefined]
ok(0); // [null, 0]
ok(null); // [null, null]
```

The same constraint applies to the types, so a result can never carry a falsy
error type. Use the exported `Truthy` constraint when writing your own generic
helpers:

```typescript
type Invalid = Result<number, Error | null>; // Type error: the error could be null

function logError<E extends Truthy<E>>(result: Result<unknown, E>) {
  const [error] = result;
  if (error) {
    console.error(error);
  }
}
```

## Advanced usage

```typescript
import { writeFileSync } from "node:fs";
import { err, fromPromise, fromThrowable, ok } from "evercatch";
import { db } from "./db";

type AppError =
  | { code: "DB"; message: string }
  | { code: "FILE"; message: string };

const writeSnapshot = fromThrowable(
  (path: string, contents: string) => writeFileSync(path, contents, "utf8"),
  () => ({ code: "FILE", message: "Could not write the report to disk" }),
);

async function exportUserReport(userId: string) {
  const [dbError, user] = await fromPromise(
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    }),
    () => ({
      code: "DB",
      message: "Could not load the user from the database",
    }),
  );

  if (dbError) return err(dbError);
  if (!user)
    return err({ code: "DB", message: `User ${userId} was not found` });

  const reportPath = `./tmp/user-${userId}.json`;
  const report = JSON.stringify(user, null, 2);

  const [fileError] = writeSnapshot(reportPath, report);
  if (fileError) return err(fileError);

  return ok(reportPath);
}

const [error, filePath] = await exportUserReport("42");

if (error) {
  console.error(error.code, error.message);
} else {
  console.log(`User report written to ${filePath}`);
}
```

[Documentation](https://fransek.github.io/evercatch/)
