import { ZodError } from 'zod';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (result.success) {
      if (source === 'query') {
        req.validatedQuery = result.data;
      } else {
        req[source] = result.data;
      }
      return next();
    }

    return next(
      new ZodError(
        result.error.issues.map((issue) => ({ ...issue, path: [source, ...issue.path] })),
      ),
    );
  };
}
