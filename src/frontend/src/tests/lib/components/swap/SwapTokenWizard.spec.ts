import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import SwapTokenWizard from '$lib/components/swap/SwapTokenWizard.svelte';
import * as addressDerived from '$lib/derived/address.derived';
import * as authStore from '$lib/derived/auth.derived';
import * as tokensStore from '$lib/derived/tokens.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import * as swapService from '$lib/services/swap.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
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

vi.mock('$icp/services/icrc.services', () => ({
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

	it('should render Solana wizard when sourceToken is Solana network', () => {
		const solToken = { ...mockValidSplToken, enabled: true };

		const solContext = initSwapContext({
			sourceToken: solToken,
			destinationToken: solToken
		});

		const solMockContext = new Map(mockContext);
		solMockContext.set(SWAP_CONTEXT_KEY, {
			...solContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2)
		});

		const { container } = render(SwapTokenWizard, {
			props: defaultProps,
			context: solMockContext
		});

		expect(container).toBeTruthy();
	});

	describe('pause during review step', () => {
		const erc20Token = { ...mockValidErc20Token, enabled: true };

		let fetchMock: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.useFakeTimers();

			vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
			vi.spyOn(tokensStore, 'tokens', 'get').mockImplementation(() => readable([erc20Token]));
			vi.spyOn(addressDerived, 'ethAddress', 'get').mockImplementation(() => readable('0x123'));
			vi.spyOn(addressDerived, 'solAddressMainnet', 'get').mockImplementation(() =>
				readable(undefined)
			);

			fetchMock = vi.spyOn(swapService, 'fetchSwapAmounts').mockResolvedValue([]);

			const erc20Context = new Map(mockContext);
			erc20Context.set(SWAP_CONTEXT_KEY, {
				sourceToken: readable(erc20Token),
				destinationToken: readable(erc20Token),
				sourceTokenExchangeRate: readable(10),
				destinationTokenExchangeRate: readable(2),
				isSourceTokenIcrc2: readable(undefined),
				failedSwapError: writable(undefined),
				sourceTokenBalance: readable(undefined),
				destinationTokenBalance: readable(undefined),
				isSourceTokenPermitSupported: readable(undefined),
				setSourceToken: vi.fn(),
				setDestinationToken: vi.fn(),
				setIsTokenPermitSupported: vi.fn(),
				setIsTokensIcrc2: vi.fn(),
				switchTokens: vi.fn()
			});
			mockContext.set(SWAP_CONTEXT_KEY, erc20Context.get(SWAP_CONTEXT_KEY));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should not trigger periodic refresh during REVIEW step', async () => {
			render(SwapTokenWizard, {
				props: {
					...defaultProps,
					currentStep: {
						name: WizardStepsSwap.REVIEW,
						title: 'Review'
					}
				},
				context: mockContext
			});

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			fetchMock.mockClear();

			await vi.advanceTimersByTimeAsync(10_000);
			await tick();

			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('should trigger periodic refresh during SWAP step', async () => {
			render(SwapTokenWizard, {
				props: {
					...defaultProps,
					currentStep: {
						name: WizardStepsSwap.SWAP,
						title: 'Swap'
					}
				},
				context: mockContext
			});

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			fetchMock.mockClear();

			await vi.advanceTimersByTimeAsync(5_100);
			await tick();

			expect(fetchMock).toHaveBeenCalled();
		});
	});
});
