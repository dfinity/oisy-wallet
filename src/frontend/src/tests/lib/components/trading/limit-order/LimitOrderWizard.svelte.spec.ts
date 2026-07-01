import LimitOrderWizard from '$lib/components/trading/limit-order/LimitOrderWizard.svelte';
import { limitOrderWizardSteps } from '$lib/config/limit-order.config';
import { ProgressStepsLimitOrder } from '$lib/enums/progress-steps';
import { WizardStepsLimitOrder } from '$lib/enums/wizard-steps';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

const { mockLoadOrderBook, mockPlaceLimitOrder, mockPairs, mockFreeBalance, mockIcTokenBySymbol } =
	vi.hoisted(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { writable } = require('svelte/store');
		return {
			mockLoadOrderBook: vi.fn(() => Promise.resolve(undefined)),
			mockPlaceLimitOrder: vi.fn(() => Promise.resolve(undefined)),
			mockPairs: writable([]),
			mockFreeBalance: writable({}),
			mockIcTokenBySymbol: writable({})
		};
	});

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOrderBook: mockLoadOrderBook,
	placeLimitOrder: mockPlaceLimitOrder
}));

vi.mock('$lib/derived/oisy-trade.derived', () => ({
	oisyTradePairs: mockPairs,
	oisyTradeFreeBalanceBySymbol: mockFreeBalance,
	oisyTradeIcTokenBySymbol: mockIcTokenBySymbol
}));

describe('LimitOrderWizard', () => {
	const steps = limitOrderWizardSteps({ i18n: en });

	// Resolve a wizard step by name, failing loudly if the config no longer
	// defines it (rather than silently rendering the default step).
	const stepByName = (name: WizardStepsLimitOrder) => {
		const step = steps.find((s) => s.name === name);

		expect(step).toBeDefined();

		return step;
	};

	const modal = {
		back: vi.fn(),
		next: vi.fn(),
		set: vi.fn(),
		goToStep: vi.fn()
	} as unknown as never;

	const baseProps = {
		steps,
		modal,
		progressStep: ProgressStepsLimitOrder.INITIALIZATION,
		onBack: () => {},
		onClose: () => {}
	};

	const context = () =>
		new Map([[MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] })]]);

	beforeEach(() => {
		vi.clearAllMocks();
		mockPairs.set([]);
		mockFreeBalance.set({});
		mockIcTokenBySymbol.set({});
	});

	it('renders the form step by default', () => {
		const { container } = render(LimitOrderWizard, {
			props: { ...baseProps, currentStep: steps[0] },
			context: context()
		});

		expect(container).toHaveTextContent(en.trading.limit_order.review_button);
	});

	it('does not load the order book while no trading pair is selected', () => {
		render(LimitOrderWizard, {
			props: { ...baseProps, currentStep: steps[0] },
			context: context()
		});

		// `refreshOrderBook` guards on a selected pair; without one it is a no-op.
		expect(mockLoadOrderBook).not.toHaveBeenCalled();
	});

	it('renders the base-token picker step', () => {
		const { getByText } = render(LimitOrderWizard, {
			props: {
				...baseProps,
				currentStep: stepByName(WizardStepsLimitOrder.BASE_TOKEN)
			},
			context: context()
		});

		expect(getByText(en.core.text.back)).toBeInTheDocument();
	});

	it('renders the quote-token picker step', () => {
		const { getByText } = render(LimitOrderWizard, {
			props: {
				...baseProps,
				currentStep: stepByName(WizardStepsLimitOrder.QUOTE_TOKEN)
			},
			context: context()
		});

		expect(getByText(en.core.text.back)).toBeInTheDocument();
	});

	it('renders the review step', () => {
		const { container } = render(LimitOrderWizard, {
			props: {
				...baseProps,
				currentStep: stepByName(WizardStepsLimitOrder.REVIEW)
			},
			context: context()
		});

		expect(container).toHaveTextContent(en.trading.limit_order.place_order_button);
	});

	it('renders the placing/progress step', () => {
		const { container } = render(LimitOrderWizard, {
			props: {
				...baseProps,
				currentStep: stepByName(WizardStepsLimitOrder.PLACING),
				progressStep: ProgressStepsLimitOrder.PLACE
			},
			context: context()
		});

		expect(container).toHaveTextContent(en.trading.limit_order.placing_initializing);
	});

	it('does not render the interval loader on the placing step', () => {
		render(LimitOrderWizard, {
			props: {
				...baseProps,
				currentStep: stepByName(WizardStepsLimitOrder.PLACING),
				progressStep: ProgressStepsLimitOrder.PLACE
			},
			context: context()
		});

		expect(mockLoadOrderBook).not.toHaveBeenCalled();
	});
});
