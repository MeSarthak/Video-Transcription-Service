import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Generic Zod-based validation middleware.
 *
 * Accepts a map of `{ body?, query?, params? }` schemas and
 * replaces the corresponding `req` properties with the parsed
 * (and potentially transformed / defaulted) values.
 *
 * Usage:
 *   router.post('/foo', validate({ body: mySchema }), controller);
 */
export function validate(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as Record<string, string>;
    }
    if (schemas.query) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).query = schemas.query.parse(req.query);
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    next();
  };
}
