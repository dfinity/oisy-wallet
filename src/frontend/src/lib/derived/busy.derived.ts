import { busy } from '$lib/stores/busy.store';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const isBusy: Readable<boolean> = derived([busy], ([$busy]) => nonNullish($busy));
