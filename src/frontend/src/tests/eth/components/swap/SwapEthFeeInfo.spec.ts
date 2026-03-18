import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import SwapEthFeeInfo from '$eth/components/swap/SwapEthFeeInfo.svelte';
import type { Erc20Token } from '$eth/types/erc20';
import { SWAP_FEE_INFO } from '$lib/constants/test-ids.constants';
import { SWAP_CONTEXT_KEY, initSwapContext, type SwapData } from '$lib/stores/swap.store';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { render } from '@testing-library/svelte';

describe('SwapEthFeeInfo', () => {
	const mockContext = (swapData: SwapData) => {
		const mockContext = new Map([]);
		mockContext.set(SWAP_CONTEXT_KEY, initSwapContext(swapData));
		return mockContext;
	};

	const props = {
		decimals: 8,
		feeSymbol: ETHEREUM_NETWORK_SYMBOL,
		feeTokenId: ETHEREUM_TOKEN_ID
	};

	it('does not render the info message if fee symbol is the same as swap token symbol', () => {
		const { getByTestId } = render(SwapEthFeeInfo, {
			props,
			context: mockContext({ sourceToken: ETHEREUM_TOKEN as Erc20Token })
		});

		expect(() => getByTestId(SWAP_FEE_INFO)).toThrow();
	});

	it('renders the info message if fee symbol is not the same as send token symbol', () => {
		const { getByTestId } = render(SwapEthFeeInfo, {
			props,
			context: mockContext({ sourceToken: mockValidErc20Token })
		});

		expect(getByTestId(SWAP_FEE_INFO)).toBeInTheDocument();
	});
});
