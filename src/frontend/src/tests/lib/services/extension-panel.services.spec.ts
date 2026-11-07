import * as idbApi from '$lib/api/idb-extension-panel.api';
import { Currency } from '$lib/enums/currency';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import {
	loadExtensionPanelSnapshot,
	saveExtensionPanelSnapshot
} from '$lib/services/extension-panel.services';
import type { ExtensionPanelSnapshot } from '$lib/types/extension';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/api/idb-extension-panel.api', () => ({
	getIdbExtensionPanelSnapshot: vi.fn(),
	setIdbExtensionPanelSnapshot: vi.fn()
}));

const snapshot: ExtensionPanelSnapshot = {
	savedAt: 1_700_000_000_000,
	usdTotal: 12.5,
	currency: Currency.USD,
	exchangeRateToUsd: 1,
	rows: [{ name: 'Ethereum', symbol: 'ETH', decimals: 18, balance: 1n, networkId: 'ETH' }]
};

describe('extension-panel.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('saveExtensionPanelSnapshot', () => {
		it('saves while the session is valid', async () => {
			vi.spyOn(AuthClientProvider.getInstance(), 'loadIdentity').mockResolvedValue(mockIdentity);

			await saveExtensionPanelSnapshot(snapshot);

			expect(idbApi.setIdbExtensionPanelSnapshot).toHaveBeenCalledExactlyOnceWith(snapshot);
		});

		it('saves nothing once the session is gone, so a logout elsewhere stays a logout', async () => {
			vi.spyOn(AuthClientProvider.getInstance(), 'loadIdentity').mockResolvedValue(undefined);

			await saveExtensionPanelSnapshot(snapshot);

			expect(idbApi.setIdbExtensionPanelSnapshot).not.toHaveBeenCalled();
		});

		it('swallows storage errors', async () => {
			vi.spyOn(AuthClientProvider.getInstance(), 'loadIdentity').mockResolvedValue(mockIdentity);
			vi.mocked(idbApi.setIdbExtensionPanelSnapshot).mockRejectedValue(new Error('quota'));

			await expect(saveExtensionPanelSnapshot(snapshot)).resolves.toBeUndefined();
		});
	});

	describe('loadExtensionPanelSnapshot', () => {
		it('returns a saved snapshot', async () => {
			vi.mocked(idbApi.getIdbExtensionPanelSnapshot).mockResolvedValue(snapshot);

			await expect(loadExtensionPanelSnapshot()).resolves.toEqual(snapshot);
		});

		it('returns null when there is none', async () => {
			vi.mocked(idbApi.getIdbExtensionPanelSnapshot).mockResolvedValue(undefined);

			await expect(loadExtensionPanelSnapshot()).resolves.toBeNull();
		});

		it('returns null for a snapshot it does not understand', async () => {
			vi.mocked(idbApi.getIdbExtensionPanelSnapshot).mockResolvedValue({ usdTotal: 'a lot' });

			await expect(loadExtensionPanelSnapshot()).resolves.toBeNull();
		});

		it('returns null when storage fails', async () => {
			vi.mocked(idbApi.getIdbExtensionPanelSnapshot).mockRejectedValue(new Error('blocked'));

			await expect(loadExtensionPanelSnapshot()).resolves.toBeNull();
		});
	});
});
