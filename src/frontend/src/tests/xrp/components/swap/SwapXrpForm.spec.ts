import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import en from '$tests/mocks/i18n.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import SwapXrpForm from '$xrp/components/swap/SwapXrpForm.svelte';
import {
	XRP_FEE_CONTEXT_KEY,
	initFeeStore,
	initReserveStore,
	initXrpFeeContext,
	type FeeStore,
	type ReserveStore
} from '$xrp/stores/xrp-fee.store';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import { render, waitFor } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

describe('SwapXrpForm', () => {
	const balance = 50_000_000n;
	const fee = 12n;
	const reserve = getXrpReserveDrops({ ownerCount: 0 });

	const offer: SwapMappedResult = {
		provider: SwapProvider.NEAR_INTENTS,
		receiveAmount: 10_000_000_000_000_000n,
		swapDetails: mockNearIntentsQuoteResponse,
		type: undefined
	};

	let feeStore: FeeStore;
	let reserveStore: ReserveStore;

	const renderForm = ({
		swapAmount,
		reserveKnown = true
	}: {
		swapAmount: string;
		reserveKnown?: boolean;
	}) => {
		feeStore = initFeeStore();
		feeStore.setFee(fee);

		reserveStore = initReserveStore();
		reserveStore.setReserve(reserveKnown ? reserve : undefined);

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: [offer],
			amountForSwap: Number(swapAmount),
			selectedProvider: offer
		});

		const context = new Map<symbol, unknown>([
			[
				SWAP_CONTEXT_KEY,
				{
					...initSwapContext({
						sourceToken: XRP_TOKEN,
						destinationToken: ETHEREUM_TOKEN
					}),
					sourceTokenBalance: readable(balance),
					sourceTokenExchangeRate: readable(2),
					destinationTokenExchangeRate: readable(2000)
				}
			],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore }],
			[
				XRP_FEE_CONTEXT_KEY,
				initXrpFeeContext({
					feeStore,
					reserveStore,
					feeSymbolStore: writable(XRP_TOKEN.symbol),
					feeDecimalsStore: writable(XRP_TOKEN.decimals),
					feeTokenIdStore: writable(XRP_TOKEN.id),
					feeExchangeRateStore: writable(2)
				})
			]
		]);

		return render(SwapXrpForm, {
			props: {
				swapAmount,
				slippageValue: '0.5',
				isSwapAmountsLoading: false,
				onShowTokensList: vi.fn(),
				onShowProviderList: vi.fn(),
				onClose: vi.fn(),
				onNext: vi.fn()
			},
			context
		});
	};

	const reviewButton = (getByText: (text: string) => HTMLElement) =>
		getByText(en.swap.text.review_button).closest('button');

	describe('Max', () => {
		it('leaves the fee and the reserve', () => {
			const { getByTestId } = renderForm({ swapAmount: '10' });

			// 50 XRP less the 0.000012 fee and the 1 XRP reserve.
			expect(getByTestId(MAX_BUTTON)).toHaveTextContent('48.999988 XRP');
		});

		// Measured against a guessed reserve, the offer would be an amount the ledger refuses.
		it('is not offered while the reserve is unknown', () => {
			const { queryByTestId } = renderForm({ swapAmount: '10', reserveKnown: false });

			expect(queryByTestId(MAX_BUTTON)).not.toBeInTheDocument();
		});
	});

	describe('the amount', () => {
		it('is accepted when it leaves the fee and the reserve', async () => {
			const { getByText, queryByText } = renderForm({ swapAmount: '10' });

			await waitFor(() => expect(reviewButton(getByText)).toBeEnabled());

			expect(queryByText(en.send.assertion.insufficient_funds_for_reserve)).not.toBeInTheDocument();
		});

		it('is refused, naming the reserve, when it does not leave it', async () => {
			const { getByText, findByText } = renderForm({ swapAmount: '49.5' });

			await expect(
				findByText(en.send.assertion.insufficient_funds_for_reserve)
			).resolves.toBeInTheDocument();
			expect(reviewButton(getByText)).toBeDisabled();
		});

		// Past the balance there is nothing for the reserve message to explain.
		it('is refused without the reserve message when it exceeds the balance', async () => {
			const { getByText, queryByText } = renderForm({ swapAmount: '60' });

			await waitFor(() => expect(reviewButton(getByText)).toBeDisabled());

			expect(queryByText(en.send.assertion.insufficient_funds_for_reserve)).not.toBeInTheDocument();
		});

		// The fee poller can raise the fee under an amount that was accepted.
		it('is judged again when the fee moves', async () => {
			const { getByText, findByText } = renderForm({ swapAmount: '48.999988' });

			await waitFor(() => expect(reviewButton(getByText)).toBeEnabled());

			feeStore.setFee(fee + 1n);

			await expect(
				findByText(en.send.assertion.insufficient_funds_for_reserve)
			).resolves.toBeInTheDocument();
			expect(reviewButton(getByText)).toBeDisabled();
		});

		it('holds Review back while the reserve is unknown', async () => {
			const { getByText } = renderForm({ swapAmount: '10', reserveKnown: false });

			await waitFor(() => expect(reviewButton(getByText)).toBeDisabled());
		});
	});

	it('shows the provider and the network fee', () => {
		const { getByText } = renderForm({ swapAmount: '10' });

		expect(getByText(en.swap.text.swap_provider)).toBeInTheDocument();
		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
	});
});
