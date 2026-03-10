import { Request } from "express";

export interface PaginationQuery {
  limit?: string;
  offset?: string;
  status?: string;
}

export type PaginationRequest = Request<{}, {}, {}, PaginationQuery>;
