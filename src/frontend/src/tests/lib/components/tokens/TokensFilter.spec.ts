import TokensFilter from '$lib/components/tokens/TokensFilter.svelte';
import { ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import { TOKEN_LIST_FILTER } from '$lib/constants/test-ids.constants';
import { tokenListStore } from '$lib/stores/token-list.store';
import type { AfterNavigate } from '@sveltejs/kit';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { get } from 'svelte/store';

let afterNavigateCallbacks: Array<(navigation: AfterNavigate) => void> = [];

vi.mock('$app/navigation', () => ({
	afterNavigate: (fn: (navigation: AfterNavigate) => void) => {
		afterNavigateCallbacks.push(fn);
	},
	goto: vi.fn()
}));

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

describe('TokensFilter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		afterNavigateCallbacks = [];
		tokenListStore.set({ filter: '' });
	});

	it('should render the filter button', () => {
		const { getByTestId } = render(TokensFilter);

		expect(getByTestId(`${TOKEN_LIST_FILTER}-open-btn`)).toBeInTheDocument();
	});

	it('should not render the filter button when hideFilter is true', () => {
		const { queryByTestId } = render(TokensFilter, { props: { hideFilter: true } });

		expect(queryByTestId(`${TOKEN_LIST_FILTER}-open-btn`)).not.toBeInTheDocument();
	});

	// SvelteKit route IDs don't include trailing slashes (e.g. `/(app)`, `/(app)/nfts`).
	// The is*Path helpers normalize them internally.
	describe('filter persistence across asset tabs', () => {
		it.each([
			{ label: 'Tokens tab', routeId: `${ROUTE_ID_GROUP_APP}` },
			{ label: 'NFTs tab', routeId: `${ROUTE_ID_GROUP_APP}/nfts` },
			{ label: 'Earning tab', routeId: `${ROUTE_ID_GROUP_APP}/earning` },
			{ label: 'Transactions page', routeId: `${ROUTE_ID_GROUP_APP}/transactions` },
			{ label: 'WalletConnect page', routeId: `${ROUTE_ID_GROUP_APP}/wc` }
		])('should preserve filter when navigating from $label', ({ routeId }) => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'bitcoin' });
			simulateNavigationFrom(routeId);

			expect(get(tokenListStore).filter).toBe('bitcoin');
		});
	});

	describe('filter reset from unrelated pages', () => {
		it.each([
			{ label: 'Settings', routeId: `${ROUTE_ID_GROUP_APP}/settings` },
			{ label: 'Activity', routeId: `${ROUTE_ID_GROUP_APP}/activity` },
			{ label: 'Explore', routeId: `${ROUTE_ID_GROUP_APP}/explore` },
			{ label: 'null (fresh load)', routeId: null }
		])('should reset filter when navigating from $label', ({ routeId }) => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'bitcoin' });
			simulateNavigationFrom(routeId);

			expect(get(tokenListStore).filter).toBe('');
		});
	});
});
