import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import SwapIcpForm from '$icp/components/swap/SwapIcpForm.svelte';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { ZERO } from '$lib/constants/app.constants';
import {
	MAX_BUTTON,
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import type { ChainFusionSwapDetails, SwapMappedResult } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockChainFusionProvider, mockOneSecProvider } from '$tests/mocks/swap.mocks';
import { assertNonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

// The form reads the flag at module scope, so it has to be true before the component is
// first imported. The OISY Trade cases below are the only ones that depend on it; with an
// empty pair table the flag changes nothing, so leaving it on for the whole file is inert.
vi.mock('$env/oisy-trade-swap', () => ({
	OISY_TRADE_SWAP_ENABLED: true,
	oisyTradeSwapEnabled: true
}));

describe('SwapIcpForm', () => {
	const mockContext = new Map();

	beforeEach(() => {
		const originalSwapContext = initSwapContext({
			sourceToken: mockValidIcToken as IcTokenToggleable,
			destinationToken: mockValidIcCkToken as IcTokenToggleable
		});

		const mockSwapContext = {
			...originalSwapContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2),
			isSourceTokenIcrc2: readable(false)
		};

		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);

		icTokenFeeStore.setIcTokenFee({
			tokenSymbol: mockValidIcToken.symbol,
			fee: 1000n
		});
		mockContext.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });
	});

	const props = {
		swapAmount: '1',
		receiveAmount: 2,
		slippageValue: '0.5',
		sourceTokenFee: 1000n,
		isSwapAmountsLoading: false,
		onShowTokensList: vi.fn(),
		onShowProviderList: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn()
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const switchButtonSelector = `button[data-tid="${SWAP_SWITCH_TOKENS_BUTTON}"]`;

	const enterAmount = async ({ container, value }: { container: HTMLElement; value: string }) => {
		const input: HTMLInputElement | null = container.querySelector(amountSelector);

		assertNonNullish(input);

		await fireEvent.input(input, { target: { value } });
	};

	it('should render all fields', () => {
		const { container, getByTestId } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();

		const switchButton: HTMLButtonElement | null = container.querySelector(switchButtonSelector);

		expect(switchButton).not.toBeNull();
	});

	it('should render the component', () => {
		const { container } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should render swap details when tokens are selected', () => {
		const { container } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		expect(
			container.textContent?.includes('fee') ?? container.querySelector('[class*="fee"]')
		).toBeTruthy();
	});

	it('should not render swap details when no destination token', () => {
		const contextWithoutDestination = new Map();
		const swapContextWithoutDestination = initSwapContext({
			sourceToken: mockValidIcToken as IcTokenToggleable,
			destinationToken: undefined
		});

		contextWithoutDestination.set(SWAP_CONTEXT_KEY, swapContextWithoutDestination);
		contextWithoutDestination.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
		contextWithoutDestination.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });

		const { container } = render(SwapIcpForm, {
			props,
			context: contextWithoutDestination
		});

		expect(container.querySelector('hr')).not.toBeInTheDocument();
	});

	it('should handle loading state', () => {
		const { container } = render(SwapIcpForm, {
			props: {
				...props,
				isSwapAmountsLoading: true
			},
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should calculate total fee for ICRC2 tokens', () => {
		const icrc2Context = new Map();
		const icrc2SwapContext = {
			...initSwapContext({
				sourceToken: mockValidIcToken as IcTokenToggleable,
				destinationToken: mockValidIcCkToken as IcTokenToggleable
			}),
			isSourceTokenIcrc2: readable(true)
		};

		icrc2Context.set(SWAP_CONTEXT_KEY, icrc2SwapContext);
		icrc2Context.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
		icrc2Context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });

		const { container } = render(SwapIcpForm, {
			props: {
				...props,
				sourceTokenFee: 1000n
			},
			context: icrc2Context
		});

		expect(container).toBeInTheDocument();
	});

	it('should render exchange value displays', () => {
		const { container } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		const exchangeValues = container.querySelectorAll('[data-tid="swap-amount-exchange-value"]');

		expect(exchangeValues).toHaveLength(2);
	});

	it('should not render swap details when no source token', () => {
		const contextWithoutSource = new Map();
		const swapContextWithoutSource = initSwapContext({
			sourceToken: undefined,
			destinationToken: mockValidIcCkToken as IcTokenToggleable
		});

		contextWithoutSource.set(SWAP_CONTEXT_KEY, swapContextWithoutSource);
		contextWithoutSource.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
		contextWithoutSource.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });

		const { container } = render(SwapIcpForm, {
			props,
			context: contextWithoutSource
		});

		expect(container.querySelector('hr')).not.toBeInTheDocument();
	});

	it('should calculate total fee as double for ICRC2 tokens', () => {
		const icrc2Context = new Map();
		const icrc2SwapContext = {
			...initSwapContext({
				sourceToken: mockValidIcToken as IcTokenToggleable,
				destinationToken: mockValidIcCkToken as IcTokenToggleable
			}),
			isSourceTokenIcrc2: readable(true)
		};

		icrc2Context.set(SWAP_CONTEXT_KEY, icrc2SwapContext);
		icrc2Context.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
		icrc2Context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });

		const { container } = render(SwapIcpForm, {
			props: {
				...props,
				sourceTokenFee: 1000n
			},
			context: icrc2Context
		});

		expect(container).toBeInTheDocument();
	});

	it('should call onShowProviderList when clicking provider button', () => {
		const onShowProviderList = vi.fn();

		const { container } = render(SwapIcpForm, {
			props: {
				...props,
				onShowProviderList
			},
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should render SwapProvider component', () => {
		const { container } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should render SwapFees component', () => {
		const { container } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	describe('Chain Fusion amount validation', () => {
		// 0.5 of the source token, taken out of what the minter withdraws.
		const deductedFee = 50_000_000n;

		// `amountForSwap` must match what the user types, or `SwapForm` treats the quote as
		// still loading and disables Review for that reason instead.
		const renderWithChainFusionQuote = ({
			amountForSwap,
			sourceToken = mockValidIcToken,
			swapDetails = {
				sourceFees: [
					{
						labelPath: 'fee.text.estimated_eth',
						fee: deductedFee,
						token: mockValidIcToken,
						deductedFromAmount: true
					}
				],
				externalFees: []
			}
		}: {
			amountForSwap: number;
			sourceToken?: typeof mockValidIcToken;
			swapDetails?: ChainFusionSwapDetails;
		}) => {
			balancesStore.set({
				id: sourceToken.id,
				data: { data: 100_000_000_000n, certified: true }
			});

			mockContext.set(SWAP_CONTEXT_KEY, {
				...initSwapContext({
					sourceToken: sourceToken as IcTokenToggleable,
					destinationToken: mockValidIcCkToken as IcTokenToggleable
				}),
				sourceTokenExchangeRate: readable(10),
				destinationTokenExchangeRate: readable(2),
				isSourceTokenIcrc2: readable(false)
			});

			icTokenFeeStore.setIcTokenFee({ tokenSymbol: sourceToken.symbol, fee: 1000n });

			const provider = mockChainFusionProvider(swapDetails);

			const amountsStore = initSwapAmountsStore();
			amountsStore.setSwaps({
				swaps: [provider],
				amountForSwap,
				selectedProvider: provider
			});
			mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: amountsStore });

			return render(SwapIcpForm, {
				props: { ...props, swapAmount: undefined },
				context: mockContext
			});
		};

		// `mockValidIcToken` carries the mainnet ckBTC ledger id, so it exercises the ckBTC
		// half of the per-minter copy. A ckETH withdrawal needs a ledger the ckBTC guard
		// does not claim.
		const ckEthSourceToken = {
			...mockValidIcToken,
			ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID
		};

		// The gas the minter burns comes out of the withdrawal, so an amount at or below it
		// converts to nothing. `SwapForm` only rejects a non-positive *source* amount, so
		// nothing else stops a zero-receive offer from reaching Review.
		it('disables review when the amount does not exceed the deducted fees', async () => {
			const { container, getByText } = renderWithChainFusionQuote({ amountForSwap: 0.5 });

			await enterAmount({ container, value: '0.5' });

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();
			});
		});

		it('leaves review enabled when the amount exceeds the deducted fees', async () => {
			const { container, getByText } = renderWithChainFusionQuote({ amountForSwap: 2 });

			await enterAmount({ container, value: '2' });

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).not.toBeDisabled();
			});
		});

		it('explains a zero-receive amount with the ledger-fees message, like Convert', async () => {
			const { container, getByText } = renderWithChainFusionQuote({ amountForSwap: 0.5 });

			await enterAmount({ container, value: '0.5' });

			await waitFor(() => {
				expect(
					getByText(
						replacePlaceholders(en.send.assertion.minimum_ledger_fees, {
							$symbol: mockValidIcToken.symbol
						})
					)
				).toBeInTheDocument();
			});
		});

		// Convert refuses to submit against minter parameters it has only read as a bare
		// query, and says so as an *info* message — nothing is wrong with the input, the
		// certified read simply has not landed yet. Same gate, same tone, here.
		it('disables review and explains while the minter info is not certified', async () => {
			const { container, getByText } = renderWithChainFusionQuote({
				amountForSwap: 2,
				sourceToken: ckEthSourceToken,
				swapDetails: {
					sourceFees: [],
					externalFees: [],
					minterInfoCertified: false
				}
			});

			await enterAmount({ container, value: '2' });

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();
				expect(getByText(en.send.info.cketh_certified)).toBeInTheDocument();
			});
		});

		// The two minters are separate configurations, so the message names the one the
		// source token belongs to — exactly as `IcConvertForm` does.
		it('names the ckBTC minter when the source is ckBTC', async () => {
			const { container, getByText } = renderWithChainFusionQuote({
				amountForSwap: 2,
				swapDetails: {
					sourceFees: [],
					externalFees: [],
					minterInfoCertified: false
				}
			});

			await enterAmount({ container, value: '2' });

			await waitFor(() => {
				expect(getByText(en.send.info.ckbtc_certified)).toBeInTheDocument();
			});
		});

		it('leaves review enabled once the minter info is certified', async () => {
			const { container, getByText } = renderWithChainFusionQuote({
				amountForSwap: 2,
				swapDetails: {
					sourceFees: [],
					externalFees: [],
					minterInfoCertified: true
				}
			});

			await enterAmount({ container, value: '2' });

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).not.toBeDisabled();
			});
		});
	});

	// `TokenInput` re-validates on the amount only, but these checks read the selected
	// offer, which lands a round-trip later. So the offer arriving — or being replaced, or
	// being swapped for another provider's — has to re-run the validation itself, or a
	// below-minimum amount reaches the minter and a stale error outlives its offer.
	describe('Chain Fusion validation against a later offer', () => {
		// 1 source token, above every amount entered below.
		const minimumAmount = 100_000_000n;

		const ckEthFeeToken = {
			...mockValidIcToken,
			id: parseTokenId('CkEthFeeTokenId'),
			symbol: 'ckETH'
		};

		const minimumAmountMessage = replacePlaceholders(en.send.assertion.minimum_amount, {
			$amount: formatToken({
				value: minimumAmount,
				unitName: mockValidIcToken.decimals,
				displayDecimals: mockValidIcToken.decimals
			}),
			$symbol: mockValidIcToken.symbol
		});

		// Reproduces the runtime order: the user types, the input's debounced validation runs
		// while no offer exists yet, and only then does the quote resolve. Draining the
		// debounce here is what makes these tests about the *re*-validation — leave it out and
		// they pass on the pending debounce picking the offer up by accident.
		const renderAndSettleBeforeTheOffer = async () => {
			balancesStore.set({
				id: mockValidIcToken.id,
				data: { data: 100_000_000_000n, certified: true }
			});

			const amountsStore = initSwapAmountsStore();
			mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: amountsStore });

			const rendered = render(SwapIcpForm, {
				props: { ...props, swapAmount: undefined },
				context: mockContext
			});

			vi.useFakeTimers();

			await enterAmount({ container: rendered.container, value: '0.5' });

			// `runAllTimersAsync`, not a fixed advance: the input reschedules its debounce as
			// effects flush, and a timer left pending would fire back in real time *after* the
			// offer lands — validating against it by accident and hiding the regression.
			await vi.runAllTimersAsync();

			expect(vi.getTimerCount()).toBe(0);

			vi.useRealTimers();

			return { ...rendered, amountsStore };
		};

		const landOffer = ({
			amountsStore,
			swapDetails
		}: {
			amountsStore: ReturnType<typeof initSwapAmountsStore>;
			swapDetails: ChainFusionSwapDetails;
		}) => {
			const provider = mockChainFusionProvider(swapDetails);

			amountsStore.setSwaps({ swaps: [provider], amountForSwap: 0.5, selectedProvider: provider });
		};

		it('rejects an amount below the minter minimum revealed by the offer', async () => {
			const { amountsStore, getByText } = await renderAndSettleBeforeTheOffer();

			landOffer({ amountsStore, swapDetails: { sourceFees: [], externalFees: [], minimumAmount } });

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();

				expect(getByText(minimumAmountMessage)).toBeInTheDocument();
			});
		});

		it('rejects an offer whose external fee exceeds the balance of the token it is charged in', async () => {
			const { amountsStore, getByText } = await renderAndSettleBeforeTheOffer();

			landOffer({
				amountsStore,
				swapDetails: {
					sourceFees: [],
					externalFees: [{ labelPath: 'fee.text.estimated_eth', fee: 1_000n, token: ckEthFeeToken }]
				}
			});

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();

				expect(
					getByText(
						replacePlaceholders(en.send.assertion.not_enough_tokens_for_gas, {
							$symbol: ckEthFeeToken.symbol,
							$balance: formatToken({
								value: ZERO,
								unitName: ckEthFeeToken.decimals,
								displayDecimals: ckEthFeeToken.decimals
							})
						})
					)
				).toBeInTheDocument();
			});
		});

		it('clears a Chain Fusion error when another provider becomes the selected offer', async () => {
			const { amountsStore, getByText, queryByText } = await renderAndSettleBeforeTheOffer();

			landOffer({ amountsStore, swapDetails: { sourceFees: [], externalFees: [], minimumAmount } });

			// The message, not just the disabled button: Review is also briefly disabled while
			// the new offer's receive amount has yet to flush, so the button alone would pass
			// before the validation has run at all.
			await waitFor(() => {
				expect(getByText(minimumAmountMessage)).toBeInTheDocument();
			});

			amountsStore.setSwaps({
				swaps: [mockOneSecProvider],
				amountForSwap: 0.5,
				selectedProvider: mockOneSecProvider
			});

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).not.toBeDisabled();

				expect(queryByText(minimumAmountMessage)).not.toBeInTheDocument();
			});
		});
	});

	// OISY Trade is the only ICP provider that refuses an amount outright — a fill-or-kill
	// order has to sit on the pair's lot grid and inside its notional bounds. The form has to
	// name that reason when it is the whole story, and stay entirely out of the way when it
	// is not: the grid is OISY Trade's business, and four other providers quote the same pair.
	describe('OISY Trade grid explanation', () => {
		const ICP_LEDGER = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
		const CKUSDC_LEDGER = 'xevnm-gaaaa-aaaar-qafnq-cai';

		const icpToken = {
			...mockValidIcToken,
			ledgerCanisterId: ICP_LEDGER,
			decimals: 8,
			symbol: 'ICP',
			fee: 10_000n
		};

		const usdcToken = {
			...mockValidIcToken,
			id: parseTokenId('CkUsdcTokenId'),
			ledgerCanisterId: CKUSDC_LEDGER,
			decimals: 6,
			symbol: 'ckUSDC',
			fee: 10_000n
		};

		// A 0.01 ICP lot, so 1.23 sits on the grid and 1.234 does not. The tick is 0.001
		// ckUSDC per whole ICP, which the 1:1 placeholder price floors onto exactly.
		const buildPair = ({ minNotional = 1_000n }: { minNotional?: bigint } = {}) =>
			({
				status: { Trading: null },
				base: {
					id: { ledger_id: Principal.fromText(ICP_LEDGER) },
					metadata: { symbol: 'ICP', decimals: 8 }
				},
				quote: {
					id: { ledger_id: Principal.fromText(CKUSDC_LEDGER) },
					metadata: { symbol: 'ckUSDC', decimals: 6 }
				},
				lot_size: 1_000_000n,
				tick_size: 1_000n,
				min_notional: minNotional,
				max_notional: [],
				maker_fee_bps: 5,
				taker_fee_bps: 10
			}) as unknown as TradingPairInfo;

		const lotMessage = replacePlaceholders(en.trading.limit_order.error_lot_multiple, {
			$step: '0.01',
			$symbol: 'ICP'
		});

		// `amountForSwap` has to match what the user types, or `SwapForm` reads the quote as
		// still loading and neither message is reached.
		const renderWithOisyTradePair = ({
			swaps = [],
			amountForSwap,
			minNotional,
			pairs = [buildPair({ minNotional })],
			isSourceTokenIcrc2 = true
		}: {
			swaps?: SwapMappedResult[];
			amountForSwap: number;
			minNotional?: bigint;
			pairs?: TradingPairInfo[];
			isSourceTokenIcrc2?: boolean;
		}) => {
			oisyTradeStore.setPairs(pairs);

			balancesStore.set({
				id: icpToken.id,
				data: { data: 100_000_000_000n, certified: true }
			});

			mockContext.set(SWAP_CONTEXT_KEY, {
				...initSwapContext({
					sourceToken: icpToken as IcTokenToggleable,
					destinationToken: usdcToken as IcTokenToggleable
				}),
				sourceTokenExchangeRate: readable(10),
				destinationTokenExchangeRate: readable(2),
				isSourceTokenIcrc2: readable(isSourceTokenIcrc2)
			});

			icTokenFeeStore.setIcTokenFee({ tokenSymbol: icpToken.symbol, fee: 1000n });

			const amountsStore = initSwapAmountsStore();
			amountsStore.setSwaps({ swaps, amountForSwap, selectedProvider: swaps[0] });
			mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: amountsStore });

			return render(SwapIcpForm, {
				props: { ...props, swapAmount: undefined },
				context: mockContext
			});
		};

		afterEach(() => {
			oisyTradeStore.reset();
		});

		it('names the lot grid when no provider quoted the amount', async () => {
			const { container, getByText } = renderWithOisyTradePair({ amountForSwap: 1.234 });

			await enterAmount({ container, value: '1.234' });

			await waitFor(() => {
				expect(getByText(lotMessage)).toBeInTheDocument();
			});
		});

		// The generic message and the specific one contradict each other: a swap *is* offered,
		// just not for this amount. `notOfferedExplained` is what suppresses the generic one.
		it('replaces the generic not-offered message rather than doubling it', async () => {
			const { container, getByText, queryByText } = renderWithOisyTradePair({
				amountForSwap: 1.234
			});

			await enterAmount({ container, value: '1.234' });

			await waitFor(() => {
				expect(getByText(lotMessage)).toBeInTheDocument();
			});

			expect(queryByText(en.swap.text.swap_is_not_offered)).not.toBeInTheDocument();
		});

		// A 1 ICP order at the 1:1 placeholder is a notional of 1 ckUSDC, under a floor of 10.
		it('names the minimum order value when the amount is on the grid but too small', async () => {
			const { container, getByText } = renderWithOisyTradePair({
				amountForSwap: 1,
				minNotional: 10_000_000n
			});

			await enterAmount({ container, value: '1' });

			await waitFor(() => {
				expect(
					getByText(
						replacePlaceholders(en.trading.limit_order.error_min_notional, {
							$amount: '10',
							$symbol: 'ckUSDC'
						})
					)
				).toBeInTheDocument();
			});
		});

		// The single highest-risk behaviour in the integration: an ICP source has five
		// providers, and OISY Trade's lot grid must never reach `errorType` and disable Review
		// for someone swapping 1.234 ICP through a provider that does not care about lots.
		it('leaves Review enabled for an off-grid amount another provider quotes', async () => {
			const { container, getByText, queryByText } = renderWithOisyTradePair({
				swaps: [mockOneSecProvider],
				amountForSwap: 1.234
			});

			await enterAmount({ container, value: '1.234' });

			await waitFor(() => {
				expect(getByText(en.swap.text.review_button).closest('button')).not.toBeDisabled();
			});

			expect(queryByText(lotMessage)).not.toBeInTheDocument();
		});

		// A source ledger without ICRC-2 cannot be deposited on OISY Trade at all, so the
		// grid is not the reason there is no offer: the generic message stands rather than
		// a lot-size hint that would wrongly imply fixing the amount could produce one.
		it('says nothing when the source ledger has no ICRC-2', async () => {
			const { container, getByText, queryByText } = renderWithOisyTradePair({
				amountForSwap: 1.234,
				isSourceTokenIcrc2: false
			});

			await enterAmount({ container, value: '1.234' });

			await waitFor(() => {
				expect(getByText(en.swap.text.swap_is_not_offered)).toBeInTheDocument();
			});

			expect(queryByText(lotMessage)).not.toBeInTheDocument();
		});

		// No pair means no opinion: the absence is not OISY Trade's to explain, so the generic
		// message stands.
		it('says nothing when the two tokens are not an OISY Trade pair', async () => {
			const { container, getByText, queryByText } = renderWithOisyTradePair({
				amountForSwap: 1.234,
				pairs: []
			});

			await enterAmount({ container, value: '1.234' });

			await waitFor(() => {
				expect(getByText(en.swap.text.swap_is_not_offered)).toBeInTheDocument();
			});

			expect(queryByText(lotMessage)).not.toBeInTheDocument();
		});

		// `deposit` requires the on-ledger balance to cover `amount + 2 × ledger_fee`, because
		// the ledger charges on both `icrc2_approve` and `icrc2_transfer_from`. The ICRC-2
		// branch of `ledgerFeeLegs` already reserves exactly that, and OISY Trade only ever
		// quotes ICRC-2 sources — so Max is spendable here by construction, and this locks it.
		it('holds back two ledger fees on an ICRC-2 source, which is what the deposit needs', () => {
			const { getByTestId } = renderWithOisyTradePair({ amountForSwap: 1.23 });

			expect(getByTestId(MAX_BUTTON)).toHaveTextContent(
				formatToken({
					value: 100_000_000_000n - 2n * props.sourceTokenFee,
					unitName: icpToken.decimals,
					displayDecimals: icpToken.decimals
				})
			);
		});
	});
});
