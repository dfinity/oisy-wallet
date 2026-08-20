import SwapIcpWizard from '$icp/components/swap/SwapIcpWizard.svelte';
import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import type { IcToken } from '$icp/types/ic-token';
import {
	TRACK_COUNT_SWAP_SUBMITTED,
	TRACK_COUNT_SWAP_SUCCESS
} from '$lib/constants/analytics.constants';
import * as addrDerived from '$lib/derived/address.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import * as toasts from '$lib/stores/toasts.store';
import { SwapProvider, type ChainFusionSwapDetails } from '$lib/types/swap';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import {
	mockChainFusionProvider,
	mockOneSecProvider,
	mockSwapProviders
} from '$tests/mocks/swap.mocks';
import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

vi.mock('$icp/services/icrc.services', () => ({
	isIcrcTokenSupportIcrc2: vi.fn()
}));

vi.mock('$icp/api/icrc-ledger.api', () => ({
	icrc1SupportedStandards: vi.fn()
}));

const mockSwapFn = vi.fn();
const mockOneSecFn = vi.fn();
const mockChainFusionFn = vi.fn();

vi.mock('$lib/services/swap.services', () => ({
	fetchOneSecIcpToEvmSwap: (...args: unknown[]) => mockOneSecFn(...args),
	enableSwapDestinationToken: vi.fn(),
	swapService: {
		icpSwap: (...args: unknown[]) => mockSwapFn(...args)
	}
}));

vi.mock('$lib/services/chain-fusion-swap.services', () => ({
	fetchChainFusionIcpSwap: (...args: unknown[]) => mockChainFusionFn(...args)
}));

const mockToken = { ...mockValidIcToken, enabled: true } as IcToken;
const mockDestToken = { ...mockValidIcCkToken, enabled: true } as IcToken;

const BASE_PROPS = {
	swapAmount: '1',
	receiveAmount: 2,
	slippageValue: '0.5',
	swapProgressStep: ProgressStepsSwap.INITIALIZATION,
	swapFailedProgressSteps: [],
	isSwapAmountsLoading: false,
	onShowTokensList: vi.fn(),
	onShowProviderList: vi.fn(),
	onClose: vi.fn(),
	onNext: vi.fn(),
	onBack: vi.fn()
};

describe('SwapIcpWizard', () => {
	let mockContext: Map<symbol, unknown>;

	const createContext = (): Map<symbol, unknown> => {
		const swapContext = {
			sourceToken: readable(mockToken),
			destinationToken: readable(mockDestToken),
			isSourceTokenIcrc2: readable(true),
			failedSwapError: writable(undefined),
			sourceTokenExchangeRate: readable(10),
			setIsTokensIcrc2: vi.fn()
		};

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: mockSwapProviders,
			amountForSwap: 1,
			selectedProvider: mockSwapProviders[0]
		});

		const feeStore = {
			reset: vi.fn(),
			subscribe: readable({
				[mockToken.symbol]: 1000n
			}).subscribe
		};

		return new Map<symbol, unknown>([
			[SWAP_CONTEXT_KEY, swapContext],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore }],
			[IC_TOKEN_FEE_CONTEXT_KEY, { store: feeStore }]
		]);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockContext = createContext();
		mockAuthStore();
	});

	const renderWithStep = (step: WizardStepsSwap) =>
		render(SwapIcpWizard, {
			props: {
				...BASE_PROPS,
				currentStep: { name: step, title: 'Swap' }
			},
			context: mockContext
		});

	it('renders SwapIcpForm on SWAP step', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText(en.tokens.text.source_token_title)).toBeInTheDocument();
		expect(getByText(en.tokens.text.destination_token_title)).toBeInTheDocument();
		expect(getByText(en.swap.text.review_button)).toBeInTheDocument();
		expect(getByText(en.core.text.cancel)).toBeInTheDocument();
	});

	it('renders slippage section', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText(en.swap.text.max_slippage)).toBeInTheDocument();
	});

	it('renders swap provider information', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText(en.swap.text.swap_provider)).toBeInTheDocument();
	});

	it('renders fee information', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText(en.swap.text.total_fee)).toBeInTheDocument();
	});

	it('renders token input fields', () => {
		const { container } = renderWithStep(WizardStepsSwap.SWAP);

		const tokenInputs = container.querySelectorAll('input[data-tid="token-input-currency-token"]');

		expect(tokenInputs).toHaveLength(2);
	});

	it('renders switch tokens button', () => {
		const { container } = renderWithStep(WizardStepsSwap.SWAP);

		const switchButton = container.querySelector('[data-tid="swap-switch-tokens-button"]');

		expect(switchButton).toBeInTheDocument();
	});

	it('renders SwapReview on REVIEW step', () => {
		const { container } = renderWithStep(WizardStepsSwap.REVIEW);

		expect(container).toBeInTheDocument();
	});

	it('renders tiny review amounts in decimal format', () => {
		const { getByText, queryByText } = render(SwapIcpWizard, {
			props: {
				...BASE_PROPS,
				receiveAmount: 2.6e-7,
				currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' }
			},
			context: mockContext
		});

		expect(getByText(/0\.00000026/)).toBeInTheDocument();
		expect(queryByText(/2\.6e-7/i)).not.toBeInTheDocument();
	});

	it('renders SwapProgress on SWAPPING step', () => {
		const { container } = renderWithStep(WizardStepsSwap.SWAPPING);

		expect(container).toBeInTheDocument();
	});

	describe('swap execution', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			mockSwapFn.mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('calls onClose after successful swap', async () => {
			const { getByRole, getByText, queryByRole } = renderWithStep(WizardStepsSwap.REVIEW);

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(getByRole('checkbox'));
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(mockSwapFn).toHaveBeenCalledOnce();
			expect(BASE_PROPS.onClose).toHaveBeenCalledOnce();
			expect(BASE_PROPS.onBack).not.toHaveBeenCalled();
		});

		it('calls onBack when swap fails', async () => {
			mockSwapFn.mockRejectedValue(new Error('Swap failed'));

			const { getByRole, getByText, queryByRole } = renderWithStep(WizardStepsSwap.REVIEW);

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(getByRole('checkbox'));
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(BASE_PROPS.onBack).toHaveBeenCalledOnce();
			expect(BASE_PROPS.onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalled();
		});

		it('requires confirmation before enabling swap for high negative value difference', async () => {
			const errorContext = createContext();
			errorContext.set(SWAP_CONTEXT_KEY, {
				...(errorContext.get(SWAP_CONTEXT_KEY) as object),
				destinationTokenExchangeRate: readable(20)
			});

			const { getByRole, getByText } = render(SwapIcpWizard, {
				props: {
					...BASE_PROPS,
					receiveAmount: 0.1,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' }
				},
				context: errorContext
			});

			const swapButton = getByText(en.swap.text.swap_button).closest('button');

			expect(swapButton).toBeDisabled();

			await fireEvent.click(getByRole('checkbox'));

			expect(swapButton).toBeEnabled();
		});

		describe('OneSec ICP→EVM swap', () => {
			const setOneSecContext = ({
				destinationToken = mockValidErc20Token
			}: { destinationToken?: object } = {}) => {
				mockContext.set(SWAP_CONTEXT_KEY, {
					...(mockContext.get(SWAP_CONTEXT_KEY) as object),
					destinationToken: readable(destinationToken)
				});

				const oneSecAmountsStore = initSwapAmountsStore();
				oneSecAmountsStore.setSwaps({
					swaps: [mockOneSecProvider],
					amountForSwap: 1,
					selectedProvider: mockOneSecProvider
				});
				mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: oneSecAmountsStore });
			};

			beforeEach(() => {
				mockOneSecFn.mockResolvedValue(undefined);
				vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));
				setOneSecContext();
			});

			it('calls fetchOneSecIcpToEvmSwap and then onClose on success', async () => {
				const { getByText, queryByRole } = renderWithStep(WizardStepsSwap.REVIEW);

				const valueDifferenceCheckbox = queryByRole('checkbox');
				if (valueDifferenceCheckbox) {
					await fireEvent.click(valueDifferenceCheckbox);
				}

				await fireEvent.click(getByText(en.swap.text.swap_button));
				await vi.runOnlyPendingTimersAsync();

				expect(mockOneSecFn).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						sourceToken: mockToken,
						destinationToken: mockValidErc20Token,
						swapAmount: BASE_PROPS.swapAmount,
						userEthAddress: mockEthAddress
					})
				);
				expect(BASE_PROPS.onClose).toHaveBeenCalledOnce();
				expect(BASE_PROPS.onBack).not.toHaveBeenCalled();
			});

			it('calls onBack and shows error toast when swap throws', async () => {
				mockOneSecFn.mockRejectedValue(new Error('Bridge error'));

				const { getByText, queryByRole } = renderWithStep(WizardStepsSwap.REVIEW);

				const valueDifferenceCheckbox = queryByRole('checkbox');
				if (valueDifferenceCheckbox) {
					await fireEvent.click(valueDifferenceCheckbox);
				}

				await fireEvent.click(getByText(en.swap.text.swap_button));
				await vi.runOnlyPendingTimersAsync();

				expect(BASE_PROPS.onBack).toHaveBeenCalledOnce();
				expect(BASE_PROPS.onClose).not.toHaveBeenCalled();
				expect(toasts.toastsError).toHaveBeenCalled();
			});

			it('shows error toast and calls onBack when destination is not ERC20', async () => {
				setOneSecContext({ destinationToken: mockValidIcCkToken });

				const { getByText, queryByRole } = renderWithStep(WizardStepsSwap.REVIEW);

				const valueDifferenceCheckbox = queryByRole('checkbox');
				if (valueDifferenceCheckbox) {
					await fireEvent.click(valueDifferenceCheckbox);
				}

				await fireEvent.click(getByText(en.swap.text.swap_button));
				await vi.runOnlyPendingTimersAsync();

				expect(mockOneSecFn).not.toHaveBeenCalled();
				expect(toasts.toastsError).toHaveBeenCalled();
				expect(BASE_PROPS.onBack).toHaveBeenCalledOnce();
			});

			it('shows error toast and calls onBack when ethAddress is nullish', async () => {
				vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(undefined));

				const { getByText, queryByRole } = renderWithStep(WizardStepsSwap.REVIEW);

				const valueDifferenceCheckbox = queryByRole('checkbox');
				if (valueDifferenceCheckbox) {
					await fireEvent.click(valueDifferenceCheckbox);
				}

				await fireEvent.click(getByText(en.swap.text.swap_button));
				await vi.runOnlyPendingTimersAsync();

				expect(mockOneSecFn).not.toHaveBeenCalled();
				expect(toasts.toastsError).toHaveBeenCalled();
				expect(BASE_PROPS.onBack).toHaveBeenCalledOnce();
			});
		});

		describe('Chain Fusion ICP→Ethereum withdrawal', () => {
			const ckEthFeeToken = {
				...mockValidIcCkToken,
				symbol: 'ckETH',
				decimals: 18,
				ledgerCanisterId: 'ss2fx-dyaaa-aaaar-qacoq-cai'
			};

			// A ckERC20 source names the ckETH ledger as its fee ledger — the field
			// `convertCkErc20ToErc20` approves on, and the one the wizard now picks the
			// external fees to approve by.
			const ckErc20SourceToken = {
				...mockToken,
				feeLedgerCanisterId: ckEthFeeToken.ledgerCanisterId
			};

			const setChainFusionContext = (swapDetails?: ChainFusionSwapDetails) => {
				mockContext.set(SWAP_CONTEXT_KEY, {
					...(mockContext.get(SWAP_CONTEXT_KEY) as object),
					sourceToken: readable(ckErc20SourceToken),
					destinationToken: readable(mockValidErc20Token)
				});

				const provider = mockChainFusionProvider(swapDetails);
				const chainFusionAmountsStore = initSwapAmountsStore();
				chainFusionAmountsStore.setSwaps({
					swaps: [provider],
					amountForSwap: 1,
					selectedProvider: provider
				});
				mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: chainFusionAmountsStore });
			};

			const submit = async () => {
				const { getByText, queryByRole } = renderWithStep(WizardStepsSwap.REVIEW);

				const valueDifferenceCheckbox = queryByRole('checkbox');
				if (valueDifferenceCheckbox) {
					await fireEvent.click(valueDifferenceCheckbox);
				}

				await fireEvent.click(getByText(en.swap.text.swap_button));
				await vi.runOnlyPendingTimersAsync();
			};

			beforeEach(() => {
				mockChainFusionFn.mockResolvedValue(undefined);
				vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));
			});

			// No ckETH fee allowance is passed on purpose: `fetchChainFusionIcpSwap` resolves
			// it itself, freshly, at execution time — a quote-time figure goes stale while the
			// user sits on Review, and the minter rejects a stale allowance with
			// `InsufficientAllowance`.
			it('dispatches the withdrawal to the user own Ethereum address', async () => {
				setChainFusionContext({ sourceFees: [], externalFees: [] });

				await submit();

				expect(mockChainFusionFn).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						destinationAddress: mockEthAddress,
						sourceToken: ckErc20SourceToken
					})
				);
			});

			// The id the active user transaction is created under, so the row and the
			// `swap_submitted` event describe the same conversion.
			it('passes a swap id and the USD value the row is snapshotted with', async () => {
				setChainFusionContext({ sourceFees: [], externalFees: [] });

				await submit();

				expect(mockChainFusionFn).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ swapId: expect.any(String) })
				);

				expect(mockChainFusionFn.mock.lastCall?.[0].swapId).not.toBe('');
			});

			// The foreground ends when the funds leave the wallet; the minter settles
			// afterwards, and the AUT row is what reports success or failure.
			it('reports the conversion as submitted rather than succeeded', async () => {
				const trackEventSpy = vi.spyOn(analytics, 'trackEvent');

				setChainFusionContext({ sourceFees: [], externalFees: [] });

				await submit();

				expect(trackEventSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						name: TRACK_COUNT_SWAP_SUBMITTED,
						metadata: expect.objectContaining({ dApp: SwapProvider.CHAIN_FUSION })
					})
				);

				expect(trackEventSpy).not.toHaveBeenCalledWith(
					expect.objectContaining({ name: TRACK_COUNT_SWAP_SUCCESS })
				);
			});
		});
	});
});
