import type { CyclesTopUpRequest, CyclesTopUpResult } from '$icp/types/cycles-top-up';
import { writable } from 'svelte/store';

export interface LastCyclesTopUp {
	request: CyclesTopUpRequest;
	// The send that stored the request. A resend of the same request takes it over: it shares
	// the request's creation time, so the time alone cannot tell the sends apart.
	send: symbol;
	// How an answer settled the request. Without it, the request has no answer yet. It stays
	// with the request, so a modal opened on it learns of an answer that reached the modal
	// which sent it after that one was closed.
	outcome?: Exclude<CyclesTopUpResult['status'], 'unknown'>;
}

// The last top-up each principal sent, and how it was settled once answered. It outlives the
// Top up modal until the page reloads, so a later modal resends one without an answer rather
// than topping up again. Keyed by principal, since a sign-in in another tab switches this
// tab's identity without a reload.
export const lastCyclesTopUps = writable<Partial<Record<string, LastCyclesTopUp>>>({});
