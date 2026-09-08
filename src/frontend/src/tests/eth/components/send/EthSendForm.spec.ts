import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SEND_TRANSACTION_PRIORITY_ENABLED } from '$env/send-transaction-priority.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendForm from '$eth/components/send/EthSendForm.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { ZERO } from '$lib/constants/app.constants';
import {
	ETH_FEE_PRIORITY,
	MAX_BUTTON,
	SEND_DESTINATION_SECTION,
	SEND_FEE_INFO,
	SEND_FORM_NEXT_BUTTON,
	SEND_INSUFFICIENT_FEE_INFO,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { EthFeePriority } from '$lib/enums/eth-fee-priority';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('EthSendForm', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ETHEREUM_TOKEN
		})
	);
	const feeStore = initEthFeeStore();
	feeStore.setFee({
		maxFeePerGas: 100n,
		maxPriorityFeePerGas: 5n,
		baseFeePerGas: 20n,
		gas: 21_000n
	});

	const feeContext = initEthFeeContext({
		feeStore,
		feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
		feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
		feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
		feeExchangeRateStore: writable(undefined)
	});

	// The priority row only renders once the network has offered tiers, so seed them: otherwise
	// the flag assertion below would pass for the wrong reason.
	feeContext.feePrioritiesStore.set({
		baseFeePerGas: 20n,
		perPriority: {
			[EthFeePriority.SLOW]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 1n },
			[EthFeePriority.STANDARD]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 5n },
			[EthFeePriority.FAST]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 20n }
		}
	});

	mockContext.set(ETH_FEE_CONTEXT_KEY, feeContext);

	const props = {
		destination: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		amount: '22000000',
		network: ETHEREUM_NETWORK,
		nativeEthereumToken: ETHEREUM_TOKEN,
		onBack: vi.fn(),
		onNext: vi.fn(),
		onTokensList: vi.fn(),
		cancel: mockSnippet
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const toolbarSelector = 'div[data-tid="toolbar"]';

	it('should render all fields', () => {
		const { container, getByTestId, getByText, queryByTestId } = render(EthSendForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SEND_DESTINATION_SECTION)).toBeInTheDocument();

		// The label follows the feature flag: the estimate only replaces the ceiling where the
		// priority work is enabled.
		expect(
			getByText(
				SEND_TRANSACTION_PRIORITY_ENABLED
					? en.fee.text.estimated_fee_eth
					: // max_fee_eth contains HTML, so match the leading plain-text fragment only
						'Max fee'
			)
		).toBeInTheDocument();

		// The priority row follows the same flag, so beta and production keep today's form.
		expect(queryByTestId(ETH_FEE_PRIORITY)).toStrictEqual(
			SEND_TRANSACTION_PRIORITY_ENABLED ? expect.anything() : null
		);

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});

	describe('the fee box', () => {
		const gas = 21_000n;
		const maxFeePerGas = 100n;
		const maxPriorityFeePerGas = 5n;

		// What the chain demands on top of the amount, and therefore what a native "Max" subtracts.
		const ceiling = maxFeePerGas * gas;
		// The weaker bound, which omits the base fee: a balance under it falls short of the fee
		// whichever of the two is in force.
		const tipOnly = maxPriorityFeePerGas * gas;

		// Several times the ceiling, so only the amount math is in play.
		const nativeBalance = 10_000_000n;

		const toEther = (value: bigint): string => {
			const padded = value.toString().padStart(ETHEREUM_TOKEN.decimals + 1, '0');

			return `${padded.slice(0, -ETHEREUM_TOKEN.decimals)}.${padded.slice(-ETHEREUM_TOKEN.decimals)}`;
		};

		const setup = ({
			token,
			nativeEthereumBalance,
			tokenBalance,
			amount
		}: {
			token: Token;
			nativeEthereumBalance: bigint;
			tokenBalance?: bigint;
			// Pre-filled amount, as a remounted step receives it - no input event is fired for it.
			amount?: string;
		}) => {
			const context = new Map<symbol, unknown>();
			context.set(SEND_CONTEXT_KEY, initSendContext({ token }));

			const feeStore = initEthFeeStore();
			feeStore.setFee({
				maxFeePerGas,
				maxPriorityFeePerGas,
				baseFeePerGas: 20n,
				gas
			});
			context.set(
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
					feeExchangeRateStore: writable(undefined)
				})
			);

			balancesStore.set({
				id: ETHEREUM_TOKEN.id,
				data: { data: nativeEthereumBalance, certified: true }
			});

			if (nonNullish(tokenBalance)) {
				balancesStore.set({ id: token.id, data: { data: tokenBalance, certified: true } });
			}

			const rendered = render(EthSendForm, {
				props: { ...props, amount },
				context
			});

			const input: HTMLInputElement | null = rendered.container.querySelector(amountSelector);

			assertNonNullish(input);

			return { ...rendered, input };
		};

		it('never shows the old blue "fee paid in" box for an ERC-20 send', () => {
			const { queryByTestId } = setup({
				token: mockValidErc20Token,
				nativeEthereumBalance: 10_000_000n,
				tokenBalance: 100_00000000n
			});

			expect(queryByTestId(SEND_FEE_INFO)).not.toBeInTheDocument();
		});

		it('shows the orange fee box, and blocks Next, when ETH cannot cover an ERC-20 fee', async () => {
			const { input, queryByTestId, getByText, getByTestId } = setup({
				token: mockValidErc20Token,
				nativeEthereumBalance: ZERO,
				tokenBalance: 100_00000000n
			});

			await fireEvent.input(input, { target: { value: '1' } });

			await waitFor(() => {
				expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
			});

			expect(
				getByText(
					replacePlaceholders(en.send.assertion.not_enough_tokens_for_gas, {
						$symbol: ETHEREUM_TOKEN.symbol,
						$balance: formatToken({
							value: ZERO,
							unitName: ETHEREUM_TOKEN.decimals,
							displayDecimals: ETHEREUM_TOKEN.decimals
						})
					})
				)
			).toBeInTheDocument();

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		it('shows the orange fee box again after the amount is cleared and retyped', async () => {
			const { input, queryByTestId } = setup({
				token: mockValidErc20Token,
				nativeEthereumBalance: ZERO,
				tokenBalance: 100_00000000n
			});

			await fireEvent.input(input, { target: { value: '1' } });

			await waitFor(() => {
				expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
			});

			await fireEvent.input(input, { target: { value: '' } });

			await waitFor(() => {
				expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
			});

			// A different, still-insufficient amount: the box must be re-evaluated from scratch, not
			// left stuck at whatever the cleared field last resolved to.
			await fireEvent.input(input, { target: { value: '2' } });

			await waitFor(() => {
				expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
			});
		});

		it('decorates the field and blocks Next, without the orange fee box, when an ERC-20 amount exceeds its own balance', async () => {
			const { input, queryByTestId, queryByText, getByTestId, container } = setup({
				token: mockValidErc20Token,
				nativeEthereumBalance: 10_000_000n,
				tokenBalance: 1n
			});

			await fireEvent.input(input, { target: { value: '5' } });

			await waitFor(() => {
				expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
			});

			await waitFor(() => {
				expect(queryByText(en.send.assertion.insufficient_funds_for_amount)).toBeInTheDocument();
			});

			expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).toHaveClass(
				'text-error-primary'
			);
			expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
		});

		// Two independent problems, and lowering the amount fixes only one of them: the user still
		// holds no ETH for gas afterwards. Reporting the amount alone hid that second problem until
		// they had corrected the first, so both are surfaced together.
		it('shows the field decoration and the orange fee box together when an ERC-20 amount exceeds its balance and ETH cannot cover the fee', async () => {
			const { input, queryByTestId, getByText, getByTestId, container } = setup({
				token: mockValidErc20Token,
				nativeEthereumBalance: ZERO,
				tokenBalance: 2_00000000n
			});

			await fireEvent.input(input, { target: { value: '10' } });

			await waitFor(() => {
				expect(getByText(en.send.assertion.insufficient_funds_for_amount)).toBeInTheDocument();
			});

			await waitFor(() => {
				expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
			});

			expect(
				getByText(
					replacePlaceholders(en.send.assertion.not_enough_tokens_for_gas, {
						$symbol: ETHEREUM_TOKEN.symbol,
						$balance: formatToken({
							value: ZERO,
							unitName: ETHEREUM_TOKEN.decimals,
							displayDecimals: ETHEREUM_TOKEN.decimals
						})
					})
				)
			).toBeInTheDocument();

			expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).toHaveClass(
				'text-error-primary'
			);
			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		// The chain check is one comparison (`amount + gas > balance`), and for a native send both
		// ways it can fail are the same problem for the user: the gas comes out of the balance the
		// amount is drawn from, so lowering the amount is the only fix. The message therefore always
		// reads as an amount problem and never as the gas variant, which belongs to ERC-20 sends.
		it('reads as an amount problem, never a gas one, when a native amount exceeds the balance', async () => {
			const { input, queryByTestId, queryByText, getByTestId, container } = setup({
				token: ETHEREUM_TOKEN,
				nativeEthereumBalance: 10_000_000n
			});

			await fireEvent.input(input, { target: { value: '11000000' } });

			await waitFor(() => {
				expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
			});

			await waitFor(() => {
				expect(queryByText(en.send.assertion.insufficient_funds_for_amount)).toBeInTheDocument();
			});

			expect(queryByText(en.send.assertion.insufficient_funds_for_gas)).not.toBeInTheDocument();
			expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).toHaveClass(
				'text-error-primary'
			);
			expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
		});

		// A native balance smaller than the gas fee is not an amount problem: "Max" renders 0 and no
		// value would go through, so the red field decoration was pointing the user at the one thing
		// they cannot correct. The shortfall belongs in the same orange box an ERC-20 send uses - the
		// native coin is already the fee token there.
		describe('a native balance that cannot cover the gas', () => {
			const shortOnGas = tipOnly - 1n;

			const expectedGasMessage = replacePlaceholders(en.send.assertion.not_enough_tokens_for_gas, {
				$symbol: ETHEREUM_TOKEN.symbol,
				$balance: formatToken({
					value: shortOnGas,
					unitName: ETHEREUM_TOKEN.decimals,
					displayDecimals: ETHEREUM_TOKEN.decimals
				})
			});

			it('shows the orange fee box alone, with the amount field still empty', async () => {
				const { queryByTestId, queryByText, getByText, getByTestId, container } = setup({
					token: ETHEREUM_TOKEN,
					nativeEthereumBalance: shortOnGas
				});

				await waitFor(() => {
					expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
				});

				expect(getByText(expectedGasMessage)).toBeInTheDocument();
				expect(
					queryByText(en.send.assertion.insufficient_funds_for_amount)
				).not.toBeInTheDocument();
				expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).not.toHaveClass(
					'text-error-primary'
				);
				expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
			});

			it('shows the orange fee box alone for an explicit 0, the most such a balance offers', async () => {
				const { input, queryByTestId, queryByText, getByTestId, container } = setup({
					token: ETHEREUM_TOKEN,
					nativeEthereumBalance: shortOnGas
				});

				await fireEvent.input(input, { target: { value: '0' } });

				await waitFor(() => {
					expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
				});

				expect(
					queryByText(en.send.assertion.insufficient_funds_for_amount)
				).not.toBeInTheDocument();
				expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).not.toHaveClass(
					'text-error-primary'
				);
				expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
			});

			// Two problems at once now: the amount really is more than the balance holds, and even a
			// corrected amount would still have no gas behind it. Suppressing either one would hide a
			// problem the user has to solve.
			it('shows the field decoration and the orange fee box together for an oversized amount', async () => {
				const { input, queryByTestId, getByText, getByTestId, container } = setup({
					token: ETHEREUM_TOKEN,
					nativeEthereumBalance: shortOnGas
				});

				await fireEvent.input(input, { target: { value: '10' } });

				await waitFor(() => {
					expect(getByText(en.send.assertion.insufficient_funds_for_amount)).toBeInTheDocument();
				});

				await waitFor(() => {
					expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
				});

				expect(getByText(expectedGasMessage)).toBeInTheDocument();
				expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).toHaveClass(
					'text-error-primary'
				);
				expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
			});
		});

		// The balance covers the gas comfortably here, so the amount is the only thing wrong: it fits
		// inside the balance but not once gas is reserved. That keeps the amount wording and no fee
		// box - lowering the amount is the fix.
		it('decorates the field, without the orange fee box, when gas tips a native amount over the balance', async () => {
			const { input, queryByTestId, getByText, getByTestId, container } = setup({
				token: ETHEREUM_TOKEN,
				nativeEthereumBalance: nativeBalance
			});

			await fireEvent.input(input, {
				target: { value: toEther(nativeBalance - ceiling + 1n) }
			});

			await waitFor(() => {
				expect(getByText(en.send.assertion.insufficient_funds_for_amount)).toBeInTheDocument();
			});

			expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).toHaveClass(
				'text-error-primary'
			);
			expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		it('leaves a native amount within the maximum undecorated, with Next enabled', async () => {
			const { input, queryByTestId, queryByText, getByTestId, container } = setup({
				token: ETHEREUM_TOKEN,
				nativeEthereumBalance: nativeBalance
			});

			await fireEvent.input(input, { target: { value: toEther(nativeBalance - ceiling) } });

			await waitFor(() => {
				expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeEnabled();
			});

			expect(queryByText(en.send.assertion.insufficient_funds_for_amount)).not.toBeInTheDocument();
			expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
			expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).not.toHaveClass(
				'text-error-primary'
			);
		});
	});

	// The amount step is fully remounted every time the wizard leaves and returns to it (e.g.
	// "Back" from Review), while the typed amount itself is preserved across that remount. A stale
	// default here would let "Next" be clicked once more before validation caught up - these mount
	// with an already-insufficient amount and assert "Next" is blocked immediately, with no input
	// event and no `waitFor`, which only passes if validation is not still racing an async check.
	describe('revalidating a (re)mounted step', () => {
		const setup = ({
			token,
			amount,
			nativeEthereumBalance,
			tokenBalance
		}: {
			token: Token;
			amount: string;
			nativeEthereumBalance: bigint;
			tokenBalance?: bigint;
		}) => {
			const context = new Map<symbol, unknown>();
			context.set(SEND_CONTEXT_KEY, initSendContext({ token }));

			const feeStore = initEthFeeStore();
			feeStore.setFee({
				maxFeePerGas: 100n,
				maxPriorityFeePerGas: 5n,
				baseFeePerGas: 20n,
				gas: 21_000n
			});
			context.set(
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
					feeExchangeRateStore: writable(undefined)
				})
			);

			balancesStore.set({
				id: ETHEREUM_TOKEN.id,
				data: { data: nativeEthereumBalance, certified: true }
			});

			if (nonNullish(tokenBalance)) {
				balancesStore.set({ id: token.id, data: { data: tokenBalance, certified: true } });
			}

			return render(EthSendForm, {
				props: { ...props, amount },
				context
			});
		};

		it('keeps Next blocked for an ERC-20 amount already over balance', () => {
			const { getByTestId } = setup({
				token: mockValidErc20Token,
				amount: '5',
				nativeEthereumBalance: 10_000_000n,
				tokenBalance: 1n
			});

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		it('keeps Next blocked for a native amount already short on gas', () => {
			const { getByTestId } = setup({
				token: ETHEREUM_TOKEN,
				amount: '1',
				nativeEthereumBalance: ZERO
			});

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		// Blocking "Next" without repainting the field left the step looking valid and behaving
		// invalid: the red border, the message and the red "Max" all have to come back with it.
		it('repaints the field decoration for a native amount already over the balance', () => {
			const { getByTestId, getByText, container } = setup({
				token: ETHEREUM_TOKEN,
				amount: '11000000',
				nativeEthereumBalance: 10_000_000n
			});

			expect(getByText(en.send.assertion.insufficient_funds_for_amount)).toBeInTheDocument();
			expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).toHaveClass(
				'text-error-primary'
			);
			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		it('repaints the field decoration for an ERC-20 amount already over the token balance', () => {
			const { getByTestId, getByText, queryByTestId, container } = setup({
				token: mockValidErc20Token,
				amount: '5',
				nativeEthereumBalance: 10_000_000n,
				tokenBalance: 1n
			});

			expect(getByText(en.send.assertion.insufficient_funds_for_amount)).toBeInTheDocument();
			expect(container.querySelector(`[data-tid="${MAX_BUTTON}"]`)).toHaveClass(
				'text-error-primary'
			);
			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();

			// The token's own shortfall belongs on the field, never in the fee box.
			expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
		});
	});

	// The gas fee arrives asynchronously (a network round trip), so it can still be unresolved the
	// instant this step (re)mounts - e.g. right after "Back" from Review, with the amount already
	// filled in from before. Reading an unresolved fee as "no issue" let "Next" through before the
	// check it depends on had actually settled - this is the async check itself, not a race around it.
	describe('gating while the gas fee has not resolved yet', () => {
		const setup = ({ token, tokenBalance }: { token: Token; tokenBalance?: bigint }) => {
			const context = new Map<symbol, unknown>();
			context.set(SEND_CONTEXT_KEY, initSendContext({ token }));

			// The fee store is created but `setFee` is never called: the gas fee has not arrived yet.
			const feeStore = initEthFeeStore();
			context.set(
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
					feeExchangeRateStore: writable(undefined)
				})
			);

			balancesStore.set({ id: ETHEREUM_TOKEN.id, data: { data: ZERO, certified: true } });

			if (nonNullish(tokenBalance)) {
				balancesStore.set({ id: token.id, data: { data: tokenBalance, certified: true } });
			}

			return render(EthSendForm, {
				props: { ...props, amount: '1' },
				context
			});
		};

		it('keeps Next blocked for an ERC-20 amount while the fee is still pending', () => {
			const { getByTestId } = setup({ token: mockValidErc20Token, tokenBalance: 100_00000000n });

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		it('does not show the orange fee box while the fee is still pending', () => {
			const { queryByTestId } = setup({ token: mockValidErc20Token, tokenBalance: 100_00000000n });

			// Nothing is confirmed insufficient yet, so no decoration is painted - only "Next" blocks.
			expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
		});

		it('keeps Next blocked for a native amount while the fee is still pending', () => {
			const { getByTestId } = setup({ token: ETHEREUM_TOKEN });

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});
	});
});
