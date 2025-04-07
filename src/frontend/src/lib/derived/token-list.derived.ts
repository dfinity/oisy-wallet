import { tokenListStore } from '$lib/stores/token-list.store';
import { derived, type Readable } from 'svelte/store';

export const tokenListFilter: Readable<string> = derived(
	[tokenListStore],
	([$tokenListStore]) => $tokenListStore?.filter ?? ''
);
