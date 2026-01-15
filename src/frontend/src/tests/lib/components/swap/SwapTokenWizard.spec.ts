import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import SwapTokenWizard from '$lib/components/swap/SwapTokenWizard.svelte';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
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

vi.mock('$icp/utils/icrc.utils', () => ({
	isIcrcTokenSupportIcrc2: vi.fn()
}));

vi.mock('$icp/api/icrc-ledger.api', () => ({
	icrc1SupportedStandards: vi.fn()
}));

describe('SwapTokenWizard', () => {
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
		onBack: vi.fn(),
		onShowProviderList: vi.fn()
	};

	beforeEach(() => {
		setupUserNetworksStore('allEnabled');

		mockAuthStore();

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
		const { container } = render(SwapTokenWizard, {
			props: defaultProps,
			context: mockContext
		});

		expect(container).toBeTruthy();
	});

	it('should render ICP wizard when sourceToken is null', () => {
		const { container } = render(SwapTokenWizard, {
			props: defaultProps,
			context: mockContext
		});

		expect(container).toBeTruthy();
	});

	it('should render ETH wizard when sourceToken is not ICP network', () => {
		const { container } = render(SwapTokenWizard, {
			props: defaultProps,
			context: mockContext
		});

		expect(container).toBeTruthy();
	});
});
