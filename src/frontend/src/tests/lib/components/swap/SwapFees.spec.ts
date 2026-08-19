import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import SwapFees from '$lib/components/swap/SwapFees.svelte';
import { initSwapAmountsStore, SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { ChainFusionSwapDetails, SwapMappedResult } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockChainFusionProvider, mockSwapProviders } from '$tests/mocks/swap.mocks';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapFees', () => {
	const sourceToken: Token = {
		...mockValidErc20Token,
		id: parseTokenId('ckUSDC'),
		decimals: 6,
		symbol: 'ckUSDC'
	};

	const destinationToken: Token = {
		...mockValidErc20Token,
		id: parseTokenId('USDC'),
		decimals: 6,
		symbol: 'USDC'
	};

	const ckEthToken: Token = {
		...mockValidErc20Token,
		id: parseTokenId('ckETH'),
		decimals: 18,
		symbol: 'ckETH'
	};

	// 0.01 ckUSDC, the ledger fee the generic rows read out of `icTokenFeeStore`.
	const LEDGER_FEE = 10_000n;

	const renderWithProvider = ({
		selectedProvider,
		sourceTokenExchangeRate
	}: {
		selectedProvider: SwapMappedResult;
		sourceTokenExchangeRate?: number;
	}) => {
		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: [selectedProvider],
			amountForSwap: 1,
			selectedProvider
		});

		const context = new Map<symbol, unknown>([
			[
				SWAP_CONTEXT_KEY,
				{
					sourceToken: readable(sourceToken),
					destinationToken: readable(destinationToken),
					isSourceTokenIcrc2: readable(true),
					sourceTokenExchangeRate: readable(sourceTokenExchangeRate)
				}
			],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore }],
			[
				IC_TOKEN_FEE_CONTEXT_KEY,
				{
					store: {
						reset: vi.fn(),
						subscribe: readable({ [sourceToken.symbol]: LEDGER_FEE }).subscribe
					}
				}
			]
		]);

		return render(SwapFees, { context });
	};

	const renderChainFusion = (swapDetails: ChainFusionSwapDetails) =>
		renderWithProvider({ selectedProvider: mockChainFusionProvider(swapDetails) });

	describe('providers that do not price their own fees', () => {
		it('keeps rendering the generic approval and network fee rows', () => {
			const { getByText } = renderWithProvider({ selectedProvider: mockSwapProviders[0] });

			expect(getByText(en.swap.text.approval_fee)).toBeInTheDocument();
			expect(getByText(en.swap.text.network_fee)).toBeInTheDocument();
		});

		it('totals the two legs in the source token when no exchange rate is available', () => {
			const { getByText } = renderWithProvider({ selectedProvider: mockSwapProviders[0] });

			expect(getByText('0.02 ckUSDC')).toBeInTheDocument();
		});
	});

	describe('Chain Fusion', () => {
		it('replaces the generic rows with the quote-priced ones', () => {
			const { getByText, queryByText } = renderChainFusion({
				sourceFees: [{ labelPath: 'fee.text.fee', fee: LEDGER_FEE, token: sourceToken }],
				externalFees: []
			});

			expect(getByText(en.fee.text.fee)).toBeInTheDocument();
			// Keeping the generic pair alongside would count the same ck ledger fee twice.
			expect(queryByText(en.swap.text.approval_fee)).not.toBeInTheDocument();
			expect(queryByText(en.swap.text.network_fee)).not.toBeInTheDocument();
		});

		// The regression this component was changed for: the ckETH gas of a ckERC20 → ERC20
		// withdrawal is charged against a different token's balance, so it is in neither the
		// receive amount nor the source-token ledger fee. Before, it appeared nowhere here.
		it('lists an external fee charged in a third token', () => {
			const { getByText } = renderChainFusion({
				sourceFees: [{ labelPath: 'fee.text.fee', fee: LEDGER_FEE, token: sourceToken }],
				externalFees: [
					{ labelPath: 'fee.text.estimated_eth', fee: 2_000_000_000_000n, token: ckEthToken }
				]
			});

			expect(getByText(en.fee.text.estimated_eth)).toBeInTheDocument();
			expect(getByText('0.000002 ckETH')).toBeInTheDocument();
		});

		// A deducted fee is already reflected in the receive amount, exactly as every other
		// provider's cost is folded into its rate. Listing it here too would report it twice.
		it('omits a fee the minter takes out of the converted amount', () => {
			const { getByText, queryByText } = renderChainFusion({
				sourceFees: [
					{ labelPath: 'fee.text.fee', fee: LEDGER_FEE, token: sourceToken },
					{
						labelPath: 'fee.text.estimated_eth',
						fee: 5_000n,
						token: sourceToken,
						deductedFromAmount: true
					}
				],
				externalFees: []
			});

			expect(getByText(en.fee.text.fee)).toBeInTheDocument();
			expect(queryByText(en.fee.text.estimated_eth)).not.toBeInTheDocument();
			expect(queryByText('0.005 ckUSDC')).not.toBeInTheDocument();
		});

		it('totals only the source-token rows when a fee token has no exchange rate', () => {
			const { getAllByText } = renderChainFusion({
				sourceFees: [{ labelPath: 'fee.text.fee', fee: LEDGER_FEE, token: sourceToken }],
				externalFees: [
					{ labelPath: 'fee.text.estimated_eth', fee: 2_000_000_000_000n, token: ckEthToken }
				]
			});

			// Once as the header subtotal, once as its own row. The unpriced ckETH fee is
			// listed but cannot join a currency total, so the header degrades to the
			// source-token figure rather than pricing that row at nothing.
			expect(getAllByText('0.01 ckUSDC')).toHaveLength(2);
			expect(getAllByText('0.000002 ckETH')).toHaveLength(1);
		});
	});
});
