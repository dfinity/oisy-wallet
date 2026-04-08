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

// SvelteKit route IDs don't include trailing slashes.
// The component adds one via `${from?.route?.id}/`.
const TOKENS_ROUTE_ID = `${ROUTE_ID_GROUP_APP}`;
const NFTS_ROUTE_ID = `${ROUTE_ID_GROUP_APP}/nfts`;
const EARNING_ROUTE_ID = `${ROUTE_ID_GROUP_APP}/earning`;
const TRANSACTIONS_ROUTE_ID = `${ROUTE_ID_GROUP_APP}/transactions`;
const WALLET_CONNECT_ROUTE_ID = `${ROUTE_ID_GROUP_APP}/wc`;
const SETTINGS_ROUTE_ID = `${ROUTE_ID_GROUP_APP}/settings`;
const ACTIVITY_ROUTE_ID = `${ROUTE_ID_GROUP_APP}/activity`;
const EXPLORE_ROUTE_ID = `${ROUTE_ID_GROUP_APP}/explore`;

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

	describe('filter persistence across asset tabs', () => {
		it('should preserve filter when navigating from Tokens tab', () => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'bitcoin' });
			simulateNavigationFrom(TOKENS_ROUTE_ID);

			expect(get(tokenListStore).filter).toBe('bitcoin');
		});

		it('should preserve filter when navigating from NFTs tab', () => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'punk' });
			simulateNavigationFrom(NFTS_ROUTE_ID);

			expect(get(tokenListStore).filter).toBe('punk');
		});

		it('should preserve filter when navigating from Earning tab', () => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'vault' });
			simulateNavigationFrom(EARNING_ROUTE_ID);

			expect(get(tokenListStore).filter).toBe('vault');
		});

		it('should preserve filter when navigating from Transactions page', () => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'eth' });
			simulateNavigationFrom(TRANSACTIONS_ROUTE_ID);

			expect(get(tokenListStore).filter).toBe('eth');
		});

		it('should preserve filter when navigating from WalletConnect page', () => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'test' });
			simulateNavigationFrom(WALLET_CONNECT_ROUTE_ID);

			expect(get(tokenListStore).filter).toBe('test');
		});
	});

	describe('filter reset from unrelated pages', () => {
		it('should reset filter when navigating from Settings', () => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'bitcoin' });
			simulateNavigationFrom(SETTINGS_ROUTE_ID);

			expect(get(tokenListStore).filter).toBe('');
		});

		it('should reset filter when navigating from Activity', () => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'bitcoin' });
			simulateNavigationFrom(ACTIVITY_ROUTE_ID);

			expect(get(tokenListStore).filter).toBe('');
		});

		it('should reset filter when navigating from Explore', () => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'bitcoin' });
			simulateNavigationFrom(EXPLORE_ROUTE_ID);

			expect(get(tokenListStore).filter).toBe('');
		});

		it('should reset filter when previous route is null', () => {
			render(TokensFilter);

			tokenListStore.set({ filter: 'bitcoin' });
			simulateNavigationFrom(null);

			expect(get(tokenListStore).filter).toBe('');
		});
	});
});
