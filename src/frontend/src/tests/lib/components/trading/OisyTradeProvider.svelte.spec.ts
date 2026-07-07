import OisyTradeProvider from '$lib/components/trading/OisyTradeProvider.svelte';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

const { mockTradingEnabled, mockProviderEnabled, mockLoadOisyTrade, mockGoto } = vi.hoisted(() => ({
	mockTradingEnabled: { value: true },
	mockProviderEnabled: { value: true },
	mockLoadOisyTrade: vi.fn(() => Promise.resolve(undefined)),
	mockGoto: vi.fn()
}));

vi.mock('$env/trading', () => ({
	get anyTradingProviderEnabled() {
		return mockTradingEnabled.value;
	}
}));

vi.mock('$env/oisy-trade', () => ({
	get OISY_TRADE_ENABLED() {
		return mockProviderEnabled.value;
	}
}));

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOisyTrade: mockLoadOisyTrade
}));

vi.mock('$app/navigation', () => ({
	goto: mockGoto,
	afterNavigate: vi.fn()
}));

describe('OisyTradeProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTradingEnabled.value = true;
		mockProviderEnabled.value = true;
		oisyTradeStore.reset();
	});

	it('renders the provider hero when trading and the provider are enabled', () => {
		const { getByText } = render(OisyTradeProvider);

		expect(getByText(en.trading.text.provider_name)).toBeInTheDocument();
	});

	it('renders the provider-unavailable placeholder when the provider is off', () => {
		mockProviderEnabled.value = false;

		const { getByText, queryByText } = render(OisyTradeProvider);

		expect(getByText(en.trading.provider_unavailable.title)).toBeInTheDocument();
		expect(queryByText(en.trading.text.provider_name)).toBeNull();
	});

	it('loads the trade data on mount via the interval loader', async () => {
		render(OisyTradeProvider);

		await tick();

		expect(mockLoadOisyTrade).toHaveBeenCalled();
	});

	it('redirects away and renders nothing when no trading provider is enabled', async () => {
		mockTradingEnabled.value = false;

		const { queryByText } = render(OisyTradeProvider);

		await tick();

		expect(mockGoto).toHaveBeenCalled();
		expect(queryByText(en.trading.text.provider_name)).toBeNull();
	});
});
