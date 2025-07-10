import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import SendFeeInfo from '$lib/components/send/SendFeeInfo.svelte';
import { SEND_FEE_INFO } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { render } from '@testing-library/svelte';

describe('SendFeeInfo', () => {
	const mockContext = (token: Token) => {
		const mockContext = new Map([]);
		mockContext.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				token
			})
		);
		return mockContext;
	};

	const props = {
		decimals: 8,
		feeSymbol: ETHEREUM_NETWORK_SYMBOL,
		feeTokenId: ETHEREUM_TOKEN_ID
	};

	it('does not render the info message if fee symbol is the same as send token symbol', () => {
		const { getByTestId } = render(SendFeeInfo, {
			props,
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(() => getByTestId(SEND_FEE_INFO)).toThrow();
	});

	it('renders the info message if fee symbol is not the same as send token symbol', () => {
		const { getByTestId } = render(SendFeeInfo, {
			props,
			context: mockContext(mockValidErc20Token)
		});

		expect(getByTestId(SEND_FEE_INFO)).toBeInTheDocument();
	});
});
