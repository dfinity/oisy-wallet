import { loadRouteParams, type RouteParams } from '$lib/utils/nav.utils';
import type { LoadEvent } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ($event: LoadEvent): RouteParams => loadRouteParams($event);

// we dont have the collection ids during build time so we need to disable prerender for dynamic routes
export const prerender = false;
