import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import type { IcToken } from '$icp/types/ic-token';
import SwapForm from '$lib/components/swap/SwapForm.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	SWAP_SLIPPAGE_INVALID_VALUE,
	SWAP_SLIPPAGE_VELORA_INVALID_VALUE
} from '$lib/constants/swap.constants';
import {
	SWAP_DESTINATION_TOKEN_BALANCE,
	SWAP_SWITCH_TOKENS_BUTTON,
	SWAP_TWO_SWAPS_HINT,
	SWAP_TWO_SWAPS_HINT_BUTTON,
	TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON,
	TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { trackSwapTwoSwapsHint } from '$lib/services/swap-two-swaps-hint-analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import { COLORED_NETWORK_LOGOS_CONTEXT_KEY } from '$lib/stores/colored-network-logos.store';
import {
	SWAP_AMOUNTS_CONTEXT_KEY,
	initSwapAmountsStore,
	type SwapAmountsStoreData
} from '$lib/stores/swap-amounts.store';
import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import type { OptionAmount } from '$lib/types/send';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { act, fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get, readable } from 'svelte/store';

vi.mock('$lib/services/swap-two-swaps-hint-analytics.services', () => ({
	trackSwapTwoSwapsHint: vi.fn()
}));

describe('SwapForm', () => {
	const mockContext = new Map();

	const mockSwapAmounts: SwapAmountsStoreData = {
		amountForSwap: 1,
		swaps: mockSwapProviders,
		selectedProvider: mockSwapProviders[0]
	};

	beforeEach(() => {
		const mockToken = { ...mockValidIcToken, enabled: true };

		const originalContext = initSwapContext({
			sourceToken: mockToken,
			destinationToken: mockToken
		});

		const mockSwapContext = {
			...originalContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2)
		};

		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);
	});

	const setupSwapAmountsStore = (swapAmounts?: SwapAmountsStoreData) => {
		const swapAmountsStore = initSwapAmountsStore();
		if (swapAmounts) {
			swapAmountsStore.setSwaps(swapAmounts);
		}
		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });
		return swapAmountsStore;
	};

	const setupIcTokenFeeStore = () => {
		icTokenFeeStore.setIcTokenFee({
			tokenSymbol: mockValidIcToken.symbol,
			fee: 1000n
		});
		mockContext.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
	};

	describe('current-parameter Review readiness', () => {
		it('blocks Review for a foreground round with a usable same-amount quote', async () => {
			const store = setupSwapAmountsStore(mockSwapAmounts);
			const activity = initSwapQuoteActivityStore();
			mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store, activity });
			setupIcTokenFeeStore();
			const onNext = vi.fn();
			const { getByRole } = render(SwapForm, {
				props: {
					swapAmount: '1',
					slippageValue: '1',
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext
				},
				context: mockContext
			});
			const review = getByRole('button', { name: en.swap.text.review_button });

			expect(review).toBeEnabled();

			await act(() => activity.start({ requestId: 1, background: false }));

			expect(review).toBeDisabled();

			await act(() => review.click());

			expect(onNext).not.toHaveBeenCalled();
		});

		// A form reporting a problem off the pay field (an EVM swap whose network coin cannot cover
		// the gas) holds Review without painting the field, which only an amount error does.
		it.each([
			{ reason: 'the form reports itself', held: { disabled: true }, decorated: false },
			{
				reason: 'in the pay field',
				held: { errorType: 'insufficient-funds' as const },
				decorated: true
			}
		])('holds Review for a problem $reason', ({ held, decorated }) => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();
			const { container, getByRole } = render(SwapForm, {
				props: {
					swapAmount: '1',
					slippageValue: '1',
					isSwapAmountsLoading: false,
					fee: 1000n,
					...held,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});
			const payField = container
				.querySelector(`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`)
				?.closest('.token-input-currency');

			expect(getByRole('button', { name: en.swap.text.review_button })).toBeDisabled();
			expect(payField?.classList.contains('text-error-primary')).toBe(decorated);
		});
	});

	describe('switch tokens button', () => {
		it.each([
			{
				description: 'no swapAmount present',
				swapAmounts: undefined,
				props: { swapAmount: undefined, receiveAmount: undefined },
				expected: false
			},
			{
				description: 'swap amounts are loading',
				swapAmounts: mockSwapAmounts,
				props: { swapAmount: '2', receiveAmount: 2 },
				expected: true
			},
			{
				description: 'swap amount exists but receive amount is null',
				swapAmounts: { amountForSwap: 1, swaps: [], selectedProvider: undefined },
				props: { swapAmount: '1', receiveAmount: undefined },
				expected: true
			},
			{
				description: 'both amounts are set and not loading',
				swapAmounts: mockSwapAmounts,
				props: { swapAmount: '1', receiveAmount: 2 },
				expected: false
			}
		])('should handle button state when $description', ({ swapAmounts, props, expected }) => {
			setupSwapAmountsStore(swapAmounts as SwapAmountsStoreData);
			setupIcTokenFeeStore();

			const { getByTestId } = render(SwapForm, {
				props: {
					...props,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
			if (expected) {
				expect(button).toHaveAttribute('disabled');
			} else {
				expect(button).not.toHaveAttribute('disabled');
			}
		});

		it('should call switchTokens when button is clicked', async () => {
			const swapAmountsStore = setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			const resetSpy = vi.spyOn(swapAmountsStore, 'reset');

			const { getByTestId } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
			await fireEvent.click(button);

			expect(resetSpy).toHaveBeenCalled();
		});

		describe('with a receive token that cannot be picked to pay', () => {
			const sourceToken = { ...mockValidIcToken, enabled: true };
			const receiveToken = { ...mockValidIcToken, id: parseTokenId('ReceiveIcTokenId') };

			const renderWithReceiveToken = (destinationToken: TokenToggleable<Token>) => {
				setupSwapAmountsStore();
				setupIcTokenFeeStore();

				mockContext.set(SWAP_CONTEXT_KEY, {
					...initSwapContext({ sourceToken, destinationToken }),
					sourceTokenExchangeRate: readable(10),
					destinationTokenExchangeRate: readable(2)
				});

				return render(SwapForm, {
					props: {
						swapAmount: undefined,
						receiveAmount: undefined,
						slippageValue: undefined,
						isSwapAmountsLoading: false,
						onCustomValidate: vi.fn(),
						onShowTokensList: vi.fn(),
						onClose: vi.fn(),
						onNext: vi.fn()
					},
					context: mockContext
				});
			};

			afterEach(() => {
				balancesStore.reset(receiveToken.id);
			});

			it('should disable it for an inactive receive token', () => {
				const { getByTestId } = renderWithReceiveToken({ ...receiveToken, enabled: false });

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeDisabled();
			});

			it('should disable it for a receive token with a balance of zero', () => {
				balancesStore.set({ id: receiveToken.id, data: { data: ZERO, certified: true } });

				const { getByTestId } = renderWithReceiveToken({ ...receiveToken, enabled: true });

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeDisabled();
			});

			it('should enable it for an active receive token with a balance', () => {
				balancesStore.set({ id: receiveToken.id, data: { data: 5n, certified: true } });

				const { getByTestId } = renderWithReceiveToken({ ...receiveToken, enabled: true });

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeEnabled();
			});

			it('should enable it for an active receive token whose balance is still loading', () => {
				const { getByTestId } = renderWithReceiveToken({ ...receiveToken, enabled: true });

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeEnabled();
			});
		});

		describe('with a single token', () => {
			const payToken = { ...mockValidIcToken, enabled: true };
			const receiveToken = { ...mockValidIcToken, id: parseTokenId('ReceiveIcTokenId') };

			const renderWithTokens = ({
				sourceToken,
				destinationToken,
				swapAmount
			}: {
				sourceToken?: TokenToggleable<Token>;
				destinationToken?: TokenToggleable<Token>;
				swapAmount?: OptionAmount;
			}) => {
				setupSwapAmountsStore();
				setupIcTokenFeeStore();

				const swapContext = initSwapContext({ sourceToken, destinationToken });

				mockContext.set(SWAP_CONTEXT_KEY, {
					...swapContext,
					sourceTokenExchangeRate: readable(10),
					destinationTokenExchangeRate: readable(2)
				});

				return {
					swapContext,
					...render(SwapForm, {
						props: {
							swapAmount,
							receiveAmount: undefined,
							slippageValue: undefined,
							isSwapAmountsLoading: false,
							onCustomValidate: vi.fn(),
							onShowTokensList: vi.fn(),
							onClose: vi.fn(),
							onNext: vi.fn()
						},
						context: mockContext
					})
				};
			};

			afterEach(() => {
				balancesStore.reset(receiveToken.id);
				swapSupportedTokensStore.reset();
			});

			it('should disable it with no token', () => {
				const { getByTestId } = renderWithTokens({});

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeDisabled();
			});

			it('should enable it for a pay token alone, with an amount and no quote', () => {
				const { getByTestId } = renderWithTokens({ sourceToken: payToken, swapAmount: '1' });

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeEnabled();
			});

			it('should move a pay token alone to the receive side', async () => {
				const { getByTestId, swapContext } = renderWithTokens({
					sourceToken: payToken,
					swapAmount: '1'
				});

				await fireEvent.click(getByTestId(SWAP_SWITCH_TOKENS_BUTTON));

				expect(get(swapContext.sourceToken)).toBeUndefined();
				expect(get(swapContext.destinationToken)).toEqual(payToken);
			});

			it('should enable it for a receive token alone that can pay', () => {
				balancesStore.set({ id: receiveToken.id, data: { data: 5n, certified: true } });

				const { getByTestId } = renderWithTokens({
					destinationToken: { ...receiveToken, enabled: true }
				});

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeEnabled();
			});

			it('should move a receive token alone to the pay side', async () => {
				balancesStore.set({ id: receiveToken.id, data: { data: 5n, certified: true } });

				const destinationToken = { ...receiveToken, enabled: true };

				const { getByTestId, swapContext } = renderWithTokens({ destinationToken });

				await fireEvent.click(getByTestId(SWAP_SWITCH_TOKENS_BUTTON));

				expect(get(swapContext.sourceToken)).toEqual(destinationToken);
				expect(get(swapContext.destinationToken)).toBeUndefined();
			});

			it('should disable it for a receive token alone with a balance of zero', () => {
				balancesStore.set({ id: receiveToken.id, data: { data: ZERO, certified: true } });

				const { getByTestId } = renderWithTokens({
					destinationToken: { ...receiveToken, enabled: true }
				});

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeDisabled();
			});

			it('should disable it for an inactive receive token alone', () => {
				const { getByTestId } = renderWithTokens({
					destinationToken: { ...receiveToken, enabled: false }
				});

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeDisabled();
			});

			it('should disable it for a receive token alone that the pay list does not offer', () => {
				balancesStore.set({ id: receiveToken.id, data: { data: 5n, certified: true } });

				// Every ICP provider has a token list, and none lists the token.
				swapSupportedTokensStore.set({
					aggregated: {
						icp: { coverage: 'all', supportedTokenIds: new Set() },
						evm: { coverage: 'none', supportedTokenIds: new Set() },
						sol: { coverage: 'none', supportedTokenIds: new Set() },
						btc: { coverage: 'none', supportedTokenIds: new Set() },
						xrp: { coverage: 'none', supportedTokenIds: new Set() }
					},
					providers: []
				});

				const { getByTestId } = renderWithTokens({
					destinationToken: { ...receiveToken, enabled: true }
				});

				expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeDisabled();
			});
		});
	});

	describe('onTokensSwitch amount handling', () => {
		const token8Dec = {
			...mockValidIcToken,
			enabled: true,
			decimals: 8,
			id: parseTokenId('Token8Dec')
		} as IcToken;

		const token18Dec = {
			...mockValidIcToken,
			enabled: true,
			decimals: 18,
			id: parseTokenId('Token18Dec')
		} as IcToken;

		const setupContextWithTokens = ({
			source,
			destination
		}: {
			source: IcToken;
			destination: IcToken;
		}) => {
			const originalContext = initSwapContext({
				sourceToken: source,
				destinationToken: destination
			});

			mockContext.set(SWAP_CONTEXT_KEY, {
				...originalContext,
				sourceTokenExchangeRate: readable(1),
				destinationTokenExchangeRate: readable(1)
			});
		};

		const renderAndSwitch = async ({
			source,
			destination,
			storeReceiveAmount
		}: {
			source: IcToken;
			destination: IcToken;
			storeReceiveAmount: bigint;
		}) => {
			setupContextWithTokens({ source, destination });
			const swapAmountsStore = setupSwapAmountsStore({
				amountForSwap: 1,
				swaps: mockSwapProviders,
				selectedProvider: {
					...mockSwapProviders[0],
					receiveAmount: storeReceiveAmount
				}
			});
			setupIcTokenFeeStore();

			let swapAmount: OptionAmount = '1';

			const { getByTestId } = render(SwapForm, {
				props: {
					get swapAmount() {
						return swapAmount;
					},
					set swapAmount(v: OptionAmount) {
						swapAmount = v;
					},
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
			await fireEvent.click(button);

			return { swapAmount, swapAmountsStore };
		};

		it('should preserve amount when source and destination have same decimals', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token8Dec,
				destination: { ...token8Dec, id: parseTokenId('Token8DecB') } as IcToken,
				storeReceiveAmount: 112345678n
			});

			expect(swapAmount).toBe(1.12345678);
		});

		it('should handle switch with whole number amount', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token8Dec,
				destination: token18Dec,
				storeReceiveAmount: 100000000000000000000n
			});

			expect(swapAmount).toBe(100);
		});

		it('should handle switch with zero amount', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token8Dec,
				destination: token18Dec,
				storeReceiveAmount: ZERO
			});

			expect(swapAmount).toBe(0);
		});

		it('should handle switch with very small amount', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token18Dec,
				destination: token8Dec,
				storeReceiveAmount: 1n
			});

			expect(swapAmount).toBe(0.00000001);
		});

		it('should normalize amount through parseToken round-trip on switch', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token8Dec,
				destination: token18Dec,
				storeReceiveAmount: 1500000000000000000n
			});

			expect(swapAmount).toBe(1.5);
		});
	});

	describe('display values', () => {
		beforeEach(() => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();
		});

		const renderSwapForm = () =>
			render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

		it('should display initial token and USD values correctly', () => {
			const { getAllByTestId } = renderSwapForm();
			const [sourceTokenExchangeValue, destinationTokenExchangeValue] = getAllByTestId(
				TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE
			);
			const [sourceInput, destinationInput] = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

			expect(sourceTokenExchangeValue).toHaveTextContent('$10.00');
			expect(destinationTokenExchangeValue).toHaveTextContent('$20.00');
			expect(sourceInput).toHaveValue('1');
			expect(destinationInput).toHaveValue('10');
		});

		it.each([
			{ description: 'source', buttonIndex: 0 },
			{ description: 'destination', buttonIndex: 1 }
		])(
			'should switch between USD and token values when clicking $description exchange',
			async ({ buttonIndex }) => {
				const { getAllByTestId } = renderSwapForm();
				const buttons = getAllByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON);
				const [sourceTokenExchangeValue, destinationTokenExchangeValue] = getAllByTestId(
					TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE
				);
				const [sourceInput, destinationInput] = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

				const button = buttons[buttonIndex];

				await fireEvent.click(button);

				expect(sourceTokenExchangeValue).toHaveTextContent(`1 ${mockValidIcToken.symbol}`);
				expect(destinationTokenExchangeValue).toHaveTextContent(`10 ${mockValidIcCkToken.symbol}`);
				expect(sourceInput).toHaveValue('1');
				expect(destinationInput).toHaveValue('10');

				await fireEvent.click(button);

				expect(sourceTokenExchangeValue).toHaveTextContent('$10.00');
				expect(destinationTokenExchangeValue).toHaveTextContent('$20.00');
				expect(sourceInput).toHaveValue('1');
				expect(destinationInput).toHaveValue('10');
			}
		);
	});

	describe('receive balance', () => {
		const inactiveToken = { ...mockValidErc20Token, enabled: false };
		const activeToken = { ...mockValidErc20Token, enabled: true };

		beforeEach(() => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			balancesStore.reset(mockValidErc20Token.id);
		});

		const sourceToken = { ...mockValidIcToken, enabled: true };

		const renderWithDestination = (destinationToken: Token) => {
			mockContext.set(SWAP_CONTEXT_KEY, {
				...initSwapContext({ sourceToken, destinationToken }),
				sourceTokenExchangeRate: readable(10),
				destinationTokenExchangeRate: readable(2)
			});

			return render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});
		};

		const setBalance = (balance: bigint) =>
			balancesStore.set({
				id: mockValidErc20Token.id,
				data: { data: balance, certified: true }
			});

		it('should show no balance for an inactive token whose balance was not loaded', () => {
			const { queryByTestId } = renderWithDestination(inactiveToken);

			expect(queryByTestId(SWAP_DESTINATION_TOKEN_BALANCE)).not.toBeInTheDocument();
		});

		it('should show the balance of an inactive token when it was loaded', () => {
			setBalance(5n * 10n ** BigInt(inactiveToken.decimals));

			const { getByTestId } = renderWithDestination(inactiveToken);

			expect(getByTestId(SWAP_DESTINATION_TOKEN_BALANCE)).toHaveTextContent(
				`5 ${inactiveToken.symbol}`
			);
		});

		it('should show the balance of an active token, zero included', () => {
			setBalance(ZERO);

			const { getByTestId } = renderWithDestination(activeToken);

			expect(getByTestId(SWAP_DESTINATION_TOKEN_BALANCE)).toHaveTextContent(
				`0 ${activeToken.symbol}`
			);
		});
	});

	describe('swap not offered error', () => {
		it('should show error when swap is not offered', () => {
			setupSwapAmountsStore({
				amountForSwap: 1,
				swaps: [],
				selectedProvider: undefined
			});
			setupIcTokenFeeStore();

			const { container } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(container.querySelector('.text-error-primary')).toBeInTheDocument();
		});

		it('should not show error when swap amount is 0', () => {
			setupSwapAmountsStore({
				amountForSwap: 0,
				swaps: [],
				selectedProvider: undefined
			});
			setupIcTokenFeeStore();

			const { container } = render(SwapForm, {
				props: {
					swapAmount: '0',
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(container.querySelector('.text-error')).not.toBeInTheDocument();
		});

		it('should not show error when loading', () => {
			setupSwapAmountsStore({
				amountForSwap: 1,
				swaps: [],
				selectedProvider: undefined
			});
			setupIcTokenFeeStore();

			const { container } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: true,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(container.querySelector('.text-error')).not.toBeInTheDocument();
		});

		it('should show the generic message without a quote error', () => {
			setupSwapAmountsStore({
				amountForSwap: 1,
				swaps: [],
				selectedProvider: undefined
			});
			setupIcTokenFeeStore();

			const { getByText } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(getByText(en.swap.text.swap_is_not_offered)).toBeInTheDocument();
		});

		it('should show the provider minimum when the amount was refused as too low', () => {
			setupSwapAmountsStore({
				amountForSwap: 1,
				swaps: [],
				selectedProvider: undefined,
				quoteError: { type: 'amount-too-low', minAmount: 8300n }
			});
			setupIcTokenFeeStore();

			const { getByText, queryByText } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(
				getByText(
					replacePlaceholders(en.swap.text.swap_amount_too_low_minimum, {
						$amount: '0.000083',
						$symbol: mockValidIcToken.symbol
					})
				)
			).toBeInTheDocument();
			expect(queryByText(en.swap.text.swap_is_not_offered)).not.toBeInTheDocument();
		});

		it('should show the amount-too-low message without a minimum when the provider named none', () => {
			setupSwapAmountsStore({
				amountForSwap: 1,
				swaps: [],
				selectedProvider: undefined,
				quoteError: { type: 'amount-too-low' }
			});
			setupIcTokenFeeStore();

			const { getByText, queryByText } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(getByText(en.swap.text.swap_amount_too_low)).toBeInTheDocument();
			expect(queryByText(en.swap.text.swap_is_not_offered)).not.toBeInTheDocument();
		});

		describe('with two separate swaps through an in-between token', () => {
			const twoSwaps: SwapAmountsStoreData = {
				amountForSwap: 1,
				swaps: [],
				selectedProvider: undefined,
				quoteError: {
					type: 'two-swaps',
					intermediateToken: mockValidIcCkToken,
					provider: SwapProvider.LIFI
				}
			};

			const renderForm = ({
				swapAmount = '1',
				isSwapAmountsLoading = false,
				notOfferedExplained = false
			}: {
				swapAmount?: string;
				isSwapAmountsLoading?: boolean;
				notOfferedExplained?: boolean;
			} = {}) =>
				render(SwapForm, {
					props: {
						swapAmount,
						receiveAmount: undefined,
						slippageValue: undefined,
						isSwapAmountsLoading,
						notOfferedExplained,
						onCustomValidate: vi.fn(),
						onShowTokensList: vi.fn(),
						onClose: vi.fn(),
						onNext: vi.fn()
					},
					context: mockContext
				});

			beforeEach(() => {
				vi.clearAllMocks();

				setupSwapAmountsStore(twoSwaps);
				setupIcTokenFeeStore();
			});

			it('should show the hint beside the "not offered" line', () => {
				const { getByTestId, getByText } = renderForm();

				expect(getByTestId(SWAP_TWO_SWAPS_HINT)).toBeInTheDocument();
				expect(getByText(en.swap.text.swap_is_not_offered)).toBeInTheDocument();
			});

			it('should keep the hint up while the offers refresh', () => {
				const { getByTestId } = renderForm({ isSwapAmountsLoading: true });

				expect(getByTestId(SWAP_TWO_SWAPS_HINT)).toBeInTheDocument();
			});

			it('should not show the hint for an amount it was not quoted for', () => {
				const { queryByTestId } = renderForm({ swapAmount: '2' });

				expect(queryByTestId(SWAP_TWO_SWAPS_HINT)).not.toBeInTheDocument();
			});

			it('should not show the hint when the form explains the missing offer itself', () => {
				const { queryByTestId } = renderForm({ notOfferedExplained: true });

				expect(queryByTestId(SWAP_TWO_SWAPS_HINT)).not.toBeInTheDocument();
			});

			it('should show the hint in place of the cross-network note', () => {
				mockContext.set(SWAP_CONTEXT_KEY, {
					...initSwapContext({
						sourceToken: mockValidIcToken,
						destinationToken: mockValidErc20Token
					}),
					sourceTokenExchangeRate: readable(10),
					destinationTokenExchangeRate: readable(2)
				});

				const crossNetworkNote = 'You move tokens from';

				const { container, getByTestId } = renderForm();

				expect(getByTestId(SWAP_TWO_SWAPS_HINT)).toBeInTheDocument();
				expect(container).not.toHaveTextContent(crossNetworkNote);

				setupSwapAmountsStore();

				const { container: withoutHint } = renderForm();

				expect(withoutHint).toHaveTextContent(crossNetworkNote);
			});

			// The hint's props come from the quote error its button clears.
			it('should set the in-between token as the destination from its button', async () => {
				const swapAmountsStore = setupSwapAmountsStore(twoSwaps);
				const { destinationToken } = mockContext.get(SWAP_CONTEXT_KEY);

				const { getByTestId, queryByTestId } = renderForm();

				await fireEvent.click(getByTestId(SWAP_TWO_SWAPS_HINT_BUTTON));

				expect(get(destinationToken)).toBe(mockValidIcCkToken);
				expect(get(swapAmountsStore)).toBeNull();
				expect(queryByTestId(SWAP_TWO_SWAPS_HINT)).not.toBeInTheDocument();
			});

			const showCount = () =>
				vi.mocked(trackSwapTwoSwapsHint).mock.calls.filter(([{ action }]) => action === 'show')
					.length;

			it('should count the hint once when a refresh hides it and the next one brings it back', async () => {
				const swapAmountsStore = setupSwapAmountsStore(twoSwaps);

				const { queryByTestId } = renderForm();

				// A refresh whose answers name no in-between token.
				swapAmountsStore.setSwaps({ amountForSwap: 1, swaps: [], selectedProvider: undefined });
				await tick();

				expect(queryByTestId(SWAP_TWO_SWAPS_HINT)).not.toBeInTheDocument();

				swapAmountsStore.setSwaps(twoSwaps);
				await tick();

				expect(queryByTestId(SWAP_TWO_SWAPS_HINT)).toBeInTheDocument();
				expect(showCount()).toBe(1);
			});

			// The token picker rebuilds the form on its way back, with the same swap context.
			it('should count the hint once when the form is rebuilt', () => {
				const { unmount } = renderForm();

				unmount();

				const { getByTestId } = renderForm();

				expect(getByTestId(SWAP_TWO_SWAPS_HINT)).toBeInTheDocument();
				expect(showCount()).toBe(1);
			});

			it('should count the hint once per in-between token when a refresh replaces the token in place', async () => {
				const swapAmountsStore = setupSwapAmountsStore(twoSwaps);

				renderForm();

				// A refresh whose answer routes the pair through another token.
				swapAmountsStore.setSwaps({
					...twoSwaps,
					quoteError: {
						type: 'two-swaps',
						intermediateToken: mockValidErc20Token,
						provider: SwapProvider.LIFI
					}
				});
				await tick();

				// And back to the first: already counted.
				swapAmountsStore.setSwaps(twoSwaps);
				await tick();

				expect(
					vi
						.mocked(trackSwapTwoSwapsHint)
						.mock.calls.filter(([{ action }]) => action === 'show')
						.map(([{ intermediateToken }]) => intermediateToken)
				).toEqual([mockValidIcCkToken, mockValidErc20Token]);
			});
		});
	});

	describe('receiveAmount effect', () => {
		it('should update receiveAmount when selectedProvider changes', async () => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			let receiveAmount: number | undefined;

			render(SwapForm, {
				props: {
					swapAmount: '1',
					get receiveAmount() {
						return receiveAmount;
					},
					set receiveAmount(value) {
						receiveAmount = value;
					},
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			await waitFor(() => {
				expect(receiveAmount).toBeDefined();
			});
		});
	});

	describe('loading states', () => {
		it('shows receive-field loading throughout a same-amount foreground round', async () => {
			const store = setupSwapAmountsStore(mockSwapAmounts);
			const activity = initSwapQuoteActivityStore();
			mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store, activity });
			setupIcTokenFeeStore();

			const { getAllByTestId, getByText, getByRole, queryByText } = render(SwapForm, {
				props: {
					swapAmount: '1',
					slippageValue: '1',
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});
			const [, receiveInput] = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);
			const receiveField = receiveInput.closest('.token-input-currency');
			const difference = getByText(/^\+\d+\.\d+%$/);
			const review = getByRole('button', { name: en.swap.text.review_button });

			expect(receiveInput).toHaveValue('10');
			expect(receiveField).not.toHaveClass('animate-pulse');
			expect(review).toBeEnabled();

			await act(() => activity.start({ requestId: 1, background: false }));

			expect(receiveField).toHaveClass('animate-pulse');
			expect(receiveInput).toHaveValue('0');
			expect(difference).not.toBeInTheDocument();
			expect(review).toBeDisabled();

			await act(() => activity.complete({ requestId: 1 }));

			expect(receiveField).not.toHaveClass('animate-pulse');
			expect(receiveInput).toHaveValue('10');
			expect(queryByText(/^\+\d+\.\d+%$/)).toBeInTheDocument();
			expect(review).toBeEnabled();
		});

		it('keeps a usable receive amount visible during background refresh', async () => {
			const store = setupSwapAmountsStore(mockSwapAmounts);
			const activity = initSwapQuoteActivityStore();
			mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store, activity });
			setupIcTokenFeeStore();

			const { getAllByTestId, getByText, getByRole } = render(SwapForm, {
				props: {
					swapAmount: '1',
					slippageValue: '1',
					isSwapAmountsLoading: true,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});
			const [, receiveInput] = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);
			const difference = getByText(/^\+\d+\.\d+%$/);
			const review = getByRole('button', { name: en.swap.text.review_button });

			expect(receiveInput).toHaveValue('10');
			expect(review).toBeEnabled();

			await act(() => activity.start({ requestId: 1, background: true }));

			expect(receiveInput.closest('.token-input-currency')).not.toHaveClass('animate-pulse');
			expect(receiveInput).toHaveValue('10');
			expect(difference).toBeInTheDocument();
			expect(review).toBeEnabled();
		});

		it('shows receive-field loading before the first quote exists', async () => {
			const store = setupSwapAmountsStore();
			const activity = initSwapQuoteActivityStore();
			activity.start({ requestId: 1, background: false });
			mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store, activity });
			setupIcTokenFeeStore();

			const { getAllByTestId } = render(SwapForm, {
				props: {
					swapAmount: '1',
					slippageValue: '1',
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});
			const [, receiveInput] = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

			expect(receiveInput.closest('.token-input-currency')).toHaveClass('animate-pulse');
			expect(receiveInput).toHaveValue('0');

			await act(() => activity.complete({ requestId: 1 }));

			expect(receiveInput.closest('.token-input-currency')).not.toHaveClass('animate-pulse');
		});

		it('should show skeleton when fee is not loaded', () => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			const { container } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					fee: undefined,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(container.querySelector('.w-14, .w-16')).toBeInTheDocument();
		});

		it('should show loading state for destination amount when swapAmountsLoading is true', () => {
			setupSwapAmountsStore({
				amountForSwap: 2,
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});
			setupIcTokenFeeStore();

			const { getAllByTestId } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			const inputs = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

			expect(inputs[1]).toHaveValue('0');
		});
	});

	describe('networks', () => {
		beforeEach(() => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			const originalContext = initSwapContext({
				sourceToken: mockValidIcToken,
				destinationToken: mockValidErc20Token
			});

			mockContext.set(SWAP_CONTEXT_KEY, {
				...originalContext,
				sourceTokenExchangeRate: readable(10),
				destinationTokenExchangeRate: readable(2)
			});

			// As `SwapModalWizardSteps` does around the whole swap.
			mockContext.set(COLORED_NETWORK_LOGOS_CONTEXT_KEY, true);
		});

		afterEach(() => {
			mockContext.delete(COLORED_NETWORK_LOGOS_CONTEXT_KEY);
		});

		const renderSwapForm = () =>
			render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: '1',
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

		const networkLogoAlt = (name: string): string =>
			replacePlaceholders(en.core.alt.logo, { $name: name });

		it("should show each side's network with its coloured mark", () => {
			const { getByAltText } = renderSwapForm();

			expect(getByAltText(networkLogoAlt(ICP_NETWORK.name))).toHaveAttribute(
				'src',
				ICP_NETWORK.iconColored
			);
			expect(getByAltText(networkLogoAlt(ETHEREUM_NETWORK.name))).toHaveAttribute(
				'src',
				ETHEREUM_NETWORK.iconColored
			);
		});

		it('should not frame the panels in a network gradient when the networks differ', () => {
			const { container } = renderSwapForm();

			expect(container.querySelector('.bg-linear-to-b')).toBeNull();
		});
	});

	// The slippage is edited from the modal header: the form only blocks Review and says why.
	describe('slippage', () => {
		const renderWithSlippage = (slippageValue: OptionAmount) => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			return render(SwapForm, {
				props: {
					swapAmount: '1',
					slippageValue,
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});
		};

		const slippageError = (maxSlippage: number) =>
			replacePlaceholders(en.swap.text.max_slippage_error, {
				$maxSlippage: maxSlippage.toString()
			});

		const useErc20Source = () => {
			const originalContext = initSwapContext({
				sourceToken: mockValidErc20Token,
				destinationToken: mockValidIcToken
			});

			mockContext.set(SWAP_CONTEXT_KEY, {
				...originalContext,
				sourceTokenExchangeRate: readable(10),
				destinationTokenExchangeRate: readable(2)
			});
		};

		it('should not render the slippage control', () => {
			const { queryByRole } = renderWithSlippage('1');

			expect(
				queryByRole('button', { name: new RegExp(`^${en.swap.text.max_slippage}`) })
			).not.toBeInTheDocument();
		});

		it.each(['1', '8', '49.9999'])('should allow Review at %s%% from ICP', (slippageValue) => {
			const { getByRole, queryByText } = renderWithSlippage(slippageValue);

			expect(getByRole('button', { name: en.swap.text.review_button })).toBeEnabled();
			expect(queryByText(slippageError(SWAP_SLIPPAGE_INVALID_VALUE))).not.toBeInTheDocument();
		});

		it.each([undefined, '', '0', `${SWAP_SLIPPAGE_INVALID_VALUE}`])(
			'should block Review and say why at "%s" from ICP',
			(slippageValue) => {
				const { getByRole, getByText } = renderWithSlippage(slippageValue);

				expect(getByRole('button', { name: en.swap.text.review_button })).toBeDisabled();
				expect(getByText(slippageError(SWAP_SLIPPAGE_INVALID_VALUE))).toBeInTheDocument();
			}
		);

		it('should block Review from 15% on other networks', () => {
			useErc20Source();

			const { getByRole, getByText } = renderWithSlippage(`${SWAP_SLIPPAGE_VELORA_INVALID_VALUE}`);

			expect(getByRole('button', { name: en.swap.text.review_button })).toBeDisabled();
			expect(getByText(slippageError(SWAP_SLIPPAGE_VELORA_INVALID_VALUE))).toBeInTheDocument();
		});

		it('should allow Review below 15% on other networks', () => {
			useErc20Source();

			const { getByRole, queryByText } = renderWithSlippage('14');

			expect(getByRole('button', { name: en.swap.text.review_button })).toBeEnabled();
			expect(
				queryByText(slippageError(SWAP_SLIPPAGE_VELORA_INVALID_VALUE))
			).not.toBeInTheDocument();
		});
	});
});
