import { page } from '$app/stores';
import { derived, type Readable } from 'svelte/store';

export const walletConnectUri: Readable<OptionalNullableCanisterIdText> = derived(
	[page],
	([$page]) => {
		const {
			data: { uri }
		} = $page;

		return uri;
	}
);
