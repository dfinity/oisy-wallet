import { metamaskStore } from '$lib/stores/metamask.store';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const metamaskInitialized: Readable<boolean> = derived([metamaskStore], ([{ available }]) =>
	nonNullish(available)
);
export const metamaskAvailable: Readable<boolean> = derived(
	[metamaskStore],
	([{ available }]) => available === true
);
