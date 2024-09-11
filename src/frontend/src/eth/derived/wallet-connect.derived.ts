import { page } from '$app/stores';
import type { OptionalNullableString } from '$lib/types/string';
import { derived, type Readable } from 'svelte/store';

export const walletConnectUri: Readable<OptionalNullableString> = derived([page], ([$page]) => {
	const {
		data: { uri }
	} = $page;

	return uri;
});
