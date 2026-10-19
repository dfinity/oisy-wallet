import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_DEVNET_TOKEN } from '$env/tokens/tokens.sol.env';
import ExtensionPanelContent from '$lib/components/extension/ExtensionPanelContent.svelte';
import {
	OISY_EXTENSION_KEEP_ALIVE_MS,
	OISY_EXTENSION_MIN_VERSION,
	OISY_EXTENSION_PANEL_PORT_NAME,
	OISY_EXTENSION_PANEL_RECONNECT_ATTEMPTS,
	OISY_EXTENSION_PANEL_STATE_TIMEOUT_MS
} from '$lib/constants/extension.constants';
import { TOKEN_CARD } from '$lib/constants/test-ids.constants';
import * as networkTokensUiDerived from '$lib/derived/network-tokens-ui.derived';
import * as extensionProviders from '$lib/providers/extension.providers';
import * as authServices from '$lib/services/auth.services';
import { ethAddressStore, solAddressDevnetStore } from '$lib/stores/address.store';
import type { ExtensionPort } from '$lib/types/extension';
import type { TokenUi } from '$lib/types/token-ui';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { fireEvent, render, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readable } from 'svelte/store';

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
		locked = false,
		activeOrigin = null,
		version = OISY_EXTENSION_MIN_VERSION
	}: {
		account?: { eth: string; sol: string } | null;
		sites?: Record<string, { eth: boolean; sol: boolean }>;
		locked?: boolean;
		activeOrigin?: string | null;
		version?: string;
	} = {}) => ({ type: 'state', state: { account, sites, locked, activeOrigin }, version });

	const tokenCardId = ({ symbol, network }: TokenUi) =>
		`${TOKEN_CARD}-${symbol}-${network.id.description}`;

	const sentMessages = () =>
		ports.flatMap(({ port }) => vi.mocked(port.postMessage).mock.calls.map(([message]) => message));

	beforeEach(() => {
		vi.clearAllMocks();

		ports = [];
		vi.spyOn(extensionProviders, 'connectExtension').mockImplementation(createPort);
		vi.spyOn(authServices, 'signOut').mockResolvedValue();

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
		expect(
			getByText(replacePlaceholders(en.extension.panel.connected_sites_count, { $count: '0' }))
		).toBeInTheDocument();
	});

	it('counts the connected sites in the heading', async () => {
		const { getByText } = render(ExtensionPanelContent);

		current().receive(
			state({
				sites: {
					'https://app.example': { eth: true, sol: false },
					'https://sol.example': { eth: false, sol: true }
				}
			})
		);
		await tick();

		expect(
			getByText(replacePlaceholders(en.extension.panel.connected_sites_count, { $count: '2' }))
		).toBeInTheDocument();
	});

	it('shows that the site in the active tab is connected, and disconnects it from the card', async () => {
		const { getByTestId } = render(ExtensionPanelContent);

		current().receive(
			state({
				sites: { 'https://app.example': { eth: true, sol: true } },
				activeOrigin: 'https://app.example'
			})
		);
		await tick();

		const card = within(getByTestId('extension-this-site'));

		expect(card.getByText('app.example')).toBeInTheDocument();
		expect(
			card.getByText(
				replacePlaceholders(en.extension.panel.this_site_connected, {
					$chains: `${en.extension.panel.chain_eth} · ${en.extension.panel.chain_sol}`
				})
			)
		).toBeInTheDocument();

		await fireEvent.click(card.getByRole('button', { name: 'Disconnect app.example' }));

		expect(current().port.postMessage).toHaveBeenCalledWith({
			type: 'revoke-site',
			origin: 'https://app.example'
		});
	});

	it('shows that the site in the active tab is not connected', async () => {
		const { getByTestId } = render(ExtensionPanelContent);

		current().receive(
			state({
				sites: { 'https://app.example': { eth: true, sol: false } },
				activeOrigin: 'https://other.example'
			})
		);
		await tick();

		const card = within(getByTestId('extension-this-site'));

		expect(card.getByText('other.example')).toBeInTheDocument();
		expect(card.getByText(en.extension.panel.this_site_not_connected)).toBeInTheDocument();
		expect(card.queryByRole('button')).not.toBeInTheDocument();
	});

	it('shows no site card where the extension does not run', async () => {
		const { queryByTestId } = render(ExtensionPanelContent);

		current().receive(state({ activeOrigin: null }));
		await tick();

		expect(queryByTestId('extension-this-site')).not.toBeInTheDocument();
	});

	it('follows the active tab', async () => {
		const { getByTestId } = render(ExtensionPanelContent);

		current().receive(state({ activeOrigin: 'https://one.example' }));
		await tick();

		expect(within(getByTestId('extension-this-site')).getByText('one.example')).toBeInTheDocument();

		current().receive(state({ activeOrigin: 'https://two.example' }));
		await tick();

		expect(within(getByTestId('extension-this-site')).getByText('two.example')).toBeInTheDocument();
	});

	it('disconnects every site from the menu', async () => {
		const { getByRole } = render(ExtensionPanelContent);

		current().receive(state({ sites: { 'https://app.example': { eth: true, sol: false } } }));
		await tick();

		await fireEvent.click(getByRole('button', { name: en.extension.panel.menu }));
		await fireEvent.click(getByRole('button', { name: en.extension.panel.disconnect_all }));

		expect(current().port.postMessage).toHaveBeenCalledWith({ type: 'revoke-all-sites' });
	});

	it('locks the extension before logging out from the menu', async () => {
		const { getByRole } = render(ExtensionPanelContent);

		current().receive(state({ account: { eth: mockEthAddress, sol: mockSolAddress } }));
		await tick();

		await fireEvent.click(getByRole('button', { name: en.extension.panel.menu }));
		await fireEvent.click(getByRole('button', { name: en.auth.text.logout }));

		expect(current().port.postMessage).toHaveBeenCalledWith({ type: 'lock' });
		expect(authServices.signOut).toHaveBeenCalledExactlyOnceWith({ source: 'extension-panel' });
		expect(vi.mocked(current().port.postMessage).mock.invocationCallOrder.at(-1) ?? 0).toBeLessThan(
			vi.mocked(authServices.signOut).mock.invocationCallOrder[0]
		);
	});

	it('hands the account back to an extension locked by an earlier log out', async () => {
		render(ExtensionPanelContent);

		current().receive(
			state({ account: { eth: mockEthAddress, sol: mockSolAddress }, locked: true })
		);
		await tick();

		expect(current().port.postMessage).toHaveBeenCalledWith({
			type: 'set-account',
			account: { eth: mockEthAddress, sol: mockSolAddress }
		});
	});

	it('shows only the balances sites can use', async () => {
		const tokens = [ETHEREUM_TOKEN, SEPOLIA_TOKEN, SOLANA_DEVNET_TOKEN] as TokenUi[];

		vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
			readable(tokens)
		);

		const { queryByTestId, getByText } = render(ExtensionPanelContent);

		current().receive(state());
		await tick();

		expect(queryByTestId(tokenCardId(SEPOLIA_TOKEN as TokenUi))).toBeInTheDocument();
		expect(queryByTestId(tokenCardId(SOLANA_DEVNET_TOKEN as TokenUi))).toBeInTheDocument();
		expect(queryByTestId(tokenCardId(ETHEREUM_TOKEN as TokenUi))).not.toBeInTheDocument();
		expect(getByText(en.extension.panel.all_tokens)).toBeInTheDocument();
	});

	it('shows the address the extension gives sites in the header', async () => {
		const { getByTitle } = render(ExtensionPanelContent);

		current().receive(state());
		await tick();

		expect(getByTitle(mockEthAddress)).toBeInTheDocument();
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
