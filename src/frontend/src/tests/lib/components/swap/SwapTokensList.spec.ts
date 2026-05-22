import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import {
	swapSupportedTokensStore,
	type SwapSupportedTokensData
} from '$lib/stores/swap-supported-tokens.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapTokensList', () => {
	const props = {
		onSelectToken: () => {},
		onSelectNetworkFilter: () => {},
		onCloseTokensList: () => {}
	};

	const destinationProps = { ...props, side: 'destination' as const };

	const mockContext = ({
		sourceToken,
		receiveSupportedData
	}: {
		sourceToken?: Token;
		receiveSupportedData?: SwapSupportedTokensData;
	} = {}) => {
		const result = new Map();

		result.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable(sourceToken),
			destinationToken: readable(mockValidIcCkToken),
			destinationTokenExchangeRate: readable(0.00002),
			receiveSupportedData: readable(receiveSupportedData)
		});

		result.set(MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [ICP_TOKEN] }));

		return result;
	};

	beforeEach(() => {
		swapSupportedTokensStore.reset();
	});

	it('renders tokens list', () => {
		const { getByTestId } = render(SwapTokensList, {
			props,
			context: mockContext()
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});

	it('renders tokens list on the destination side without a source', () => {
		const { getByTestId } = render(SwapTokensList, {
			props: destinationProps,
			context: mockContext()
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});

	it('renders tokens list on the destination side with receive supported data', () => {
		swapSupportedTokensStore.set({
			aggregated: {
				icp: { coverage: 'all', supportedTokenIds: new Set() },
				evm: { coverage: 'none', supportedTokenIds: new Set() },
				sol: { coverage: 'none', supportedTokenIds: new Set() }
			},
			providers: [
				{
					key: SwapProvider.ONE_SEC,
					sourceCategory: 'icp',
					supportedSourceTokens: new Set([mockValidIcToken.ledgerCanisterId]),
					getSupportedDestinations: () => undefined
				}
			]
		});

		const { getByTestId } = render(SwapTokensList, {
			props: destinationProps,
			context: mockContext({
				sourceToken: mockValidIcToken,
				receiveSupportedData: {
					icp: { coverage: 'all', supportedTokenIds: new Set() },
					evm: { coverage: 'all', supportedTokenIds: new Set() },
					sol: { coverage: 'all', supportedTokenIds: new Set() }
				}
			})
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});
});
