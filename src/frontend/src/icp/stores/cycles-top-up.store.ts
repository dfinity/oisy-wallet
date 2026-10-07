import type { CyclesTopUpRequest } from '$icp/types/cycles-top-up';
import { writable } from 'svelte/store';

// The last top-up that got no answer, with the principal that sent it. It outlives the Top
// up modal until the page reloads, so a later modal resends it rather than topping up again.
export const unansweredCyclesTopUp = writable<
	{ principal: string; request: CyclesTopUpRequest } | undefined
>(undefined);
