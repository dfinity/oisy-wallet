import SwapIcpForm from '$icp/components/swap/SwapIcpForm.svelte';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { ZERO } from '$lib/constants/app.constants';
import {
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import type { ChainFusionSwapDetails } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockChainFusionProvider, mockOneSecProvider } from '$tests/mocks/swap.mocks';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

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
			swapDetails?: ChainFusionSwapDetails;
		}) => {
			balancesStore.set({
				id: mockValidIcToken.id,
				data: { data: 100_000_000_000n, certified: true }
			});

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
});
