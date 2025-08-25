import type { RouteParams } from '$lib/utils/nav.utils';
import type { LoadEvent } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// We reset the data because the "sign" route operates without a network or token selected.
export const load: PageLoad = (_$event: LoadEvent): RouteParams => ({
	token: null,
	network: null,
	uri: null
});
