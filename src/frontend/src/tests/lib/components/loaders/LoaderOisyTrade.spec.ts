import LoaderOisyTrade from '$lib/components/loaders/LoaderOisyTrade.svelte';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, waitFor } from '@testing-library/svelte';

const { mockTradingEnabled, mockProviderEnabled, mockLoadOisyTrade } = vi.hoisted(() => ({
	mockTradingEnabled: { value: true },
	mockProviderEnabled: { value: true },
	mockLoadOisyTrade: vi.fn(() => Promise.resolve(undefined))
}));

// The two flags are mocked independently, as `OisyTradeProvider.svelte.spec.ts`
// does: the codebase models the Trading surface staying reachable through
// another provider while OISY TRADE itself is off, and this loader must follow
// the provider flag, not the aggregate.
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

describe('LoaderOisyTrade', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockTradingEnabled.value = true;
		mockProviderEnabled.value = true;
	});

	it('should load the OISY Trade data when an identity is available', async () => {
		mockAuthStore();

		render(LoaderOisyTrade);

		await waitFor(() => {
			expect(mockLoadOisyTrade).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});
	});

	// Signed out, `loadOisyTrade` resets the store, so the loader must still call it.
	it('should call the loader with a nullish identity when signed out', async () => {
		mockAuthStore(null);

		render(LoaderOisyTrade);

		await waitFor(() => {
			expect(mockLoadOisyTrade).toHaveBeenCalledExactlyOnceWith({ identity: null });
		});
	});

	it('should not load anything when the OISY Trade provider is disabled', () => {
		mockProviderEnabled.value = false;
		mockAuthStore();

		render(LoaderOisyTrade);

		expect(mockLoadOisyTrade).not.toHaveBeenCalled();
	});

	it('should not load anything when OISY Trade is off but another provider keeps the surface on', () => {
		mockTradingEnabled.value = true;
		mockProviderEnabled.value = false;
		mockAuthStore();

		render(LoaderOisyTrade);

		expect(mockLoadOisyTrade).not.toHaveBeenCalled();
	});
});
