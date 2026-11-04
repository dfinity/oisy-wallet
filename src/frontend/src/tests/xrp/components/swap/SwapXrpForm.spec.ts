import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import {
	CONVERT_AMOUNT_DISPLAY_SKELETON,
	MAX_BUTTON,
	SWAP_PROVIDER_STATUS
} from '$lib/constants/test-ids.constants';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
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
import { tick } from 'svelte';
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
	let activity: ReturnType<typeof initSwapQuoteActivityStore>;

	const renderForm = ({
		swapAmount,
		reserveKnown = true,
		comparing = false,
		offered = !comparing
	}: {
		swapAmount: string;
		reserveKnown?: boolean;
		comparing?: boolean;
		offered?: boolean;
	}) => {
		feeStore = initFeeStore();
		feeStore.setFee(fee);

		reserveStore = initReserveStore();
		reserveStore.setReserve(reserveKnown ? reserve : undefined);

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: offered ? [offer] : [],
			amountForSwap: Number(swapAmount),
			selectedProvider: offered ? offer : undefined
		});

		activity = initSwapQuoteActivityStore();
		if (comparing) {
			activity.start({ requestId: 1, background: false });
		}
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
			[SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore, activity }],
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
				isSwapAmountsLoading: comparing,
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

	it('compares providers before an offer exists without enabling Review', () => {
		const { getByTestId, getByText } = renderForm({ swapAmount: '10', comparing: true });

		expect(getByText(en.swap.text.smart_swap)).toBeInTheDocument();
		expect(getByTestId(SWAP_PROVIDER_STATUS)).toHaveTextContent(en.swap.text.finding_best_rate);
		expect(reviewButton(getByText)).toBeDisabled();
	});

	it('hides the network fee behind a Total fee skeleton while comparing, and brings it back after', async () => {
		const { getByTestId, getByText, queryByTestId, queryByText } = renderForm({
			swapAmount: '10',
			comparing: true,
			offered: true
		});

		expect(getByText(en.fee.text.total_fee)).toBeInTheDocument();
		expect(getByTestId(CONVERT_AMOUNT_DISPLAY_SKELETON)).toBeInTheDocument();
		expect(queryByText(en.fee.text.network_fee)).not.toBeInTheDocument();

		activity.complete({ requestId: 1 });

		await waitFor(() =>
			expect(queryByTestId(CONVERT_AMOUNT_DISPLAY_SKELETON)).not.toBeInTheDocument()
		);

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();

		// A background refresh keeps the fee in place.
		activity.start({ requestId: 2, background: true });
		await tick();

		expect(queryByTestId(CONVERT_AMOUNT_DISPLAY_SKELETON)).not.toBeInTheDocument();
		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
	});

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

		expect(getByText(en.swap.text.smart_swap)).toBeInTheDocument();
		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
	});
});
