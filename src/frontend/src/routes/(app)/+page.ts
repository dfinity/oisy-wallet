import type { RouteToken } from '$lib/utils/nav.utils';
import { loadRouteToken } from '$lib/utils/nav.utils';
import type { LoadEvent } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ($event: LoadEvent): RouteToken => loadRouteToken($event);
