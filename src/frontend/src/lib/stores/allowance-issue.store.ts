import { writable, type Readable } from 'svelte/store';

// Allowance issue, as the OISY allowance spec defines it: set when the allowance request (AR) that
// follows an insufficient allowance is refused, and cleared when an AR is granted or skipped.
// `refusedAt` is the time of the last refused AR, which starts the AR cooldown.
export interface AllowanceIssue {
	refusedAt: number;
}

export interface AllowanceIssueStore extends Readable<AllowanceIssue | undefined> {
	setRefused: () => void;
	clear: () => void;
}

const initAllowanceIssueStore = (): AllowanceIssueStore => {
	const { subscribe, set } = writable<AllowanceIssue | undefined>(undefined);

	return {
		subscribe,

		setRefused: () => set({ refusedAt: Date.now() }),

		clear: () => set(undefined)
	};
};

export const allowanceIssueStore = initAllowanceIssueStore();
