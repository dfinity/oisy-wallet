import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendAmount from '$eth/components/send/EthSendAmount.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('EthSendAmount', () => {
	const gas = 21_000n;
	const baseFeePerGas = 20n;
	const maxPriorityFeePerGas = 2n;
	const maxFeePerGas = 100n;

	// What the chain demands the sender hold: amount + maxFeePerGas * gas.
	const ceiling = maxFeePerGas * gas;
	// What the old check demanded, which omits the base fee entirely.
	const tipOnly = maxPriorityFeePerGas * gas;

	const balance = 1_000_000n;

	const setup = () => {
		const feeStore = initEthFeeStore();
		feeStore.setFee({ maxFeePerGas, maxPriorityFeePerGas, baseFeePerGas, gas });

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

		return { context };
	};

	const enter = async (value: bigint) => {
		const { context } = setup();

		const { container } = render(EthSendAmount, {
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

		expect(input).not.toBeNull();

		await fireEvent.input(input as HTMLInputElement, {
			target: { value: formatWei(value) }
		});

		return { container };
	};

	const formatWei = (value: bigint): string => {
		const asString = value.toString().padStart(ETHEREUM_TOKEN.decimals + 1, '0');
		const whole = asString.slice(0, -ETHEREUM_TOKEN.decimals);
		const fraction = asString.slice(-ETHEREUM_TOKEN.decimals);

		return `${whole}.${fraction}`;
	};

	it('rejects an amount that leaves less than the authorised ceiling', async () => {
		// Affordable under the old tip-only rule, unaffordable to the chain: the send would pass
		// validation and then fail to cover its own base fee.
		const { container } = await enter(balance - tipOnly);

		await waitFor(() => {
			expect(container).toHaveTextContent('Insufficient');
		});
	});

	it('accepts an amount that leaves the ceiling covered', async () => {
		const { container } = await enter(balance - ceiling);

		await waitFor(() => {
			expect(container).not.toHaveTextContent('Insufficient');
		});
	});
});
