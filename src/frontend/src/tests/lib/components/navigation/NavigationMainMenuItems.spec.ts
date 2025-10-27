import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import NavigationMainMenuItems from '$lib/components/navigation/NavigationMenuMainItems.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import {
	NAVIGATION_ITEM_ACTIVITY,
	NAVIGATION_ITEM_EXPLORER,
	NAVIGATION_ITEM_REWARDS,
	NAVIGATION_ITEM_SETTINGS,
	NAVIGATION_ITEM_TOKENS
} from '$lib/constants/test-ids.constants';
import * as networkDerived from '$lib/derived/network.derived';
import { TokenTypes } from '$lib/enums/token-types';
import { mockNftPagesContext } from '$tests/mocks/nfts.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.spyOn(networkDerived, 'networkId', 'get').mockReturnValue(readable(ETHEREUM_NETWORK_ID));

describe('NavigationMainMenuItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders all basic navigation items', () => {
		const { getByTestId } = render(NavigationMainMenuItems, {
			context: mockNftPagesContext({})
		});

		expect(getByTestId(NAVIGATION_ITEM_TOKENS)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_ACTIVITY)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_EXPLORER)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_REWARDS)).toBeInTheDocument();
		expect(getByTestId(NAVIGATION_ITEM_SETTINGS)).toBeInTheDocument();
	});

	it('builds token link with NFTs path when assetsTab = NFTS', () => {
		const { getByTestId } = render(NavigationMainMenuItems, {
			context: mockNftPagesContext({ assetsTab: TokenTypes.NFTS })
		});

		const tokenLink = getByTestId(NAVIGATION_ITEM_TOKENS);

		expect(tokenLink.getAttribute('href')).toContain(AppPath.Nfts);
	});

	it('builds token link with Tokens path when assetsTab = TOKENS', () => {
		const { getByTestId } = render(NavigationMainMenuItems, {
			context: mockNftPagesContext({ assetsTab: TokenTypes.TOKENS })
		});

		const tokenLink = getByTestId(NAVIGATION_ITEM_TOKENS);

		expect(tokenLink.getAttribute('href')).toContain(AppPath.Tokens);
	});
});
