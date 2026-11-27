import SwapBtcForm from '$btc/components/swap/SwapBtcForm.svelte';
import { BTC_MINIMUM_AMOUNT } from '$btc/constants/btc.constants';
import { LIFI_BTC_CONSERVATIVE_OUTPUT_VSIZES } from '$btc/constants/lifi.constants';
import * as btcMaxSendAmountDerived from '$btc/derived/btc-max-send-amount.derived';
import { UTXOS_FEE_CONTEXT_KEY, initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { BtcPrepareSendError, type UtxosFee } from '$btc/types/btc-send';
import { convertSatoshisToBtc } from '$btc/utils/btc-send.utils';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	CONVERT_AMOUNT_DISPLAY_SKELETON,
	SWAP_LIFI_BTC_RELAY_WARNING,
	SWAP_PROVIDER_STATUS,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import * as lifiBtcSwapServices from '$lib/services/lifi-btc-swap.services';
import { nearIntentsSwapLimitStore } from '$lib/stores/near-intents-swap-limit.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockBtcAddress, mockUtxo, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockLifiBtcLayerswapQuote, mockLifiBtcRelayQuote } from '$tests/mocks/lifi-btc.mock';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readable, writable } from 'svelte/store';

describe('SwapBtcForm', () => {
	const ckBtcToken = {
		...mockValidIcCkToken,
		id: parseTokenId('ckBTC-form-destination'),
		symbol: 'ckBTC',
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
		twinToken: BTC_MAINNET_TOKEN,
		enabled: true
	};

	const KYT_FEE = 100n;

	const chainFusionOffer: SwapMappedResult = {
		provider: SwapProvider.CHAIN_FUSION,
		receiveAmount: 1_000_000n,
		swapDetails: {
			sourceFees: [
				{
					labelPath: 'fee.text.convert_inter_network_fee',
					fee: KYT_FEE,
					token: BTC_MAINNET_TOKEN,
					deductedFromAmount: true
				},
				{
					labelPath: 'fee.text.convert_btc_network_fee',
					fee: mockUtxosFee.feeSatoshis,
					token: BTC_MAINNET_TOKEN
				}
			],
			externalFees: []
		}
	};

	// LI.FI's deposit, memo and fee cost more than the loader's one output: 2 130 sats against 1 000.
	const lifiOutputVSizes = [43, 29, 31];

	const lifiOffer: SwapMappedResult = {
		provider: SwapProvider.LIFI,
		receiveAmount: 1_000_000n,
		receiveOutMinimum: 990_000n,
		swapDetails: mockLifiBtcLayerswapQuote,
		request: {
			fromChain: 20000000000001,
			toChain: 1,
			fromToken: 'bitcoin',
			toToken: '0x0000000000000000000000000000000000000000',
			fromAddress: mockBtcAddress,
			fromAmount: '1000000'
		},
		btcSelection: {
			utxosFee: { ...mockUtxosFee, feeSatoshis: 2_130n },
			outputVSizes: lifiOutputVSizes
		}
	};

	const props = {
		swapAmount: '0.01',
		receiveAmount: 0.01,
		slippageValue: '0.5',
		source: mockBtcAddress,
		isSwapAmountsLoading: false,
		onShowTokensList: vi.fn(),
		onShowProviderList: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn()
	};

	const createContext = ({
		balance = 100_000_000n,
		utxosFee = mockUtxosFee,
		offer = chainFusionOffer,
		offered = true,
		exchangeRate = 60_000
	}: {
		balance?: bigint;
		// `null` — not `undefined`, which would fall back to the default — leaves the context
		// store untouched, the state before the loaders produce a selection.
		utxosFee?: UtxosFee | null;
		offer?: SwapMappedResult;
		// `false` leaves the quote result empty, the state the "swap is not offered" message
		// exists for.
		offered?: boolean;
		// `null` — not `undefined`, which would fall back to the default — is the state before
		// the price of BTC has loaded.
		exchangeRate?: number | null;
	} = {}) => {
		const context = new Map();

		context.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable({ ...BTC_MAINNET_TOKEN, enabled: true }),
			destinationToken: readable(ckBtcToken),
			failedSwapError: writable(undefined),
			amountSetToMax: writable(false),
			lifiMaxFee: writable(undefined),
			sourceTokenExchangeRate: readable(exchangeRate ?? undefined),
			sourceTokenBalance: readable(balance),
			destinationTokenBalance: readable(undefined),
			destinationTokenExchangeRate: readable(60_000),
			isSourceTokenIcrc2: readable(false),
			isSourceTokenPermitSupported: readable(undefined),
			setIsTokenPermitSupported: vi.fn(),
			setSourceToken: () => {},
			setDestinationToken: () => {},
			switchTokens: () => {}
		});

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: offered ? [offer] : [],
			amountForSwap: 0.01,
			selectedProvider: offered ? offer : undefined
		});
		context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });

		const utxosFeeStore = initUtxosFeeStore();

		if (nonNullish(utxosFee)) {
			utxosFeeStore.setUtxosFee({ utxosFee, amountForFee: 0.01 });
		}

		context.set(UTXOS_FEE_CONTEXT_KEY, { store: utxosFeeStore });

		return context;
	};

	const enterAmount = async ({ container, value }: { container: HTMLElement; value: string }) => {
		const input: HTMLInputElement | null = container.querySelector(
			`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
		);

		assertNonNullish(input);

		await fireEvent.input(input, { target: { value } });
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// The Convert flow's breakdown minus its zero-valued conversion-fee row, and minus the KYT
	// fee the minter withholds — which the provider sheet states instead, since it is already
	// reflected in the receive amount.
	it('compares providers before an offer exists without enabling Review', () => {
		const activity = initSwapQuoteActivityStore();
		activity.start({ requestId: 1, background: false });
		const context = createContext({ offered: false });
		context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore(), activity });
		const { getByTestId, getByText } = render(SwapBtcForm, {
			props: { ...props, isSwapAmountsLoading: true },
			context
		});

		expect(getByText(en.swap.text.smart_swap)).toBeInTheDocument();
		expect(getByTestId(SWAP_PROVIDER_STATUS)).toHaveTextContent(en.swap.text.finding_best_rate);
		expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();
	});

	it('hides the previous offer fees behind a Total fee skeleton while comparing, and brings them back after', async () => {
		const context = createContext();
		const { store } = context.get(SWAP_AMOUNTS_CONTEXT_KEY);
		const activity = initSwapQuoteActivityStore();
		activity.start({ requestId: 2, background: false });
		context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store, activity });
		const { getByTestId, getByText, queryByTestId, queryByText } = render(SwapBtcForm, {
			props: { ...props, isSwapAmountsLoading: true },
			context
		});

		expect(getByText(en.fee.text.total_fee)).toBeInTheDocument();
		expect(getByTestId(CONVERT_AMOUNT_DISPLAY_SKELETON)).toBeInTheDocument();
		expect(queryByText(en.fee.text.convert_btc_network_fee)).not.toBeInTheDocument();

		activity.complete({ requestId: 2 });

		await waitFor(() =>
			expect(queryByTestId(CONVERT_AMOUNT_DISPLAY_SKELETON)).not.toBeInTheDocument()
		);

		expect(getByText(en.fee.text.convert_btc_network_fee)).toBeInTheDocument();

		// A background refresh keeps the fees in place.
		activity.start({ requestId: 3, background: true });
		await tick();

		expect(queryByTestId(CONVERT_AMOUNT_DISPLAY_SKELETON)).not.toBeInTheDocument();
		expect(getByText(en.fee.text.convert_btc_network_fee)).toBeInTheDocument();
	});

	it('itemizes the deposit fees from the selected offer', () => {
		const { getByText, queryByText } = render(SwapBtcForm, { props, context: createContext() });

		expect(getByText(en.fee.text.convert_btc_network_fee)).toBeInTheDocument();
		expect(queryByText(en.fee.text.convert_fee)).not.toBeInTheDocument();
		// One fee left means one row, not a "Total fee" header over a list of one.
		expect(queryByText(en.swap.text.total_fee)).not.toBeInTheDocument();
	});

	it('renders both token inputs and the provider row', () => {
		const { container, getByText } = render(SwapBtcForm, { props, context: createContext() });

		expect(
			container.querySelectorAll(`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`)
		).toHaveLength(2);
		expect(getByText(en.swap.text.smart_swap)).toBeInTheDocument();
	});

	it('leaves review enabled for an affordable amount', async () => {
		const { container, getByText } = render(SwapBtcForm, { props, context: createContext() });

		await enterAmount({ container, value: '0.01' });

		await waitFor(() => {
			expect(getByText(en.swap.text.review_button).closest('button')).not.toBeDisabled();
		});
	});

	it('disables review when the amount exceeds the balance', async () => {
		const { container, getByText } = render(SwapBtcForm, {
			props,
			context: createContext({ balance: 500_000n })
		});

		await enterAmount({ container, value: '0.01' });

		await waitFor(() => {
			expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();
		});
	});

	// The Bitcoin network fee is paid out of the same UTXOs as the deposit, so the balance
	// has to cover both.
	it('disables review when the balance cannot cover the amount plus the network fee', async () => {
		const { container, getByText } = render(SwapBtcForm, {
			props,
			context: createContext({ balance: 1_000_500n })
		});

		await enterAmount({ container, value: '0.01' });

		await waitFor(() => {
			expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();
		});
	});

	describe('with a LI.FI offer selected', () => {
		// Covers the amount and the loader's one-output fee, not LI.FI's own.
		const balance = 1_001_500n;

		it("checks the funds against the offer's own network fee", async () => {
			const { container, getByText } = render(SwapBtcForm, {
				props,
				context: createContext({ balance, offer: lifiOffer })
			});

			await enterAmount({ container, value: '0.01' });

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();
			});
		});

		it('leaves the loader fee to any other offer', async () => {
			const { container, getByText } = render(SwapBtcForm, {
				props,
				context: createContext({ balance })
			});

			await enterAmount({ container, value: '0.01' });

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).not.toBeDisabled();
			});
		});

		it("prices Max for the offer's outputs", () => {
			const maxSpy = vi.spyOn(btcMaxSendAmountDerived, 'initBtcMaxSendAmount');

			render(SwapBtcForm, { props, context: createContext({ offer: lifiOffer }) });

			expect(maxSpy).toHaveBeenCalledWith({
				source: mockBtcAddress,
				outputVSizes: lifiOutputVSizes
			});
		});

		// At the one-output Max, a pair only LI.FI serves would get a quote LI.FI's own selection
		// cannot fund, and so no offer to correct Max.
		it("prices Max for LI.FI's largest layout before any offer, while LI.FI may be asked", () => {
			vi.spyOn(lifiBtcSwapServices, 'isLifiBtcOffered').mockReturnValue(true);
			const maxSpy = vi.spyOn(btcMaxSendAmountDerived, 'initBtcMaxSendAmount');

			render(SwapBtcForm, { props, context: createContext({ offered: false }) });

			expect(maxSpy).toHaveBeenCalledWith({
				source: mockBtcAddress,
				outputVSizes: LIFI_BTC_CONSERVATIVE_OUTPUT_VSIZES
			});
		});

		it('prices Max for one output before any offer, while LI.FI is not asked', () => {
			vi.spyOn(lifiBtcSwapServices, 'isLifiBtcOffered').mockReturnValue(false);
			const maxSpy = vi.spyOn(btcMaxSendAmountDerived, 'initBtcMaxSendAmount');

			render(SwapBtcForm, { props, context: createContext({ offered: false }) });

			expect(maxSpy).toHaveBeenCalledWith({ source: mockBtcAddress, outputVSizes: undefined });
		});

		it('prices Max for one output for any other offer', () => {
			const maxSpy = vi.spyOn(btcMaxSendAmountDerived, 'initBtcMaxSendAmount');

			render(SwapBtcForm, { props, context: createContext() });

			expect(maxSpy).toHaveBeenCalledWith({ source: mockBtcAddress, outputVSizes: undefined });
		});
	});

	// Relay records the payout's recipient only once the deposit arrives, so OISY cannot check it.
	describe('Relay recipient warning', () => {
		const relayOffer: SwapMappedResult = { ...lifiOffer, swapDetails: mockLifiBtcRelayQuote };

		const warning = replaceOisyPlaceholders(en.swap.text.lifi_btc_relay_recipient_warning);

		it('warns with a LI.FI offer through Relay selected', () => {
			const { getByTestId } = render(SwapBtcForm, {
				props,
				context: createContext({ offer: relayOffer })
			});

			expect(getByTestId(SWAP_LIFI_BTC_RELAY_WARNING)).toHaveTextContent(warning);
		});

		it.each([
			{ label: 'a LI.FI offer through another bridge', offer: lifiOffer },
			{ label: 'another provider', offer: chainFusionOffer }
		])('does not warn with $label selected', ({ offer }) => {
			const { queryByTestId } = render(SwapBtcForm, {
				props,
				context: createContext({ offer })
			});

			expect(queryByTestId(SWAP_LIFI_BTC_RELAY_WARNING)).not.toBeInTheDocument();
		});

		// A quote refresh can make Relay the best offer, or stop it being one.
		it('follows the selected offer', async () => {
			const context = createContext();
			const { store } = context.get(SWAP_AMOUNTS_CONTEXT_KEY);
			const { queryByTestId } = render(SwapBtcForm, { props, context });

			expect(queryByTestId(SWAP_LIFI_BTC_RELAY_WARNING)).not.toBeInTheDocument();

			store.setSelectedProvider(relayOffer);

			await waitFor(() => expect(queryByTestId(SWAP_LIFI_BTC_RELAY_WARNING)).toBeInTheDocument());

			store.setSelectedProvider(chainFusionOffer);

			await waitFor(() =>
				expect(queryByTestId(SWAP_LIFI_BTC_RELAY_WARNING)).not.toBeInTheDocument()
			);
		});
	});

	// The same dust floor `BtcSendAmount` applies to a plain send. It also covers the amounts
	// the minter's KYT fee would consume entirely, which would otherwise quote a zero receive
	// behind an enabled Review button.
	it('disables review and names the floor below the minimum deposit', async () => {
		const { container, getByText } = render(SwapBtcForm, { props, context: createContext() });

		await enterAmount({ container, value: '0.000005' });

		await waitFor(() => {
			expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();
			expect(
				getByText(
					replacePlaceholders(en.send.assertion.minimum_btc_amount, {
						$amount: convertSatoshisToBtc(BTC_MINIMUM_AMOUNT)
					})
				)
			).toBeInTheDocument();
		});
	});

	// NEAR Intents can hold a pair to a fiat floor far above the dust floor. The notice states
	// it; naming the dust floor as well would put a second, much smaller target beside it that
	// still leaves the swap refused.
	describe('below the dust floor, with a NEAR Intents fiat floor on the pair', () => {
		const dustMessage = replacePlaceholders(en.send.assertion.minimum_btc_amount, {
			$amount: convertSatoshisToBtc(BTC_MINIMUM_AMOUNT)
		});

		const fiatFloorNotice = replacePlaceholders(en.swap.text.swap_minimum_amount_hint, {
			$amount: '$1,000.00'
		});

		afterEach(() => {
			nearIntentsSwapLimitStore.reset();
		});

		it('states only the fiat floor, and keeps Review disabled', async () => {
			nearIntentsSwapLimitStore.set(1000);

			const { container, getByText, queryByText } = render(SwapBtcForm, {
				props,
				context: createContext({ offered: false })
			});

			await enterAmount({ container, value: '0.000005' });

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();
				expect(getByText(fiatFloorNotice)).toBeInTheDocument();
				expect(queryByText(dustMessage)).not.toBeInTheDocument();
			});
		});

		// Without the price of BTC nothing shows the fiat floor is the higher one, so the dust
		// floor is stated as before.
		it('still names the dust floor while the price of BTC is unknown', async () => {
			nearIntentsSwapLimitStore.set(1000);

			const { container, getByText } = render(SwapBtcForm, {
				props,
				context: createContext({ offered: false, exchangeRate: null })
			});

			await enterAmount({ container, value: '0.000005' });

			await waitFor(() => {
				expect(getByText(dustMessage)).toBeInTheDocument();
			});
		});

		it('still names the dust floor when it is the higher of the two', async () => {
			// 700 sats at 60,000 USD per BTC is $0.42, above this floor.
			nearIntentsSwapLimitStore.set(0.1);

			const { container, getByText } = render(SwapBtcForm, {
				props,
				context: createContext({ offered: false })
			});

			await enterAmount({ container, value: '0.000005' });

			await waitFor(() => {
				expect(getByText(dustMessage)).toBeInTheDocument();
			});
		});

		// The notice steps aside once a provider quotes, so the dust floor is the only floor left
		// on screen and must be named.
		it('still names the dust floor when a provider quoted', async () => {
			nearIntentsSwapLimitStore.set(1000);

			const { container, getByText, queryByText } = render(SwapBtcForm, {
				props,
				context: createContext({ offered: true })
			});

			await enterAmount({ container, value: '0.000005' });

			await waitFor(() => {
				expect(getByText(dustMessage)).toBeInTheDocument();
				expect(queryByText(fiatFloorNotice)).not.toBeInTheDocument();
			});
		});
	});

	// The KYT fee is already the gap between the pay and receive amounts, so the fee section
	// reports only what the deposit costs on top of it — the Bitcoin network fee. The provider
	// sheet states the KYT fee; counting it here as well would read as a second charge.
	it('keeps the deducted KYT fee out of the fee section', () => {
		const { getByText, queryByText } = render(SwapBtcForm, { props, context: createContext() });

		const asBtc = (value: bigint) =>
			`${formatToken({
				value,
				unitName: BTC_MAINNET_TOKEN.decimals,
				displayDecimals: BTC_MAINNET_TOKEN.decimals
			})} ${BTC_MAINNET_TOKEN.symbol}`;

		expect(getByText(asBtc(mockUtxosFee.feeSatoshis))).toBeInTheDocument();
		expect(queryByText(asBtc(KYT_FEE + mockUtxosFee.feeSatoshis))).not.toBeInTheDocument();
	});

	// The quote refuses to price an unusable selection, so the absent offer is explained by
	// the warning rather than by a bare "swap is not offered".
	it('explains an unusable UTXO selection', () => {
		const { getByText } = render(SwapBtcForm, {
			props,
			context: createContext({
				utxosFee: {
					feeSatoshis: ZERO,
					feeRateMiliSatoshisPerVByte: 4000n,
					utxos: [mockUtxo],
					error: BtcPrepareSendError.UtxoLocked
				}
			})
		});

		expect(getByText(en.send.assertion.btc_utxo_locked)).toBeInTheDocument();
	});

	// "Swap is not offered" contradicts the warning beside it: a swap is offered, the amount or
	// the moment just is not right. These three pin which of the two the user gets.
	describe('absent offer', () => {
		it('says a swap is not offered when nothing explains the absence', () => {
			const { getByText } = render(SwapBtcForm, {
				props,
				context: createContext({ offered: false })
			});

			expect(getByText(en.swap.text.swap_is_not_offered)).toBeInTheDocument();
		});

		it('defers to the specific reason when the selection is unusable', () => {
			const { getByText, queryByText } = render(SwapBtcForm, {
				props,
				context: createContext({
					offered: false,
					utxosFee: {
						feeSatoshis: ZERO,
						feeRateMiliSatoshisPerVByte: 4000n,
						utxos: [mockUtxo],
						error: BtcPrepareSendError.UtxoLocked
					}
				})
			});

			expect(queryByText(en.swap.text.swap_is_not_offered)).not.toBeInTheDocument();
			expect(getByText(en.send.assertion.btc_utxo_locked)).toBeInTheDocument();
		});

		it('stays quiet while the UTXO selection has not been produced yet', () => {
			const { queryByText } = render(SwapBtcForm, {
				props,
				context: createContext({ offered: false, utxosFee: null })
			});

			expect(queryByText(en.swap.text.swap_is_not_offered)).not.toBeInTheDocument();
		});
	});

	it('explains a selection with no available inputs', () => {
		const { getByText } = render(SwapBtcForm, {
			props,
			context: createContext({
				utxosFee: { feeSatoshis: ZERO, feeRateMiliSatoshisPerVByte: 4000n, utxos: [] }
			})
		});

		expect(getByText(en.send.info.no_available_utxos)).toBeInTheDocument();
	});
});
