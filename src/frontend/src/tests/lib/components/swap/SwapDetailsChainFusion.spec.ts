import SwapDetailsChainFusion from '$lib/components/swap/SwapDetailsChainFusion.svelte';
import { ZERO } from '$lib/constants/app.constants';
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

	it('renders a deducted fee row with its own label, the formatted amount and token symbol', () => {
		// 10_000 units at 6 decimals = 0.01
		const { getByText } = render(SwapDetailsChainFusion, {
			props: {
				provider: makeProvider({
					sourceFees: [
						{
							labelPath: 'fee.text.fee',
							fee: 10_000n,
							token: sourceToken,
							deductedFromAmount: true
						}
					],
					externalFees: []
				})
			},
			context: makeContext()
		});

		expect(getByText(en.fee.text.fee)).toBeInTheDocument();
		expect(getByText('0.01 ckUSDC')).toBeInTheDocument();
	});

	it('itemizes fees in the same token into one labelled row each, never summing', () => {
		const { getByText } = render(SwapDetailsChainFusion, {
			props: {
				provider: makeProvider({
					sourceFees: [
						{
							labelPath: 'fee.text.convert_inter_network_fee',
							fee: 10_000n,
							token: sourceToken,
							deductedFromAmount: true
						},
						{
							labelPath: 'fee.text.convert_btc_network_fee',
							fee: 5_000n,
							token: sourceToken,
							deductedFromAmount: true
						}
					],
					externalFees: []
				})
			},
			context: makeContext()
		});

		expect(getByText(en.fee.text.convert_inter_network_fee)).toBeInTheDocument();
		expect(getByText('0.01 ckUSDC')).toBeInTheDocument();
		expect(getByText(en.fee.text.convert_btc_network_fee)).toBeInTheDocument();
		expect(getByText('0.005 ckUSDC')).toBeInTheDocument();
	});

	it('renders each fee at the full precision of its own token, like the Convert flow', () => {
		const { getByText } = render(SwapDetailsChainFusion, {
			props: {
				provider: makeProvider({
					sourceFees: [
						{
							labelPath: 'fee.text.fee',
							fee: 10_000n,
							token: sourceToken,
							deductedFromAmount: true
						},
						{
							labelPath: 'fee.text.estimated_eth',
							fee: 37_416_829_103_847n,
							token: ckEthToken,
							deductedFromAmount: true
						}
					],
					externalFees: []
				})
			},
			context: makeContext()
		});

		expect(getByText('0.01 ckUSDC')).toBeInTheDocument();
		expect(getByText('0.000037416829103847 ckETH')).toBeInTheDocument();
	});

	it('renders a zero fee with the zero-fee label instead of dropping the row', () => {
		const { getByText, queryByText } = render(SwapDetailsChainFusion, {
			props: {
				provider: makeProvider({
					sourceFees: [
						{
							labelPath: 'fee.text.convert_fee',
							fee: ZERO,
							token: sourceToken,
							deductedFromAmount: true
						}
					],
					externalFees: []
				})
			},
			context: makeContext()
		});

		expect(getByText(en.fee.text.convert_fee)).toBeInTheDocument();
		expect(getByText(en.fee.text.zero_fee)).toBeInTheDocument();
		expect(queryByText('0 ckUSDC')).not.toBeInTheDocument();
	});

	// The exact inverse of `SwapFees`: a fee charged on top of the amount lives once, in
	// the dedicated fees section — this sheet carries only what is folded into the offer,
	// the way 1Sec itemizes its transfer and protocol fees.
	it('omits fees charged on top of the amount — they live in the SwapFees section', () => {
		const { queryByText } = render(SwapDetailsChainFusion, {
			props: {
				provider: makeProvider({
					sourceFees: [{ labelPath: 'fee.text.fee', fee: 10_000n, token: sourceToken }],
					externalFees: [
						{ labelPath: 'fee.text.estimated_eth', fee: 2_000_000_000_000n, token: ckEthToken }
					]
				})
			},
			context: makeContext()
		});

		expect(queryByText(en.fee.text.fee)).not.toBeInTheDocument();
		expect(queryByText(en.fee.text.estimated_eth)).not.toBeInTheDocument();
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
