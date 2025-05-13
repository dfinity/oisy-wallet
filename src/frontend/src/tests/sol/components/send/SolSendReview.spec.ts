import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import SolSendReview from '$sol/components/send/SolSendReview.svelte';
import { SOL_FEE_CONTEXT_KEY, initFeeContext, initFeeStore } from '$sol/stores/sol-fee.store';
import en from '$tests/mocks/i18n.mock';
import { mockAtaAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('SolSendReview', () => {
	const mockContext = new Map([]);
	const props = {
		destination: mockAtaAddress,
		amount: 22_000,
		network: SOLANA_MAINNET_NETWORK
	};
	const toolbarSelector = 'div[data-tid="toolbar"]';
	const mockFeeStore = initFeeStore();
	const mockPrioritizationFeeStore = initFeeStore();
	const mockAtaFeeStore = initFeeStore();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();

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
				feeDecimalsStore: writable(SOLANA_TOKEN.decimals)
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
});
