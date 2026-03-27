import { resetRouteParams, type RouteParams } from '$lib/utils/nav.utils';
import type { LoadEvent } from '@sveltejs/kit';
// eslint-disable-next-line local-rules/no-relative-imports
import type { PageLoad } from './$types';

// We reset the data because the "sign" route operates without a network or token selected.
export const load: PageLoad = (_$event: LoadEvent): RouteParams => resetRouteParams();
