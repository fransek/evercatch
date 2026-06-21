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
