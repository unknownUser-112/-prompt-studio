import type { Query } from "../../contracts/core/messages";

export interface LoadProjectPayload { readonly projectId: string; }

export const getActiveProjectQuery = (): Query<Record<never, never>, unknown> => ({ type: "project/get-active", payload: {} });
export const loadProjectQuery = (payload: LoadProjectPayload): Query<LoadProjectPayload, unknown> => ({ type: "project/load", payload });
export const listProjectsQuery = (): Query<Record<never, never>, unknown> => ({ type: "project/list", payload: {} });
