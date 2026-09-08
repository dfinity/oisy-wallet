import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendAmount from '$eth/components/send/EthSendAmount.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { ZERO } from '$lib/constants/app.constants';
import { MAX_BUTTON, TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('EthSendAmount', () => {
	const gas = 21_000n;
	const maxFeePerGas = 100n;
	const maxPriorityFeePerGas = 2n;
	const baseFeePerGas = 20n;

	// What the chain demands the sender hold on top of the amount.
	const ceiling = maxFeePerGas * gas;
	// What the previous check demanded, which omits the base fee.
	const tipOnly = maxPriorityFeePerGas * gas;

	// Comfortably above the ceiling, so `balance - ceiling` stays positive: a negative amount is
	// rejected as invalid before this validation runs.
	const balance = 10_000_000n;

	// A native shortfall always reads as an amount problem - the gas is paid out of the same balance
	// the amount is drawn from, so lowering the amount is the user's only fix - which is why both
	// ways the ceiling check can fail report this one message.
	const expectedError = en.send.assertion.insufficient_funds_for_amount;

	const gasError = en.send.assertion.insufficient_funds_for_gas;

	const toEther = (value: bigint): string => {
		const padded = value.toString().padStart(ETHEREUM_TOKEN.decimals + 1, '0');

		return `${padded.slice(0, -ETHEREUM_TOKEN.decimals)}.${padded.slice(-ETHEREUM_TOKEN.decimals)}`;
	};

	const setup = ({
		ceilingKnown = true,
		feeResolved = true,
		token = ETHEREUM_TOKEN,
		nativeEthereumBalance = balance,
		tokenBalance,
		amount
	}: {
		ceilingKnown?: boolean;
		feeResolved?: boolean;
		token?: Token;
		// Balance of the native coin that pays the gas - defaults to a comfortable amount so
		// existing (native-send) tests keep exercising only the amount-vs-ceiling math.
		nativeEthereumBalance?: bigint;
		// Balance of `token` itself. Only meaningful for an ERC-20 `token`, whose balance lives at
		// a different store key than the native coin's.
		tokenBalance?: bigint;
		// Pre-filled amount, as a wizard step remounted after "Back" receives it - no input event
		// is ever fired for it.
		amount?: string;
	} = {}) => {
		const feeStore = initEthFeeStore();

		if (feeResolved) {
			feeStore.setFee({
				maxFeePerGas: ceilingKnown ? maxFeePerGas : null,
				maxPriorityFeePerGas,
				baseFeePerGas,
				gas
			});
		}

		const context = new Map<symbol, unknown>();
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
		context.set(SEND_CONTEXT_KEY, initSendContext({ token }));

		balancesStore.set({
			id: ETHEREUM_TOKEN.id,
			data: { data: nativeEthereumBalance, certified: true }
		});

		if (nonNullish(tokenBalance)) {
			balancesStore.set({ id: token.id, data: { data: tokenBalance, certified: true } });
		}

		const { container, queryByText } = render(EthSendAmount, {
			context,
			props: {
				amount,
				insufficientFunds: false,
				nativeEthereumToken: ETHEREUM_TOKEN,
				onTokensList: () => undefined
			}
		});

		const input: HTMLInputElement | null = container.querySelector(
			`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
		);

		assertNonNullish(input);

		const maxButton = () => container.querySelector(`[data-tid="${MAX_BUTTON}"]`);

		return { input, queryByText, maxButton, feeStore };
	};

	const setupWithoutCeiling = () => setup({ ceilingKnown: false });

	it('rejects an amount that leaves only the tip covered', async () => {
		const { input, queryByText } = setup();

		await fireEvent.input(input, { target: { value: toEther(balance - tipOnly) } });

		await waitFor(() => {
			expect(queryByText(expectedError)).toBeInTheDocument();
		});

		// Even here, where the amount by itself would fit and it is gas that tips the total over,
		// the shortfall is reported as an amount problem - never as the gas variant.
		expect(queryByText(gasError)).not.toBeInTheDocument();
	});

	it('still demands the tip when the ceiling is unknown', async () => {
		// `maxFeePerGas` can come back null, which leaves `maxGasFee` undefined. Falling through to
		// zero there would accept an amount that cannot even cover the tip, making the check weaker
		// than the one it replaced.
		const { input, queryByText } = setupWithoutCeiling();

		await fireEvent.input(input, { target: { value: toEther(balance - 1n) } });

		await waitFor(() => {
			expect(queryByText(expectedError)).toBeInTheDocument();
		});
	});

	it('reads as an amount problem when the amount alone exceeds the balance', async () => {
		// The amount itself - ignoring gas entirely - is already more than the balance can cover,
		// which reports the same message as the tip-only case above.
		const { input, queryByText } = setup();

		await fireEvent.input(input, { target: { value: toEther(balance + 1n) } });

		await waitFor(() => {
			expect(queryByText(expectedError)).toBeInTheDocument();
		});

		expect(queryByText(gasError)).not.toBeInTheDocument();
	});

	it('accepts an amount that leaves the ceiling covered', async () => {
		const { input, queryByText } = setup();

		// Start from a rejected amount so the message is on screen. Waiting for it to disappear only
		// proves anything if it was there to begin with.
		await fireEvent.input(input, { target: { value: toEther(balance - tipOnly) } });

		await waitFor(() => {
			expect(queryByText(expectedError)).toBeInTheDocument();
		});

		await fireEvent.input(input, { target: { value: toEther(balance - ceiling) } });

		await waitFor(() => {
			expect(queryByText(expectedError)).not.toBeInTheDocument();
		});
	});

	// A "Max" offered before the fee arrives would be the whole balance: `getMaxTransactionAmount`
	// treats a missing fee as zero, and nothing downstream re-checks it before the amount is
	// submitted. The button has to wait for a fee it can actually subtract.
	describe('the Max button', () => {
		it('is offered once the fee is known', () => {
			const { maxButton } = setup();

			expect(maxButton()).toBeInTheDocument();
		});

		it('is withheld while no fee has arrived yet', () => {
			const { maxButton } = setup({ feeResolved: false });

			expect(maxButton()).not.toBeInTheDocument();
		});

		it('is withheld when the ceiling comes back unknown', () => {
			const { maxButton } = setup({ ceilingKnown: false });

			expect(maxButton()).not.toBeInTheDocument();
		});

		it('is offered for an ERC-20 send, whose maximum is its own balance', () => {
			// The fee is settled in ETH, so an ERC-20 maximum does not wait on it.
			const { maxButton } = setup({ feeResolved: false, token: mockValidErc20Token });

			expect(maxButton()).toBeInTheDocument();
		});
	});

	// The ERC-20 fee is paid in a different token than the one in this field, so that shortfall
	// alone stays off the field - see `EthSendForm` for the dedicated fee box that reports it
	// instead. An amount exceeding the token's own balance is this field's own problem, though, and
	// decorates it exactly like a native shortfall does.
	describe('an ERC-20 shortfall', () => {
		const erc20Balance = 100_00000000n; // 100 tokens at the mock's 8 decimals

		it('decorates the field when the amount exceeds the token balance', async () => {
			const { input, queryByText, maxButton } = setup({
				token: mockValidErc20Token,
				tokenBalance: erc20Balance
			});

			await fireEvent.input(input, { target: { value: '150' } });

			await waitFor(() => {
				expect(queryByText(en.send.assertion.insufficient_funds_for_amount)).toBeInTheDocument();
			});

			expect(maxButton()).toHaveClass('text-error-primary');
		});

		it('blocks without decorating the field when the native coin can not cover the fee', async () => {
			const { input, queryByText, maxButton } = setup({
				token: mockValidErc20Token,
				tokenBalance: erc20Balance,
				nativeEthereumBalance: ZERO
			});

			await fireEvent.input(input, { target: { value: '1' } });

			await waitFor(() => {
				expect(
					queryByText(en.send.assertion.insufficient_ethereum_funds_to_cover_the_fees)
				).not.toBeInTheDocument();
			});

			expect(maxButton()).not.toHaveClass('text-error-primary');
		});
	});

	// The amount step is remounted every time the wizard leaves and returns to it (e.g. "Back" then
	// "Next" again), while the typed amount survives that remount. The field's decoration used to
	// come only from `TokenInput`'s debounced validation pass, which is triggered by a change of
	// amount or token and by nothing else: with the amount already in place, that single pass ran
	// while the gas fee was still in flight, resolved to "nothing settled yet", and was never re-run
	// once the fee landed - leaving the field with its normal border, no message and a blue "Max"
	// while "Next" was (correctly) blocked.
	describe('a step remounted with the amount already over the maximum', () => {
		it('decorates the field on mount, with no input event and no wait', () => {
			const { queryByText, maxButton } = setup({ amount: toEther(balance - tipOnly) });

			expect(queryByText(expectedError)).toBeInTheDocument();
			expect(maxButton()).toHaveClass('text-error-primary');
		});

		it('decorates the field once the gas fee lands after mount', async () => {
			const { queryByText, maxButton, feeStore } = setup({
				amount: toEther(balance - tipOnly),
				feeResolved: false
			});

			// A fee round trip outlasts `TokenInput`'s 300ms debounce by far, so wait past it: the one
			// validation pass a remount used to get had already come and gone - resolving to "nothing
			// settled yet" - by the time the fee below arrives.
			await new Promise((resolve) => setTimeout(resolve, 400));

			// Nothing is confirmed insufficient while the fee is in flight, so nothing is painted yet.
			expect(queryByText(expectedError)).not.toBeInTheDocument();

			feeStore.setFee({ maxFeePerGas, maxPriorityFeePerGas, baseFeePerGas, gas });

			await waitFor(() => {
				expect(queryByText(expectedError)).toBeInTheDocument();
			});

			expect(maxButton()).toHaveClass('text-error-primary');
		});

		it('decorates the field for an ERC-20 amount already over the token balance', () => {
			const { queryByText, maxButton } = setup({
				token: mockValidErc20Token,
				tokenBalance: 100_00000000n,
				amount: '150'
			});

			expect(queryByText(expectedError)).toBeInTheDocument();
			expect(maxButton()).toHaveClass('text-error-primary');
		});

		it('leaves an affordable amount undecorated', () => {
			const { queryByText, maxButton } = setup({ amount: toEther(balance - ceiling) });

			expect(queryByText(expectedError)).not.toBeInTheDocument();
			expect(maxButton()).not.toHaveClass('text-error-primary');
		});
	});
});
