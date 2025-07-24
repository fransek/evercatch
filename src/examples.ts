import * as z from "zod/v4";
import { err, fromAsyncThrowable, ok, safeAsync } from ".";

class ResponseError extends Error {
  response: Response;

  constructor(response: Response) {
    super(`${response.status} ${response.statusText}`);
    this.name = "ResponseError";
    this.response = response;
  }
}

const safeFetch = fromAsyncThrowable(fetch, "FETCH_ERROR");

export const fetchAndValidate = async <S extends z.Schema>(
  url: string,
  schema: S,
) => {
  const [fetchError, response] = await safeFetch(url);

  if (fetchError) {
    return err(fetchError);
  }

  if (!response.ok) {
    return err("RESPONSE_NOT_OK", new ResponseError(response));
  }

  const [parseError, parsed] = await safeAsync(
    response.json(),
    "JSON_PARSE_ERROR",
  );

  if (parseError) {
    return err(parseError);
  }

  const { success, data, error } = schema.safeParse(parsed);

  if (!success) {
    return err("SCHEMA_VALIDATION_ERROR", error);
  }

  return ok(data);
};

const url = "https://jsonplaceholder.typicode.com/posts/1";

const schema = z.object({
  userIds: z.number(),
  id: z.number(),
  title: z.string(),
  body: z.string(),
});

const [error, data] = await fetchAndValidate(url, schema);

if (error) {
  if (error.label === "SCHEMA_VALIDATION_ERROR") {
    console.error("Schema validation failed:", error.source.type);
  } else {
    console.error(error.source);
  }
} else {
  console.log(data);
}
