import { render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';

import SwapWizard from '$lib/components/swap/SwapWizard.svelte';

import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import { initSwapAmountsStore, SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';

import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';

const mockToken = { ...mockValidIcToken, enabled: true } as IcToken;
const mockDestToken = { ...mockValidIcCkToken, enabled: true } as IcToken;

const MOCK_PROVIDER = {
	provider: SwapProvider.KONG_SWAP,
	receiveAmount: 2000000000n,
	slippage: 0.5,
	route: ['TokenA', 'TokenB'],
	liquidityFees: [
		{
			fee: 3000n,
			token: { symbol: 'ICP', decimals: 8 } as IcToken
		}
	],
	networkFee: {
		fee: 3000n,
		token: { symbol: 'ckBtc', decimals: 8 } as IcToken
	},
	swapDetails: {} as SwapAmountsReply
} as SwapMappedResult;

const BASE_PROPS = {
	swapAmount: '1',
	receiveAmount: 2,
	slippageValue: '0.5',
	swapProgressStep: ProgressStepsSwap.INITIALIZATION
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
			selectedProvider: MOCK_PROVIDER
		});

		const feeStore = readable({
			[mockToken.symbol]: 1000n
		});

		return new Map<symbol, unknown>([
			[SWAP_CONTEXT_KEY, swapContext],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore }],
			[IC_TOKEN_FEE_CONTEXT_KEY, { store: feeStore }]
		]);
	};

	beforeEach(() => {
		mockContext = createContext();
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
