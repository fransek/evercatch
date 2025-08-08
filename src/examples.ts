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
    return err("response_not_ok", new ResponseError(response));
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

const url = "https://jsonplaceholder.typicode.com/posts/1";

const schema = z.object({
  userId: z.number(),
  id: z.number(),
  title: z.string(),
  body: z.string(),
});

const [error, data] = await fetchAndValidate(url, schema);

if (error) {
  console.error(error.source);
} else {
  console.log(data);
}
