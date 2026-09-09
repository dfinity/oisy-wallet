import LoaderOisyTrade from '$lib/components/loaders/LoaderOisyTrade.svelte';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, waitFor } from '@testing-library/svelte';

const { mockTradingEnabled, mockLoadOisyTrade } = vi.hoisted(() => ({
	mockTradingEnabled: { value: true },
	mockLoadOisyTrade: vi.fn(() => Promise.resolve(undefined))
}));

vi.mock('$env/trading', () => ({
	get anyTradingProviderEnabled() {
		return mockTradingEnabled.value;
	}
}));

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOisyTrade: mockLoadOisyTrade
}));

describe('LoaderOisyTrade', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockTradingEnabled.value = true;
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

	it('should not load anything when no trading provider is enabled', () => {
		mockTradingEnabled.value = false;
		mockAuthStore();

		render(LoaderOisyTrade);

		expect(mockLoadOisyTrade).not.toHaveBeenCalled();
	});
});
