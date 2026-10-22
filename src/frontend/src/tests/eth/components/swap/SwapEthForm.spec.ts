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
import { SWAP_CONTEXT_KEY, initSwapContext, type SwapContext } from '$lib/stores/swap.store';
import type { OptionAmount } from '$lib/types/send';
import { formatToken } from '$lib/utils/format.utils';
import { withLifiMaxFeeHeadroom } from '$lib/utils/lifi-fee.utils';
import { parseTokenId } from '$lib/validation/token.validation';
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

			// LI.FI's fee with headroom: the review prices it again, at a fee per gas read anew.
			const maxForLifi = (fee: bigint) => maxFor(withLifiMaxFeeHeadroom(fee));

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
			const amount = writable<OptionAmount>();

			const setFee = async (value: bigint) => {
				fee.set(value);
				await vi.advanceTimersByTimeAsync(500);
			};

			const renderForm = ({ isLifi = true }: { isLifi?: boolean } = {}) => {
				const { swapAmount: _, ...rest } = props;

				return render(SwapEthFormLifiTest, {
					props: { ...rest, lifiFee: fee, amount, isLifi },
					context: mockContext
				});
			};

			const renderWithMax = async () => {
				fee.set(lifiFee);
				amount.set(undefined);

				const result = renderForm();

				await fireEvent.click(result.getByTestId(MAX_BUTTON));
				await vi.advanceTimersByTimeAsync(500);

				return result;
			};

			// Picking a provider is a step of its own, and every step change rebuilds the form: "Max"
			// must survive it, or the amount keeps the max of the fee that no longer applies.
			it('should hold "Max" across the form being rebuilt, stepping to the new fee', async () => {
				const { unmount } = await renderWithMax();

				unmount();

				fee.set(lifiFee + 1_000n);

				renderForm();
				await vi.advanceTimersByTimeAsync(500);

				expect(get(amount)).toBe(maxForLifi(lifiFee + 1_000n));
			});

			it('should step down to a higher fee and hold there when the fee falls back', async () => {
				const { container } = await renderWithMax();

				expect(amountOf(container)).toBe(maxForLifi(lifiFee));

				await setFee(lifiFee + 1_000n);

				expect(amountOf(container)).toBe(maxForLifi(lifiFee + 1_000n));

				await setFee(lifiFee - 1_000n);

				expect(amountOf(container)).toBe(maxForLifi(lifiFee + 1_000n));
			});

			// The form is rebuilt at every step change, and a fee that fell meanwhile must not raise the
			// amount: that is a step up and a re-quote nobody asked for.
			it('should keep the highest fee across the form being rebuilt', async () => {
				const { unmount } = await renderWithMax();

				await setFee(lifiFee + 1_000n);

				unmount();

				fee.set(lifiFee - 1_000n);

				renderForm();
				await vi.advanceTimersByTimeAsync(500);

				expect(get(amount)).toBe(maxForLifi(lifiFee + 1_000n));
			});

			// A destroyed form's pending re-application must not write the amount while the rebuilt one
			// does not know its fee yet.
			it('should hold the amount while a rebuilt form does not know its fee', async () => {
				const { unmount } = await renderWithMax();

				fee.set(lifiFee + 1_000n);
				await vi.advanceTimersByTimeAsync(100);

				unmount();

				fee.set(undefined);

				renderForm();
				await vi.advanceTimersByTimeAsync(1_000);

				expect(get(amount)).toBe(maxForLifi(lifiFee));

				await setFee(lifiFee - 1_000n);

				expect(get(amount)).toBe(maxForLifi(lifiFee + 1_000n));
			});

			// A token picker clears the offers, and cancelling it rebuilds this form while they reload,
			// with none selected: that is no provider switch.
			describe('while the offers reload', () => {
				// What the fee context estimates a plain transfer at here, far below LI.FI's fee.
				const plainFee = 21_000n;

				const offers = writable<unknown>(null);

				const offerOf = (provider: string) => ({
					selectedProvider: { provider, receiveAmount: 1n },
					swaps: []
				});

				// Max held at a fee that rose, then the picker cleared the offers and the form is rebuilt.
				const renderReloading = async () => {
					offers.set(offerOf('lifi'));
					mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: offers });

					const { unmount } = await renderWithMax();

					await setFee(lifiFee + 1_000n);

					unmount();

					offers.set(null);
					fee.set(undefined);

					const reloading = renderForm({ isLifi: false });

					await vi.advanceTimersByTimeAsync(1_000);

					return reloading;
				};

				it('should hold "Max" rather than follow the plain estimate', async () => {
					await renderReloading();

					expect(get(amount)).toBe(maxForLifi(lifiFee + 1_000n));
				});

				it('should keep the highest fee for LI.FI back with a lower one', async () => {
					const { unmount } = await renderReloading();

					unmount();

					offers.set(offerOf('lifi'));
					fee.set(lifiFee - 1_000n);

					renderForm();
					await vi.advanceTimersByTimeAsync(1_000);

					expect(get(amount)).toBe(maxForLifi(lifiFee + 1_000n));
				});

				it("should follow another provider's fee once one is chosen", async () => {
					const { unmount } = await renderReloading();

					unmount();

					offers.set(offerOf('velora'));

					renderForm({ isLifi: false });
					await vi.advanceTimersByTimeAsync(1_000);

					expect(get(amount)).toBe(maxFor(plainFee));
				});
			});

			it("should leave room for LI.FI's fee and 10 % more", async () => {
				await renderWithMax();

				expect(get(amount)).toBe('0.9978');
			});

			// Another destination is another route, whose fee the old one says nothing about.
			describe('a new destination', () => {
				const otherDestination = {
					...mockValidErc20Token,
					id: parseTokenId('LifiOtherDestination')
				};

				const offers = writable<unknown>({
					selectedProvider: { provider: 'lifi', receiveAmount: 1n },
					swaps: []
				});

				const renderForNewDestination = async () => {
					mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: offers });

					const { unmount } = await renderWithMax();

					await setFee(lifiFee + 1_000n);

					unmount();

					(mockContext.get(SWAP_CONTEXT_KEY) as SwapContext).setDestinationToken(otherDestination);
				};

				it('should hold the old reservation while its offers reload', async () => {
					await renderForNewDestination();

					offers.set(null);
					fee.set(undefined);

					renderForm({ isLifi: false });
					await vi.advanceTimersByTimeAsync(1_000);

					expect(get(amount)).toBe(maxForLifi(lifiFee + 1_000n));
				});

				it("should start over from LI.FI's fee for it, even a lower one", async () => {
					await renderForNewDestination();

					fee.set(lifiFee - 1_000n);

					renderForm();
					await vi.advanceTimersByTimeAsync(1_000);

					expect(get(amount)).toBe(maxForLifi(lifiFee - 1_000n));
				});
			});

			it('should start from the fee of the moment when "Max" is pressed again', async () => {
				const { container, getByTestId } = await renderWithMax();

				await setFee(lifiFee + 1_000n);
				await setFee(lifiFee - 1_000n);

				expect(amountOf(container)).toBe(maxForLifi(lifiFee + 1_000n));

				// At once, not after the debounce a fee change waits out.
				await fireEvent.click(getByTestId(MAX_BUTTON));

				expect(amountOf(container)).toBe(maxForLifi(lifiFee - 1_000n));
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

				expect(amountOf(container)).toBe(maxForLifi(lifiFee - 1_000n));
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
