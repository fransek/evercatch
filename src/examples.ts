import * as z from "zod/v4";
import { Err, err, fromAsyncThrowable, ok, safeAsync } from ".";

class ResponseError extends Error {
  response: Response;

  constructor(response: Response) {
    super(`${response.status} ${response.statusText}`);
    this.name = "ResponseError";
    this.response = response;
  }
}

Err.setGlobalObserver((error: Err) => {
  console.error(error.label);
  console.error(error.source);
});

const safeFetch = fromAsyncThrowable(fetch, "fetch_error");

export const fetchAndValidate = async <S extends z.Schema>(
  url: string,
  schema: S,
) => {
  const [fetchError, response] = await safeFetch(url);

  if (fetchError) {
    return fetchError.result();
  }

  if (!response.ok) {
    return new Err("response_not_ok", new ResponseError(response)).result();
  }

  const [parseError, parsed] = await safeAsync(
    response.json(),
    "json_parse_error",
  );

  if (parseError) {
    return parseError.result();
  }

  const { success, data, error } = schema.safeParse(parsed);

  if (!success) {
    return err("schema_validation_error", error);
  }

  return ok(data);
};

const url = "httpss://jsonplaceholder.typicode.com/posts/1";

const schema = z.object({
  userId: z.number(),
  id: z.number(),
  title: z.string(),
  body: z.string(),
});

const [error, data] = await fetchAndValidate(url, schema);

if (error) {
  console.log("Error handled");
} else {
  console.log(data);
}
