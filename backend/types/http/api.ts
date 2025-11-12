/**
 * Shared HTTP API types
 * Standard response formats and handler types for Express controllers
 */

import type { Response, RequestHandler } from 'express';

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: string; details?: unknown };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type Id = string;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ExpressHandler<
  TReq extends Record<string, unknown> = Record<string, unknown>,
  TRes = unknown
> = RequestHandler<any, ApiResponse<TRes>, TReq, any>;

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function fail(error: string, details?: unknown): ApiError {
  return { ok: false, error, details };
}
