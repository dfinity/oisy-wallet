import { testnetsStore } from '$lib/stores/settings.store';
import { derived, type Readable } from 'svelte/store';

export const testnets: Readable<boolean> = derived(
	[testnetsStore],
	([$testnetsStore]) => $testnetsStore?.enabled ?? false
);
