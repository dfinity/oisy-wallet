import type { RouteParams } from '$lib/utils/nav.utils';
import type { LoadEvent } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// We reset
export const load: PageLoad = (_$event: LoadEvent): RouteParams => ({
	token: null,
	network: null,
	uri: null
});
