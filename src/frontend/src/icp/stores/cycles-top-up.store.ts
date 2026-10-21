import type { CyclesTopUpRequest } from '$icp/types/cycles-top-up';
import { writable } from 'svelte/store';

export interface UnansweredCyclesTopUp {
	request: CyclesTopUpRequest;
	// The send that stored the request. A resend of the same request takes it over: it shares
	// the request's creation time, so the time alone cannot tell the sends apart.
	send: symbol;
}

// The last top-up that got no answer, for each principal that sent one. It outlives the Top
// up modal until the page reloads, so a later modal resends it rather than topping up again.
// Keyed by principal, since a sign-in in another tab switches this tab's identity without a
// reload.
export const unansweredCyclesTopUps = writable<Partial<Record<string, UnansweredCyclesTopUp>>>({});
