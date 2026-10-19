import ExtensionPanel from '$lib/components/extension/ExtensionPanel.svelte';
import * as lockedDerived from '$lib/derived/locked.derived';
import { Currency } from '$lib/enums/currency';
import * as extensionProviders from '$lib/providers/extension.providers';
import { loadExtensionPanelSnapshot } from '$lib/services/extension-panel.services';
import { ExchangeWorker } from '$lib/services/worker.exchange.services';
import type { ExtensionPanelSnapshot } from '$lib/types/extension';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$lib/services/worker.exchange.services', () => ({
	ExchangeWorker: { init: vi.fn() }
}));

vi.mock('$lib/services/extension-panel.services', () => ({
	loadExtensionPanelSnapshot: vi.fn(),
	saveExtensionPanelSnapshot: vi.fn()
}));

const snapshot: ExtensionPanelSnapshot = {
	savedAt: Date.now(),
	usdTotal: 1234.5,
	currency: Currency.USD,
	exchangeRateToUsd: 1,
	rows: []
};

describe('ExtensionPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPage.mockUrl(new URL('http://localhost:5175/extension/panel/'));
		vi.spyOn(extensionProviders, 'announcePanelReady').mockImplementation(() => undefined);
		vi.spyOn(lockedDerived, 'isAuthLocked', 'get').mockReturnValue(readable(false));
		mockAuthSignedIn(false);
	});

	it('tells the extension that OISY has started', () => {
		vi.mocked(loadExtensionPanelSnapshot).mockResolvedValue(null);

		render(ExtensionPanel);

		expect(extensionProviders.announcePanelReady).toHaveBeenCalledOnce();
	});

	it('shows the last balances once the session has ended', async () => {
		vi.mocked(loadExtensionPanelSnapshot).mockResolvedValue(snapshot);

		const { getByTestId } = render(ExtensionPanel);

		await waitFor(() => expect(getByTestId('extension-wallet-snapshot')).toBeInTheDocument());
	});

	it('shows the sign-in when there is no snapshot', async () => {
		vi.mocked(loadExtensionPanelSnapshot).mockResolvedValue(null);

		const { getByText, queryByTestId } = render(ExtensionPanel);

		await waitFor(() =>
			expect(getByText(en.signer.sign_in.text.open_or_create)).toBeInTheDocument()
		);

		expect(queryByTestId('extension-wallet-snapshot')).not.toBeInTheDocument();
	});

	it('shows no wallet data while OISY is locked', async () => {
		vi.spyOn(lockedDerived, 'isAuthLocked', 'get').mockReturnValue(readable(true));
		vi.mocked(loadExtensionPanelSnapshot).mockResolvedValue(snapshot);

		const { getByText, queryByTestId } = render(ExtensionPanel);

		await waitFor(() => expect(getByText(en.lock.text.title_part_1)).toBeInTheDocument());

		expect(queryByTestId('extension-wallet-snapshot')).not.toBeInTheDocument();
	});

	it('hands the saved price lookups to the price worker in a form it can receive', async () => {
		// A worker receives a structured clone of what is posted, so a reactive proxy would throw.
		const startExchangeTimer = vi.fn((data: unknown) => structuredClone(data));
		vi.mocked(ExchangeWorker.init).mockResolvedValue({
			startExchangeTimer,
			destroy: vi.fn()
		} as unknown as ExchangeWorker);
		vi.mocked(loadExtensionPanelSnapshot).mockResolvedValue({
			...snapshot,
			holdings: [{ priceKey: 'ethereum', balance: 1n, decimals: 18 }],
			prices: {
				erc20Addresses: [{ address: '0xa0b8', coingeckoId: 'ethereum', chainId: 1n }],
				icrcCanisterIds: [],
				splAddresses: []
			}
		});

		render(ExtensionPanel);

		await waitFor(() => expect(startExchangeTimer).toHaveBeenCalledOnce());

		expect(startExchangeTimer.mock.results[0].type).toBe('return');
	});
});
