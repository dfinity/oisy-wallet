import { loadRouteParams, type RouteParams } from '$lib/utils/nav.utils';
import type { LoadEvent } from '@sveltejs/kit';
// eslint-disable-next-line local-rules/no-relative-imports
import type { PageLoad } from './$types';

export const load: PageLoad = ($event: LoadEvent): RouteParams => loadRouteParams($event);
