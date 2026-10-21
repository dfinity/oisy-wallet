import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SwapEthForm from '$eth/components/swap/SwapEthForm.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import type { Erc20Token } from '$eth/types/erc20';
import {
	MAX_BUTTON,
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { formatToken } from '$lib/utils/format.utils';
import SwapEthFormLifiTest from '$tests/eth/components/swap/SwapEthFormLifiTest.svelte';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get, readable, writable } from 'svelte/store';

vi.mock('$lib/utils/parse.utils', async () => {
	const { ZERO } = await import('$lib/constants/app.constants');
	return {
		parseToken: vi.fn(),
		tryParseToken: vi.fn().mockReturnValue(ZERO)
	};
});

describe('SwapFormEth', () => {
	const mockContext = new Map();

	beforeEach(() => {
		const originalSwapContext = initSwapContext({
			sourceToken: mockValidErc20Token,
			destinationToken: ETHEREUM_TOKEN as Erc20Token
		});

		const mockSwapContext = {
			...originalSwapContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2)
		};

		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);

		mockContext.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore: initEthFeeStore(),
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);

		const swapAmountsStore = writable({
			selectedProvider: {
				provider: 'Velora',
				receiveAmount: 1n
			},
			swaps: []
		});

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });
	});

	afterEach(() => {
		mockContext.clear();
	});

	const props = {
		swapAmount: '1',
		receiveAmount: 2,
		slippageValue: '0.5',
		nativeEthereumToken: ETHEREUM_TOKEN,
		isSwapAmountsLoading: false,
		isApproveNeeded: false,
		isGasless: false,
		onShowTokensList: () => {},
		onShowProviderList: () => {},
		onClose: () => {},
		onNext: () => {}
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const switchButtonSelector = `button[data-tid="${SWAP_SWITCH_TOKENS_BUTTON}"]`;

	it('should render all fields', () => {
		const { container, getByTestId, getByText } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();

		expect(getByText(get(i18n).fee.text.total_fee)).toBeInTheDocument();

		const switchButton: HTMLButtonElement | null = container.querySelector(switchButtonSelector);

		expect(switchButton).not.toBeNull();
	});

	it('should render the component', () => {
		const { container } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should not render swap details when no destination token', () => {
		const contextWithoutDestination = new Map();
		const swapContextWithoutDestination = initSwapContext({
			sourceToken: mockValidErc20Token,
			destinationToken: undefined
		});

		contextWithoutDestination.set(SWAP_CONTEXT_KEY, swapContextWithoutDestination);
		contextWithoutDestination.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore: initEthFeeStore(),
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);
		contextWithoutDestination.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });

		const { queryByText } = render(SwapEthForm, {
			props,
			context: contextWithoutDestination
		});

		expect(queryByText(get(i18n).fee.text.total_fee)).not.toBeInTheDocument();
	});

	it('should handle loading state', () => {
		const { container } = render(SwapEthForm, {
			props: {
				...props,
				isSwapAmountsLoading: true
			},
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should render token selection buttons', () => {
		const { container } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		const tokenButtons = container.querySelectorAll('button svg');

		expect(tokenButtons.length).toBeGreaterThanOrEqual(2);
	});

	it('should render exchange value displays', () => {
		const { container } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		const exchangeValues = container.querySelectorAll('[data-tid="swap-amount-exchange-value"]');

		expect(exchangeValues).toHaveLength(1);
	});

	it('should render action buttons', () => {
		const { getByText } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		expect(getByText(get(i18n).core.text.cancel)).toBeInTheDocument();
		expect(getByText(get(i18n).swap.text.review_button)).toBeInTheDocument();
	});

	describe('a LI.FI offer', () => {
		const lifiFee = 2_000_000_000_000_000n;

		// A fee sample in hand, which the form validates against, and an ETH balance.
		const withFeeAndEthBalance = (ethBalance: bigint) => {
			const feeStore = initEthFeeStore();

			feeStore.setFee({ gas: 21_000n, maxFeePerGas: 1n, maxPriorityFeePerGas: 1n });

			mockContext.set(
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
				})
			);

			balancesStore.set({ id: ETHEREUM_TOKEN.id, data: { data: ethBalance, certified: false } });
		};

		const reviewButton = (getByText: (text: string) => HTMLElement) =>
			getByText(get(i18n).swap.text.review_button).closest('button');

		afterEach(() => {
			balancesStore.reset(ETHEREUM_TOKEN.id);
		});

		it("should show LI.FI's own fee rather than the fee context's", () => {
			const { getByText } = render(SwapEthForm, {
				props: { ...props, isLifi: true, lifiFee },
				context: mockContext
			});

			expect(getByText(/0\.002/)).toBeInTheDocument();
		});

		it('should hold the review while the fee is unknown', () => {
			withFeeAndEthBalance(lifiFee);

			const { getByText } = render(SwapEthForm, {
				props: { ...props, isLifi: true, lifiFee: undefined },
				context: mockContext
			});

			expect(reviewButton(getByText)).toBeDisabled();
		});

		it('should let the review through when the ETH balance covers the fee', () => {
			withFeeAndEthBalance(lifiFee);

			const { getByText } = render(SwapEthForm, {
				props: { ...props, isLifi: true, lifiFee },
				context: mockContext
			});

			expect(reviewButton(getByText)).toBeEnabled();
		});

		it('should refuse an ETH balance below the fee of an ERC-20 swap', () => {
			withFeeAndEthBalance(lifiFee - 1n);

			const { getByText } = render(SwapEthForm, {
				props: { ...props, isLifi: true, lifiFee },
				context: mockContext
			});

			expect(reviewButton(getByText)).toBeDisabled();
		});

		// LI.FI's fee comes with each quote, and each quote with the amount "Max" sets: following
		// the fee both ways, "Max" would re-quote with every amount it sets and never settle.
		describe('"Max" from an ETH source', () => {
			const balance = 1_000_000_000_000_000_000n;

			const maxFor = (fee: bigint) =>
				formatToken({
					value: balance - fee,
					unitName: ETHEREUM_TOKEN.decimals,
					displayDecimals: ETHEREUM_TOKEN.decimals
				});

			const amountOf = (container: HTMLElement) =>
				(container.querySelector(amountSelector) as HTMLInputElement).value;

			beforeEach(() => {
				vi.useFakeTimers();

				mockContext.set(SWAP_CONTEXT_KEY, {
					...initSwapContext({
						sourceToken: ETHEREUM_TOKEN,
						destinationToken: mockValidErc20Token
					}),
					sourceTokenExchangeRate: readable(10),
					destinationTokenExchangeRate: readable(2)
				});

				withFeeAndEthBalance(balance);
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const fee = writable<bigint | undefined>(lifiFee);

			const setFee = async (value: bigint) => {
				fee.set(value);
				await vi.advanceTimersByTimeAsync(500);
			};

			const renderWithMax = async () => {
				fee.set(lifiFee);

				const { swapAmount: _, ...rest } = props;

				const result = render(SwapEthFormLifiTest, {
					props: { ...rest, lifiFee: fee },
					context: mockContext
				});

				await fireEvent.click(result.getByTestId(MAX_BUTTON));
				await vi.advanceTimersByTimeAsync(500);

				return result;
			};

			it('should step down to a higher fee and hold there when the fee falls back', async () => {
				const { container } = await renderWithMax();

				expect(amountOf(container)).toBe(maxFor(lifiFee));

				await setFee(lifiFee + 1_000n);

				expect(amountOf(container)).toBe(maxFor(lifiFee + 1_000n));

				await setFee(lifiFee - 1_000n);

				expect(amountOf(container)).toBe(maxFor(lifiFee + 1_000n));
			});

			it('should follow the fee anew once the amount is typed and "Max" pressed again', async () => {
				const { container, getByTestId } = await renderWithMax();

				await setFee(lifiFee + 1_000n);

				await fireEvent.input(container.querySelector(amountSelector) as HTMLInputElement, {
					target: { value: '0.5' }
				});

				await setFee(lifiFee - 1_000n);

				expect(amountOf(container)).toBe('0.5');

				await fireEvent.click(getByTestId(MAX_BUTTON));
				await vi.advanceTimersByTimeAsync(500);

				expect(amountOf(container)).toBe(maxFor(lifiFee - 1_000n));
			});
		});
	});

	it('should show fee info message', () => {
		const { container, getByText } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		expect(container.querySelector('[data-tid="swap-fee-info"]')).toBeInTheDocument();
		expect(
			getByText(new RegExp(`${get(i18n).send.info.fee_info.split('$feeSymbol')[0]}ETH`))
		).toBeInTheDocument();
	});
});
