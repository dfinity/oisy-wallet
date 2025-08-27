import SwapIcpWizard from '$icp/components/swap/SwapIcpWizard.svelte';
import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import type { IcToken } from '$icp/types/ic-token';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

const mockToken = { ...mockValidIcToken, enabled: true } as IcToken;
const mockDestToken = { ...mockValidIcCkToken, enabled: true } as IcToken;

const BASE_PROPS = {
	swapAmount: '1',
	receiveAmount: 2,
	slippageValue: '0.5',
	swapProgressStep: ProgressStepsSwap.INITIALIZATION,
	swapFailedProgressSteps: []
};

describe('SwapIcpWizard', () => {
	let mockContext: Map<symbol, unknown>;

	const createContext = (): Map<symbol, unknown> => {
		const swapContext = {
			sourceToken: readable(mockToken),
			destinationToken: readable(mockDestToken),
			isSourceTokenIcrc2: readable(true),
			failedSwapError: writable(undefined),
			sourceTokenExchangeRate: readable(10)
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

		expect(getByText('You pay')).toBeInTheDocument();
		expect(getByText('You receive')).toBeInTheDocument();
		expect(getByText('Review swap')).toBeInTheDocument();
		expect(getByText('Cancel')).toBeInTheDocument();
	});

	it('renders slippage section', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText('Max slippage')).toBeInTheDocument();
	});

	it('renders swap provider information', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText('Swap provider')).toBeInTheDocument();
	});

	it('renders fee information', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText('Total estimated fee')).toBeInTheDocument();
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

	it('renders SwapProgress on SWAPPING step', () => {
		const { container } = renderWithStep(WizardStepsSwap.SWAPPING);

		expect(container).toBeInTheDocument();
	});
});
