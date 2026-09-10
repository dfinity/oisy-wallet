import { SEND_TRANSACTION_PRIORITY_ENABLED } from '$env/send-transaction-priority.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendReview from '$eth/components/send/EthSendReview.svelte';
import { ETH_FEE_REVIEW_EXPIRY_DELAY } from '$eth/constants/eth.constants';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import {
	REVIEW_FORM_FEE_EXPIRED,
	REVIEW_FORM_SEND_BUTTON
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('EthSendReview', () => {
	const mockContext = () => {
		const context = new Map([]);
		context.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				token: ETHEREUM_TOKEN
			})
		);

		const feeStore = initEthFeeStore();
		// Without a fee the send button is disabled anyway, which would make the expiry assertions
		// pass for the wrong reason.
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
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);

		return context;
	};

	const props = {
		destination: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		amount: '22000000',
		onBack: vi.fn(),
		onSend: vi.fn()
	};

	const toolbarSelector = 'div[data-tid="toolbar"]';

	it('should render all fields', () => {
		const { container, getByText } = render(EthSendReview, {
			props,
			context: mockContext()
		});

		expect(container).toHaveTextContent(`${props.amount} ${ETHEREUM_TOKEN.symbol}`);

		expect(getByText(en.send.text.network)).toBeInTheDocument();

		expect(getByText(props.destination)).toBeInTheDocument();

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

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});

	describe('fee expiry', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			// The expiry timeout outlives the test that scheduled it unless it is dropped here, and
			// switching back to real timers would strand it rather than cancel it, leaving the suite
			// order-dependent.
			vi.clearAllTimers();
			vi.useRealTimers();
		});

		it('leaves the send available while the fee is still fresh', async () => {
			const { getByTestId, queryByTestId } = render(EthSendReview, {
				props,
				context: mockContext()
			});

			await vi.advanceTimersByTimeAsync(ETH_FEE_REVIEW_EXPIRY_DELAY - 1_000);

			expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).not.toBeDisabled();
			expect(queryByTestId(REVIEW_FORM_FEE_EXPIRED)).toBeNull();
		});

		it('blocks the send and explains why once the fee has expired', async () => {
			const { getByTestId } = render(EthSendReview, {
				props,
				context: mockContext()
			});

			await vi.advanceTimersByTimeAsync(ETH_FEE_REVIEW_EXPIRY_DELAY);

			expect(getByTestId(REVIEW_FORM_SEND_BUTTON)).toBeDisabled();
			expect(getByTestId(REVIEW_FORM_FEE_EXPIRED)).toHaveTextContent(en.send.info.fee_expired);
		});
	});
});
