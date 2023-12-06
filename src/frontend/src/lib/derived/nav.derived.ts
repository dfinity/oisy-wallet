import { page } from '$app/stores';
import { derived, type Readable } from 'svelte/store';

export const routeToken: Readable<string | undefined | null> = derived(
	[page],
	([
		{
			data: { token }
		}
	]) => token
);
