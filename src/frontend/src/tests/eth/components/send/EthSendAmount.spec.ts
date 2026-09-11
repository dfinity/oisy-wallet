import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendAmount from '$eth/components/send/EthSendAmount.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
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

	const expectedError = en.send.assertion.insufficient_funds_for_gas;

	const toEther = (value: bigint): string => {
		const padded = value.toString().padStart(ETHEREUM_TOKEN.decimals + 1, '0');

		return `${padded.slice(0, -ETHEREUM_TOKEN.decimals)}.${padded.slice(-ETHEREUM_TOKEN.decimals)}`;
	};

	const setup = ({ ceilingKnown = true }: { ceilingKnown?: boolean } = {}) => {
		const feeStore = initEthFeeStore();
		feeStore.setFee({
			maxFeePerGas: ceilingKnown ? maxFeePerGas : null,
			maxPriorityFeePerGas,
			baseFeePerGas,
			gas
		});

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
		context.set(SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN }));

		balancesStore.set({ id: ETHEREUM_TOKEN.id, data: { data: balance, certified: true } });

		const { container, queryByText } = render(EthSendAmount, {
			context,
			props: {
				amount: undefined,
				insufficientFunds: false,
				nativeEthereumToken: ETHEREUM_TOKEN,
				onTokensList: () => undefined
			}
		});

		const input: HTMLInputElement | null = container.querySelector(
			`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
		);

		assertNonNullish(input);

		return { input, queryByText };
	};

	const setupWithoutCeiling = () => setup({ ceilingKnown: false });

	it('rejects an amount that leaves only the tip covered', async () => {
		const { input, queryByText } = setup();

		await fireEvent.input(input, { target: { value: toEther(balance - tipOnly) } });

		await waitFor(() => {
			expect(queryByText(expectedError)).toBeInTheDocument();
		});
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
});
