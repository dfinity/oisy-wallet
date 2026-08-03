import type { PLAUSIBLE_EVENT_SUBCONTEXT_INFRASTRUCTURE } from '$lib/enums/plausible';
import { replaceIcErrorFields } from '$lib/utils/error.utils';
import { writable, type Readable } from 'svelte/store';

export interface InfrastructureError {
	// What could not be loaded. Shown to the user in the expandable details, and mirrored
	// as the analytics subcontext so a dashboard and a support ticket describe the same thing.
	operation: PLAUSIBLE_EVENT_SUBCONTEXT_INFRASTRUCTURE;
	// Sanitised error text, safe to display: IC request IDs are stripped, since they are
	// unique per request and only add noise to a screenshot pasted into a support thread.
	detail?: string;
}

export interface InfrastructureErrorStore extends Readable<InfrastructureError | undefined> {
	set: (params: { operation: PLAUSIBLE_EVENT_SUBCONTEXT_INFRASTRUCTURE; err: unknown }) => void;
	reset: () => void;
}

/**
 * The one unrecoverable "OISY cannot reach the Internet Computer" condition, if any.
 *
 * Holds a value only while a *blocking* failure stands — it is what makes the app render
 * `InfrastructureErrorPage` instead of itself. Background failures that leave the wallet
 * usable must not set it, or a working session would be taken over by a full-page error.
 *
 * Reset whenever the same operation subsequently succeeds, so a session that recovered on
 * its own (a reconnected laptop, a retried load) does not keep showing a stale page.
 */
const initInfrastructureErrorStore = (): InfrastructureErrorStore => {
	const { subscribe, set } = writable<InfrastructureError | undefined>(undefined);

	return {
		subscribe,

		set: ({ operation, err }) => {
			set({ operation, detail: replaceIcErrorFields(err) });
		},

		reset: () => {
			set(undefined);
		}
	};
};

export const infrastructureError = initInfrastructureErrorStore();
