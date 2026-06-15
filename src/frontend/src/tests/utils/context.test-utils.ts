/**
 * Shared building blocks for mocking Svelte component contexts in tests.
 *
 * Component specs render under one or more contexts (`SEND_CONTEXT_KEY`,
 * `*_FEE_CONTEXT_KEY`, …). Historically every spec rebuilt the same context
 * `Map` inline under ad-hoc local names (`mockContext`, `createMockContext`,
 * `mockSendContext`). The `*.context.test-utils.ts` factories return a typed
 * `[key, value]` entry each, and `mockContextMap` assembles them — so a spec
 * composes contexts in one expression instead of hand-rolling a `Map`.
 */

export type MockContextEntry = [symbol | string, unknown];

export const mockContextMap = (entries: MockContextEntry[]): Map<symbol | string, unknown> =>
	new Map(entries);
