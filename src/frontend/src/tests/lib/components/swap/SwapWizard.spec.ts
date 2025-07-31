import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import type { IcToken } from '$icp/types/ic-token';
import SwapWizard from '$lib/components/swap/SwapWizard.svelte';
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

describe('SwapWizard', () => {
	let mockContext: Map<symbol, unknown>;

	const createContext = (): Map<symbol, unknown> => {
		const swapContext = {
			sourceToken: readable(mockToken),
			destinationToken: readable(mockDestToken),
			isSourceTokenIcrc2: readable(true),
			failedSwapError: writable(undefined)
		};

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: [],
			amountForSwap: '1',
			selectedProvider: mockSwapProviders[1]
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
		render(SwapWizard, {
			props: {
				...BASE_PROPS,
				currentStep: { name: step, title: 'Swap' }
			},
			context: mockContext
		});

	it('renders SwapForm on SWAP step', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText(/review/i)).toBeInTheDocument();
	});

	it('renders SwapReview on REVIEW step', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.REVIEW);

		expect(getByText(/swap provider/i)).toBeInTheDocument();
	});

	it('renders SwapProgress on SWAPPING step', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAPPING);

		expect(getByText(/swapping/i)).toBeInTheDocument();
	});
});
