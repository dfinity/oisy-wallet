import ExtensionPanelContent from '$lib/components/extension/ExtensionPanelContent.svelte';
import {
	OISY_EXTENSION_KEEP_ALIVE_MS,
	OISY_EXTENSION_MIN_VERSION,
	OISY_EXTENSION_PANEL_PORT_NAME,
	OISY_EXTENSION_PANEL_RECONNECT_ATTEMPTS,
	OISY_EXTENSION_PANEL_STATE_TIMEOUT_MS
} from '$lib/constants/extension.constants';
import * as extensionProviders from '$lib/providers/extension.providers';
import { ethAddressStore, solAddressDevnetStore } from '$lib/stores/address.store';
import type { ExtensionPort } from '$lib/types/extension';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { fireEvent, render, within } from '@testing-library/svelte';
import { tick } from 'svelte';

interface FakePort {
	port: ExtensionPort;
	receive: (message: unknown) => void;
	drop: () => void;
}

describe('ExtensionPanelContent', () => {
	let ports: FakePort[];

	// Every connection gets its own port, like `chrome.runtime.connect`.
	const createPort = (): ExtensionPort => {
		let onMessage: (message: unknown) => void = () => undefined;
		let onDisconnect: () => void = () => undefined;

		const port: ExtensionPort = {
			postMessage: vi.fn(),
			disconnect: vi.fn(),
			onMessage: {
				addListener: (listener) => {
					onMessage = listener;
				}
			},
			onDisconnect: {
				addListener: (listener) => {
					onDisconnect = listener;
				}
			}
		};

		ports.push({ port, receive: (message) => onMessage(message), drop: () => onDisconnect() });

		return port;
	};

	const current = (): FakePort => ports[ports.length - 1];

	const state = ({
		account = null,
		sites = {},
		version = OISY_EXTENSION_MIN_VERSION
	}: {
		account?: { eth: string; sol: string } | null;
		sites?: Record<string, { eth: boolean; sol: boolean }>;
		version?: string;
	} = {}) => ({ type: 'state', state: { account, sites }, version });

	const sentMessages = () =>
		ports.flatMap(({ port }) => vi.mocked(port.postMessage).mock.calls.map(([message]) => message));

	beforeEach(() => {
		vi.clearAllMocks();

		ports = [];
		vi.spyOn(extensionProviders, 'connectExtension').mockImplementation(createPort);

		mockPage.mockUrl(new URL('http://localhost:5175/extension/panel/'));
		setupUserNetworksStore('allEnabled');
		setupTestnetsStore('enabled');
		ethAddressStore.set({ certified: true, data: mockEthAddress });
		solAddressDevnetStore.set({ certified: true, data: mockSolAddress });
	});

	afterEach(() => {
		vi.useRealTimers();
		setupTestnetsStore('reset');
		ethAddressStore.reset();
		solAddressDevnetStore.reset();
	});

	it('asks the extension for its state on the panel port', () => {
		render(ExtensionPanelContent);

		expect(extensionProviders.connectExtension).toHaveBeenCalledExactlyOnceWith({
			name: OISY_EXTENSION_PANEL_PORT_NAME
		});
		expect(current().port.postMessage).toHaveBeenCalledWith({ type: 'get-state' });
	});

	it('hands the signed-in account to an extension that holds no account', async () => {
		render(ExtensionPanelContent);

		current().receive(state());
		await tick();

		expect(current().port.postMessage).toHaveBeenCalledWith({
			type: 'set-account',
			account: { eth: mockEthAddress, sol: mockSolAddress }
		});
	});

	it('does not send the account the extension already holds', async () => {
		render(ExtensionPanelContent);

		current().receive(state({ account: { eth: mockEthAddress, sol: mockSolAddress } }));
		await tick();

		expect(sentMessages().filter(({ type }) => type === 'set-account')).toHaveLength(0);
	});

	it('lists sites that can see at least one chain, and disconnects one', async () => {
		const { getByText, queryByText, getByRole } = render(ExtensionPanelContent);

		current().receive(
			state({
				sites: {
					'https://app.example': { eth: true, sol: false },
					'https://gone.example': { eth: false, sol: false }
				}
			})
		);
		await tick();

		const row = getByText('app.example').closest('li');

		expect(row).not.toBeNull();
		expect(within(row as HTMLElement).getByText(en.extension.panel.chain_eth)).toBeInTheDocument();
		expect(queryByText('gone.example')).not.toBeInTheDocument();

		await fireEvent.click(getByRole('button', { name: 'Disconnect app.example' }));

		expect(current().port.postMessage).toHaveBeenCalledWith({
			type: 'revoke-site',
			origin: 'https://app.example'
		});
	});

	it('says no site is connected yet', async () => {
		const { getByText } = render(ExtensionPanelContent);

		current().receive(state());
		await tick();

		expect(getByText(en.extension.panel.no_sites)).toBeInTheDocument();
	});

	it('refuses an outdated extension and does not hand it the account', async () => {
		const { getByText } = render(ExtensionPanelContent);

		current().receive(state({ version: '0.0.0' }));
		await tick();

		expect(getByText(en.extension.text.outdated)).toBeInTheDocument();
		expect(sentMessages().filter(({ type }) => type === 'set-account')).toHaveLength(0);
	});

	it('reconnects when Chrome stops the extension worker', async () => {
		const { queryByText } = render(ExtensionPanelContent);

		current().receive(state());
		current().drop();
		await tick();

		expect(ports).toHaveLength(2);
		expect(current().port.postMessage).toHaveBeenCalledWith({ type: 'get-state' });
		expect(queryByText(en.extension.text.no_extension)).not.toBeInTheDocument();
	});

	it('says the extension is unreachable once reconnecting keeps failing', async () => {
		const { getByText } = render(ExtensionPanelContent);

		for (let attempt = 0; attempt <= OISY_EXTENSION_PANEL_RECONNECT_ATTEMPTS; attempt++) {
			current().drop();
		}
		await tick();

		expect(ports).toHaveLength(OISY_EXTENSION_PANEL_RECONNECT_ATTEMPTS + 1);
		expect(getByText(en.extension.text.no_extension)).toBeInTheDocument();
	});

	it('treats an extension that never answers the panel as out of date', async () => {
		vi.useFakeTimers();

		const { getByText } = render(ExtensionPanelContent);
		vi.advanceTimersByTime(OISY_EXTENSION_PANEL_STATE_TIMEOUT_MS);
		await tick();

		expect(getByText(en.extension.text.outdated)).toBeInTheDocument();
		expect(sentMessages().filter(({ type }) => type === 'set-account')).toHaveLength(0);
	});

	it('pings the extension while the panel is open', () => {
		vi.useFakeTimers();

		render(ExtensionPanelContent);
		vi.advanceTimersByTime(OISY_EXTENSION_KEEP_ALIVE_MS);

		expect(current().port.postMessage).toHaveBeenCalledWith({ type: 'ping' });
	});

	it('says the extension is unreachable when no extension answers', () => {
		vi.spyOn(extensionProviders, 'connectExtension').mockReturnValue(undefined);

		const { getByText } = render(ExtensionPanelContent);

		expect(getByText(en.extension.text.no_extension)).toBeInTheDocument();
	});
});
