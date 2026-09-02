import SwapBtcForm from '$btc/components/swap/SwapBtcForm.svelte';
import { BTC_MINIMUM_AMOUNT } from '$btc/constants/btc.constants';
import { UTXOS_FEE_CONTEXT_KEY, initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { BtcPrepareSendError, type UtxosFee } from '$btc/types/btc-send';
import { convertSatoshisToBtc } from '$btc/utils/btc-send.utils';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ZERO } from '$lib/constants/app.constants';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockBtcAddress, mockUtxo, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
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
		offered = true
	}: {
		balance?: bigint;
		// `null` — not `undefined`, which would fall back to the default — leaves the context
		// store untouched, the state before the loaders produce a selection.
		utxosFee?: UtxosFee | null;
		offer?: SwapMappedResult;
		// `false` leaves the quote result empty, the state the "swap is not offered" message
		// exists for.
		offered?: boolean;
	} = {}) => {
		const context = new Map();

		context.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable({ ...BTC_MAINNET_TOKEN, enabled: true }),
			destinationToken: readable(ckBtcToken),
			failedSwapError: writable(undefined),
			sourceTokenExchangeRate: readable(60_000),
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
		expect(getByText(en.swap.text.swap_provider)).toBeInTheDocument();
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
			context: createContext({ utxosFee: { feeSatoshis: ZERO, utxos: [] } })
		});

		expect(getByText(en.send.info.no_available_utxos)).toBeInTheDocument();
	});
});
