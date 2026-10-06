import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	REVIEW_FORM_SEND_BUTTON,
	SEND_FIRST_TIME_DESTINATION_CONFIRM
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import SolSendReview from '$sol/components/send/SolSendReview.svelte';
import { SOL_FEE_CONTEXT_KEY, initFeeContext, initFeeStore } from '$sol/stores/sol-fee.store';
import en from '$tests/mocks/i18n.mock';
import { mockAtaAddress } from '$tests/mocks/sol.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('SolSendReview', () => {
	const mockContext = new Map([]);
	const props = {
		destination: mockAtaAddress,
		amount: 22_000,
		network: SOLANA_MAINNET_NETWORK,
		onBack: vi.fn(),
		onSend: vi.fn()
	};
	const toolbarSelector = 'div[data-tid="toolbar"]';
	const mockFeeStore = initFeeStore();
	const mockPrioritizationFeeStore = initFeeStore();
	const mockAtaFeeStore = initFeeStore();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();

		balancesStore.reset(SOLANA_TOKEN.id);

		mockContext.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				token: SOLANA_TOKEN
			})
		);

		mockFeeStore.setFee(123n);
		mockPrioritizationFeeStore.setFee(3n);
		mockAtaFeeStore.setFee(undefined);
		mockContext.set(
			SOL_FEE_CONTEXT_KEY,
			initFeeContext({
				feeStore: mockFeeStore,
				prioritizationFeeStore: mockPrioritizationFeeStore,
				ataFeeStore: mockAtaFeeStore,
				feeSymbolStore: writable(SOLANA_TOKEN.symbol),
				feeDecimalsStore: writable(SOLANA_TOKEN.decimals),
				feeTokenIdStore: writable(SOLANA_TOKEN.id),
				feeExchangeRateStore: writable(9.87)
			})
		);
	});

	it('should render all fields', () => {
		const { container, getByText } = render(SolSendReview, {
			props,
			context: mockContext
		});

		expect(container).toHaveTextContent(`${props.amount} ${SOLANA_TOKEN.symbol}`);

		expect(getByText(en.send.text.network)).toBeInTheDocument();

		expect(getByText(en.fee.text.fee)).toBeInTheDocument();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});

	it('should disable the next button and render insufficient funds for fee message', async () => {
		const insufficientFundsForFeeTestId = 'sol-send-form-insufficient-funds-for-fee';
		const buttonTestId = REVIEW_FORM_SEND_BUTTON;

		// Awaiting the assertions below exposed that they never held: the message renders only when
		// fee + ata fee exceed the balance of the fee token, and neither an ata fee nor a balance
		// was set.
		mockFeeStore.setFee(1000n);
		mockAtaFeeStore.setFee(1000n);
		balancesStore.set({ id: SOLANA_TOKEN.id, data: { data: 100n, certified: false } });

		const { getByTestId } = render(SolSendReview, {
			props: {
				...props
			},
			context: mockContext
		});

		await waitFor(() => {
			expect(getByTestId(insufficientFundsForFeeTestId)).toHaveTextContent(
				en.fee.assertion.insufficient_funds_for_fee
			);
			expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
		});
	});

	it('should not disable the next button and dont render insufficient funds if sufficient funds', async () => {
		const insufficientFundsForFeeTestId = 'sol-send-form-insufficient-funds-for-fee';
		const buttonTestId = REVIEW_FORM_SEND_BUTTON;

		mockFeeStore.setFee(ZERO);
		mockAtaFeeStore.setFee(ZERO);
		balancesStore.set({ id: SOLANA_TOKEN.id, data: { data: 100n, certified: false } });

		const { getByTestId, queryByTestId } = render(SolSendReview, {
			props: {
				...props
			},
			context: mockContext
		});

		// The destination was never sent to, so it gates the send button behind a confirmation of
		// its own, which would make the assertion below pass or fail for the wrong reason.
		await fireEvent.click(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));

		await waitFor(() => {
			expect(queryByTestId(insufficientFundsForFeeTestId)).not.toBeInTheDocument();
			expect(getByTestId(buttonTestId)).not.toHaveAttribute('disabled');
		});
	});
});
