import { foo } from '$lib/utils/address.utils';
import { resetRouteParams, type RouteParams } from '$lib/utils/nav.utils';
import type { LoadEvent } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// We reset the data because the "sign" route operates without a network or token selected.
export const load: PageLoad = ({ url }: LoadEvent): RouteParams => {
	if (typeof window !== 'undefined') {
		const isPWA = window.matchMedia('(display-mode: standalone)').matches;
		const isAndroid = /Android/i.test(navigator.userAgent);

		const hasEscaped = url.searchParams.has('pwa-escape');

		// The `/sign` route does not work in the PWA for Android users
		if (isPWA && isAndroid && !hasEscaped) {
			// Open the exact same URL in the browser (escaping the PWA shell)
			foo.set(true);
			const fullUrl = new URL(window.location.href);
			fullUrl.searchParams.set('pwa-escape', '1');
			window.document.location.assign(fullUrl.toString());
			// window.open(fullUrl.toString(), '_system', 'popup=true');
		}
	}

	return resetRouteParams();
};
