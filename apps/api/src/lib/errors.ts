export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}
export const notFound = (what = 'Not found') => new HttpError(404, 'not_found', what);
export const badRequest = (message: string, fields?: Record<string, string>) => new HttpError(400, 'bad_request', message, fields);
export const unauthorized = (message = 'Sign in required') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'Not allowed') => new HttpError(403, 'forbidden', message);
export const conflict = (message: string) => new HttpError(409, 'conflict', message);
export const unprocessable = (message: string, fields?: Record<string, string>) => new HttpError(422, 'unprocessable', message, fields);
