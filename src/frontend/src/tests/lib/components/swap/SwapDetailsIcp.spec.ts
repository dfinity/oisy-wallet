import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import SwapDetailsIcp from '$lib/components/swap/SwapDetailsIcp.svelte';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { ICPSwapAmountReply } from '$lib/types/api';
import { SwapProvider } from '$lib/types/swap';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SwapDetailsIcp', () => {
	const mockContext = new Map();

	mockContext.set(
		SWAP_CONTEXT_KEY,
		initSwapContext({
			destinationToken: ICP_TOKEN as IcTokenToggleable
		})
	);

	it('renders expected minimum correctly', () => {
		const providerMock = {
			provider: SwapProvider.ICP_SWAP,
			receiveAmount: 100_000_000n,
			receiveOutMinimum: 95_000_000n,
			swapDetails: {} as ICPSwapAmountReply
		} as const;

		const { getByText } = render(SwapDetailsIcp, {
			props: {
				provider: providerMock,
				slippageValue: 5
			},
			context: mockContext
		});

		expect(getByText(en.swap.text.expected_minimum)).toBeInTheDocument();
		expect(getByText('0.95 ICP')).toBeInTheDocument();
	});

	it('doesnt renders expected minimum if slippage is undefined', () => {
		const providerMock = {
			provider: SwapProvider.ICP_SWAP,
			receiveAmount: 100_000_000n,
			receiveOutMinimum: 95_000_000n,
			swapDetails: {} as ICPSwapAmountReply
		} as const;

		const { queryByText } = render(SwapDetailsIcp, {
			props: {
				provider: providerMock,
				slippageValue: undefined
			},
			context: mockContext
		});

		expect(queryByText(en.swap.text.expected_minimum)).not.toBeInTheDocument();
		expect(queryByText('0.95 ICP')).not.toBeInTheDocument();
	});
});
