import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';
import { metamaskStore } from '../stores/metamask.store';

export const metamaskNotInitialized: Readable<boolean> = derived(
	[metamaskStore],
	([{ available }]) => isNullish(available)
);
export const metamaskAvailable: Readable<boolean> = derived(
	[metamaskStore],
	([{ available }]) => available === true
);
