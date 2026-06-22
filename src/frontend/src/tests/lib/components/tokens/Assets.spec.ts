import Assets from '$lib/components/tokens/Assets.svelte';
import { ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SOURCES,
	PLAUSIBLE_EVENT_TRIGGERS,
	PLAUSIBLE_EVENT_VALUES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { TokenTypes } from '$lib/enums/token-types';
import * as analyticsServices from '$lib/services/analytics.services';
import type { AfterNavigate } from '@sveltejs/kit';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';

let afterNavigateCallbacks: Array<(navigation: AfterNavigate) => void> = [];

vi.mock('$app/navigation', () => ({
	afterNavigate: (fn: (navigation: AfterNavigate) => void) => {
		afterNavigateCallbacks.push(fn);
	},
	goto: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('https://oisy.com') }
}));

// SvelteKit route IDs don't include trailing slashes (e.g. `/(app)`, `/(app)/nfts`).
// The is*Path helpers normalize them internally.
const simulateNavigationFrom = (routeId: string | null) => {
	const navigation = {
		from:
			routeId !== null
				? { route: { id: routeId }, url: new URL('https://oisy.com'), params: {} }
				: null,
		to: {
			route: { id: `${ROUTE_ID_GROUP_APP}` },
			url: new URL('https://oisy.com'),
			params: {}
		},
		type: 'goto',
		willUnload: false,
		complete: Promise.resolve()
	} as unknown as AfterNavigate;

	flushSync(() => {
		for (const cb of afterNavigateCallbacks) {
			cb(navigation);
		}
	});
};

describe('Assets', () => {
	let trackEventSpy: ReturnType<typeof vi.spyOn>;

	const pageOpenEvent = {
		name: PLAUSIBLE_EVENTS.PAGE_OPEN,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.ASSETS,
			event_value: PLAUSIBLE_EVENT_VALUES.ASSETS_PAGE
		}
	};

	const autoViewEvent = (tabId: string) => ({
		name: PLAUSIBLE_EVENTS.VIEW_OPEN,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.ASSETS_TAB,
			event_value: tabId,
			location_source: PLAUSIBLE_EVENT_SOURCES.ASSETS_PAGE,
			event_trigger: PLAUSIBLE_EVENT_TRIGGERS.AUTO
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();
		afterNavigateCallbacks = [];
		trackEventSpy = vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});
	});

	it('should fire page_open and an auto view_open when entering from a non-Assets route', () => {
		render(Assets, { props: { tab: TokenTypes.TOKENS } });

		simulateNavigationFrom(`${ROUTE_ID_GROUP_APP}/activity`);

		expect(trackEventSpy).toHaveBeenCalledTimes(2);
		expect(trackEventSpy).toHaveBeenNthCalledWith(1, pageOpenEvent);
		expect(trackEventSpy).toHaveBeenNthCalledWith(2, autoViewEvent(TokenTypes.TOKENS));
	});

	it('should fire page_open and an auto view_open on initial load (from === null)', () => {
		render(Assets, { props: { tab: TokenTypes.TOKENS } });

		simulateNavigationFrom(null);

		expect(trackEventSpy).toHaveBeenCalledTimes(2);
		expect(trackEventSpy).toHaveBeenNthCalledWith(1, pageOpenEvent);
		expect(trackEventSpy).toHaveBeenNthCalledWith(2, autoViewEvent(TokenTypes.TOKENS));
	});

	it.each([
		{ label: 'Tokens tab', routeId: `${ROUTE_ID_GROUP_APP}` },
		{ label: 'NFTs tab', routeId: `${ROUTE_ID_GROUP_APP}/nfts` },
		{ label: 'Earning tab', routeId: `${ROUTE_ID_GROUP_APP}/earning` }
	])('should fire neither event when switching in from $label (intra-Assets)', ({ routeId }) => {
		render(Assets, { props: { tab: TokenTypes.TOKENS } });

		simulateNavigationFrom(routeId);

		expect(trackEventSpy).not.toHaveBeenCalled();
	});

	it.each([{ tab: TokenTypes.TOKENS }, { tab: TokenTypes.NFTS }, { tab: TokenTypes.EARNING }])(
		'should tag the auto view_open with the landing tab "$tab"',
		({ tab }) => {
			render(Assets, { props: { tab } });

			simulateNavigationFrom(null);

			expect(trackEventSpy).toHaveBeenCalledTimes(2);
			expect(trackEventSpy).toHaveBeenNthCalledWith(2, autoViewEvent(tab));
		}
	);
});
