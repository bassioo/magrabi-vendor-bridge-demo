import type { ZodTypeAny, z } from 'zod';
import { badRequest } from './errors.js';
/** Parses with zod and converts failures into the documented 400 shape. */
export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) fields[issue.path.join('.') || '_'] = issue.message;
  throw badRequest('Invalid request', fields);
}
