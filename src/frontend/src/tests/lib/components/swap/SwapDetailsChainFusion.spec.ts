import SwapDetailsChainFusion from '$lib/components/swap/SwapDetailsChainFusion.svelte';
import { initSwapContext, SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
import { SwapProvider, type ChainFusionSwapDetails } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapDetailsChainFusion', () => {
	const sourceToken: Token = {
		...mockValidErc20Token,
		id: parseTokenId('ckUSDC'),
		decimals: 6,
		symbol: 'ckUSDC'
	};

	const ckEthToken: Token = {
		...mockValidErc20Token,
		id: parseTokenId('ckETH'),
		decimals: 18,
		symbol: 'ckETH'
	};

	const makeContext = () => {
		const ctx = new Map();
		ctx.set(SWAP_CONTEXT_KEY, initSwapContext({ sourceToken }));
		return ctx;
	};

	// A minimal context with an explicit undefined sourceToken, to avoid the
	// initSwapContext fallback to swappableTokens, which has a default value in tests.
	const makeEmptyContext = () => {
		const ctx = new Map();
		ctx.set(SWAP_CONTEXT_KEY, { sourceToken: readable(undefined) } as unknown as SwapContext);
		return ctx;
	};

	const makeProvider = (swapDetails: ChainFusionSwapDetails) => ({
		provider: SwapProvider.CHAIN_FUSION as const,
		receiveAmount: 990_000n,
		swapDetails
	});

	// The fee breakdown belongs to the form's fee section, which carries every component and
	// their total. This sheet is the provider's identity and the constraints it imposes, so a
	// fee row here would either duplicate that list or leave both surfaces incomplete.
	it('renders no fee rows at all', () => {
		const { queryByText } = render(SwapDetailsChainFusion, {
			props: {
				provider: makeProvider({
					sourceFees: [
						{ labelPath: 'fee.text.fee', fee: 10_000n, token: sourceToken },
						{
							labelPath: 'fee.text.convert_inter_network_fee',
							fee: 5_000n,
							token: sourceToken,
							deductedFromAmount: true
						}
					],
					externalFees: [
						{ labelPath: 'fee.text.estimated_eth', fee: 2_000_000_000_000n, token: ckEthToken }
					]
				})
			},
			context: makeContext()
		});

		expect(queryByText(en.fee.text.fee)).not.toBeInTheDocument();
		expect(queryByText(en.fee.text.convert_inter_network_fee)).not.toBeInTheDocument();
		expect(queryByText(en.fee.text.estimated_eth)).not.toBeInTheDocument();
		expect(queryByText('0.01 ckUSDC')).not.toBeInTheDocument();
		expect(queryByText('0.005 ckUSDC')).not.toBeInTheDocument();
		expect(queryByText('0.000002 ckETH')).not.toBeInTheDocument();
	});

	it('renders the minimum amount in source token units', () => {
		const { getByText } = render(SwapDetailsChainFusion, {
			props: {
				provider: makeProvider({
					sourceFees: [],
					externalFees: [],
					minimumAmount: 30_000_000n
				})
			},
			context: makeContext()
		});

		expect(getByText(en.swap.text.chain_fusion_minimum_amount)).toBeInTheDocument();
		expect(getByText('30 ckUSDC')).toBeInTheDocument();
	});

	it('renders the minimum amount at full precision rather than the default rounding', () => {
		// 30.123456 ckUSDC. The default display rounds to 4 decimals ("30.1235"), which
		// contradicts the `minimum_amount` message the form raises against this same
		// figure — the sheet must state the number the minter actually enforces.
		const { getByText, queryByText } = render(SwapDetailsChainFusion, {
			props: {
				provider: makeProvider({
					sourceFees: [],
					externalFees: [],
					minimumAmount: 30_123_456n
				})
			},
			context: makeContext()
		});

		expect(getByText('30.123456 ckUSDC')).toBeInTheDocument();
		expect(queryByText('30.1235 ckUSDC')).not.toBeInTheDocument();
	});

	it('does not render the minimum amount row when the direction has no floor', () => {
		const { queryByText } = render(SwapDetailsChainFusion, {
			props: { provider: makeProvider({ sourceFees: [], externalFees: [] }) },
			context: makeContext()
		});

		expect(queryByText(en.swap.text.chain_fusion_minimum_amount)).not.toBeInTheDocument();
	});

	it('does not render the minimum amount row when the source token is undefined', () => {
		const { queryByText } = render(SwapDetailsChainFusion, {
			props: {
				provider: makeProvider({
					sourceFees: [],
					externalFees: [],
					minimumAmount: 30_000_000n
				})
			},
			context: makeEmptyContext()
		});

		expect(queryByText(en.swap.text.chain_fusion_minimum_amount)).not.toBeInTheDocument();
	});
});
