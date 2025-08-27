import { NEW_AGREEMENTS_ENABLED } from '$env/agreements.env';
import { resetRouteParams, type RouteParams } from '$lib/utils/nav.utils';
import { type LoadEvent , redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// We reset the data because a public route operates without a network or token selected.
export const load: PageLoad = (_$event: LoadEvent): RouteParams => {
	if (!NEW_AGREEMENTS_ENABLED) {
		redirect(302, '/');
	}

	return resetRouteParams();
};
