import SwapDetailsOneSec from '$lib/components/swap/SwapDetailsOneSec.svelte';
import { initSwapContext, SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
import { SwapProvider } from '$lib/types/swap';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapDetailsOneSec', () => {
	const destToken = { ...mockValidErc20Token, decimals: 6, symbol: 'USDC' };

	const makeContext = (token: typeof destToken = destToken) => {
		const ctx = new Map();
		ctx.set(SWAP_CONTEXT_KEY, initSwapContext({ destinationToken: token }));
		return ctx;
	};

	// Use a minimal context with an explicit undefined destinationToken to avoid
	// the initSwapContext fallback to swappableTokens, which has a default value in tests.
	const makeEmptyContext = () => {
		const ctx = new Map();
		ctx.set(SWAP_CONTEXT_KEY, {
			destinationToken: readable(undefined)
		} as unknown as SwapContext);
		return ctx;
	};

	const baseProvider = {
		provider: SwapProvider.ONE_SEC as const,
		receiveAmount: 990_000n,
		swapDetails: {
			transferFeeInUnits: 1_000n,
			protocolFeeInPercent: 0.1
		}
	};

	it('always renders the protocol fee label', () => {
		const { getByText } = render(SwapDetailsOneSec, {
			props: { provider: baseProvider },
			context: makeContext()
		});

		expect(getByText(en.swap.text.onesec_protocol_fee)).toBeInTheDocument();
	});

	it('formats the protocol fee as a percentage with two decimal places', () => {
		const { getByText } = render(SwapDetailsOneSec, {
			props: { provider: baseProvider },
			context: makeContext()
		});

		expect(getByText('0.10%')).toBeInTheDocument();
	});

	it('formats a whole-number protocol fee with two decimal places', () => {
		const provider = {
			...baseProvider,
			swapDetails: { ...baseProvider.swapDetails, protocolFeeInPercent: 1 }
		};

		const { getByText } = render(SwapDetailsOneSec, {
			props: { provider },
			context: makeContext()
		});

		expect(getByText('1.00%')).toBeInTheDocument();
	});

	it('renders the transfer fee row with formatted amount and token symbol', () => {
		// 1_000 units at 6 decimals = 0.001
		const { getByText } = render(SwapDetailsOneSec, {
			props: { provider: baseProvider },
			context: makeContext()
		});

		expect(getByText(en.swap.text.onesec_transfer_fee)).toBeInTheDocument();
		expect(getByText('0.001 USDC')).toBeInTheDocument();
	});

	it('does not render the transfer fee row when destination token is undefined', () => {
		const { queryByText } = render(SwapDetailsOneSec, {
			props: { provider: baseProvider },
			context: makeEmptyContext()
		});

		expect(queryByText(en.swap.text.onesec_transfer_fee)).not.toBeInTheDocument();
	});
});
