import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import SwapModalWizardSteps from '$lib/components/swap/SwapModalWizardSteps.svelte';
import {
	MODAL_FILTER_NETWORKS,
	MODAL_TOKENS_LIST,
	SWAP_MODAL_SELECT_PROVIDER_STEP,
	SWAP_SWITCH_TOKENS_BUTTON
} from '$lib/constants/test-ids.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import {
	MODAL_NETWORKS_LIST_CONTEXT_KEY,
	initModalNetworksListContext
} from '$lib/stores/modal-networks-list.store';
import {
	MODAL_TOKENS_LIST_CONTEXT_KEY,
	initModalTokensListContext
} from '$lib/stores/modal-tokens-list.store';
import {
	SWAP_AMOUNTS_CONTEXT_KEY,
	initSwapAmountsStore,
	type SwapAmountsStoreData
} from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import type { WizardModal, WizardStep } from '@dfinity/gix-components';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$icp/api/icrc-ledger.api', () => ({
	icrc1SupportedStandards: () => Promise.resolve([])
}));

describe('SwapModalWizardSteps', () => {
	const mockContext = new Map();

	const mockSwapAmounts: SwapAmountsStoreData = {
		amountForSwap: 1,
		swaps: mockSwapProviders,
		selectedProvider: mockSwapProviders[0]
	};

	const mockModal = {
		set: vi.fn()
	};

	beforeEach(() => {
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
	});

	const setupSwapAmountsStore = (swapAmounts?: SwapAmountsStoreData) => {
		const swapAmountsStore = initSwapAmountsStore();
		if (swapAmounts) {
			swapAmountsStore.setSwaps(swapAmounts);
		}
		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });
		return swapAmountsStore;
	};

	const setupIcTokenFeeStore = () => {
		icTokenFeeStore.setIcTokenFee({
			tokenSymbol: mockValidIcToken.symbol,
			fee: 1000n
		});
		mockContext.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
	};

	const setupModalTokensListContext = () => {
		mockContext.set(MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] }));
	};

	const setupModalNetworksListContext = () => {
		mockContext.set(
			MODAL_NETWORKS_LIST_CONTEXT_KEY,
			initModalNetworksListContext({ networks: [] })
		);
	};

	describe('display values', () => {
		beforeEach(() => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();
			setupModalTokensListContext();
			setupModalNetworksListContext();
		});

		const renderSwapModalWizardSteps = (currentStep: WizardStep<WizardStepsSwap>) =>
			render(SwapModalWizardSteps, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					onClose: vi.fn(),
					currentStep,
					showSelectProviderModal: false,
					swapProgressStep: ProgressStepsSwap.INITIALIZATION,
					allNetworksEnabled: true,
					modal: mockModal as unknown as WizardModal<WizardStepsSwap>,
					steps: [
						{
							name: WizardStepsSwap.SWAP,
							title: en.swap.text.swap
						},
						{
							name: WizardStepsSwap.REVIEW,
							title: en.swap.text.review
						},
						{
							name: WizardStepsSwap.SWAPPING,
							title: en.swap.text.executing_transaction
						},
						{
							name: WizardStepsSwap.TOKENS_LIST,
							title: en.send.text.select_token
						},
						{
							name: WizardStepsSwap.FILTER_NETWORKS,
							title: en.send.text.select_network_filter
						},
						{
							name: WizardStepsSwap.SELECT_PROVIDER,
							title: en.swap.text.select_swap_provider
						}
					]
				},
				context: mockContext
			});

		it('should display TOKENS_LIST step', () => {
			const { getByTestId } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.TOKENS_LIST,
				title: 'title'
			});

			expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
		});

		it('should display FILTER_NETWORKS step', () => {
			const { getByTestId } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.FILTER_NETWORKS,
				title: 'title'
			});

			expect(getByTestId(MODAL_FILTER_NETWORKS)).toBeInTheDocument();
		});

		it('should display SELECT_PROVIDER step', () => {
			const { getByTestId } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.SELECT_PROVIDER,
				title: 'title'
			});

			expect(getByTestId(SWAP_MODAL_SELECT_PROVIDER_STEP)).toBeInTheDocument();
		});

		it('should display SWAP step', () => {
			const { getByTestId } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.SWAP,
				title: 'title'
			});

			expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();
		});

		it('should display REVIEW step', () => {
			const { getByText } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.REVIEW,
				title: 'title'
			});

			expect(getByText(en.swap.text.swap_button)).toBeInTheDocument();
		});

		it('should display SWAPPING step', () => {
			const { getByText } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.SWAPPING,
				title: 'title'
			});

			expect(getByText(en.swap.text.initializing)).toBeInTheDocument();
		});
	});
});
