import { page } from '$app/stores';
import type { OptionalNullableString } from '$lib/types/string';
import { derived, type Readable } from 'svelte/store';

export const routeToken: Readable<OptionalNullableString> = derived(
	[page],
	([
		{
			data: { token }
		}
	]) => token
);

export const routeNetwork: Readable<OptionalNullableString> = derived(
	[page],
	([
		{
			data: { network }
		}
	]) => network
);
