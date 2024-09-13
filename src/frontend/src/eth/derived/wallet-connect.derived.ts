import { page } from '$app/stores';
import type { OptionString } from '$lib/types/string';
import { derived, type Readable } from 'svelte/store';

export const walletConnectUri: Readable<OptionString> = derived([page], ([$page]) => {
	const {
		data: { uri }
	} = $page;

	return uri;
});
