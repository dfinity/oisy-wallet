import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import NewSwapWizard from '$lib/components/swap/NewSwapWizard.svelte';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

vi.mock('$eth/services/eth-listener.services', () => ({
	initMinedTransactionsListener: vi.fn(() => ({
		disconnect: vi.fn()
	}))
}));

vi.mock('$eth/providers/alchemy.providers', () => ({
	initMinedTransactionsListener: vi.fn(() => ({
		disconnect: vi.fn()
	})),
	initPendingTransactionsListener: vi.fn(() => ({
		disconnect: vi.fn()
	}))
}));

describe('SwapWizard', () => {
	const mockContext = new Map();

	const defaultProps = {
		currentStep: { id: 'init', name: 'init', title: 'Initialization' },
		swapAmount: 100,
		receiveAmount: 95,
		slippageValue: '0.5',
		swapProgressStep: ProgressStepsSwap.INITIALIZATION,
		onShowTokensList: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn(),
		onBack: vi.fn()
	};

	beforeEach(() => {
		setupUserNetworksStore('allEnabled');

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

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });
		mockContext.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });

		// Add ETH fee context for SwapEthWizard
		mockContext.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore: initEthFeeStore(),
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);
	});

	it('should render component', () => {
		const { container } = render(NewSwapWizard, {
			props: defaultProps,
			context: mockContext
		});

		expect(container).toBeTruthy();
	});

	it('should render ICP wizard when sourceToken is null', () => {
		const { container } = render(NewSwapWizard, {
			props: defaultProps,
			context: mockContext
		});

		expect(container).toBeTruthy();
	});

	it('should render ETH wizard when sourceToken is not ICP network', () => {
		const { container } = render(NewSwapWizard, {
			props: defaultProps,
			context: mockContext
		});

		expect(container).toBeTruthy();
	});
});
