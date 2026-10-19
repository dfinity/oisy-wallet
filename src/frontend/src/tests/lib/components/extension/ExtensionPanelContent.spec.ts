import ExtensionPanelContent from '$lib/components/extension/ExtensionPanelContent.svelte';
import {
	OISY_EXTENSION_MIN_VERSION,
	OISY_EXTENSION_PANEL_PORT_NAME
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

describe('ExtensionPanelContent', () => {
	let receive: (message: unknown) => void;
	let port: ExtensionPort;

	const state = ({
		account = null,
		sites = {},
		version = OISY_EXTENSION_MIN_VERSION
	}: {
		account?: { eth: string; sol: string } | null;
		sites?: Record<string, { eth: boolean; sol: boolean }>;
		version?: string;
	} = {}) => ({ type: 'state', state: { account, sites }, version });

	const setAccountCalls = () =>
		vi.mocked(port.postMessage).mock.calls.filter(([message]) => message.type === 'set-account');

	beforeEach(() => {
		vi.clearAllMocks();

		port = {
			postMessage: vi.fn(),
			disconnect: vi.fn(),
			onMessage: {
				addListener: (listener) => {
					receive = listener;
				}
			},
			onDisconnect: { addListener: vi.fn() }
		};
		vi.spyOn(extensionProviders, 'connectExtension').mockReturnValue(port);

		mockPage.mockUrl(new URL('http://localhost:5175/extension/panel/'));
		setupUserNetworksStore('allEnabled');
		setupTestnetsStore('enabled');
		ethAddressStore.set({ certified: true, data: mockEthAddress });
		solAddressDevnetStore.set({ certified: true, data: mockSolAddress });
	});

	afterEach(() => {
		setupTestnetsStore('reset');
		ethAddressStore.reset();
		solAddressDevnetStore.reset();
	});

	it('asks the extension for its state on the panel port', () => {
		render(ExtensionPanelContent);

		expect(extensionProviders.connectExtension).toHaveBeenCalledExactlyOnceWith({
			name: OISY_EXTENSION_PANEL_PORT_NAME
		});
		expect(port.postMessage).toHaveBeenCalledWith({ type: 'get-state' });
	});

	it('hands the signed-in account to an extension that holds no account', async () => {
		render(ExtensionPanelContent);

		receive(state());
		await tick();

		expect(port.postMessage).toHaveBeenCalledWith({
			type: 'set-account',
			account: { eth: mockEthAddress, sol: mockSolAddress }
		});
	});

	it('does not send the account the extension already holds', async () => {
		render(ExtensionPanelContent);

		receive(state({ account: { eth: mockEthAddress, sol: mockSolAddress } }));
		await tick();

		expect(setAccountCalls()).toHaveLength(0);
	});

	it('lists sites that can see at least one chain, and disconnects one', async () => {
		const { getByText, queryByText, getByRole } = render(ExtensionPanelContent);

		receive(
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

		expect(port.postMessage).toHaveBeenCalledWith({
			type: 'revoke-site',
			origin: 'https://app.example'
		});
	});

	it('says no site is connected yet', async () => {
		const { getByText } = render(ExtensionPanelContent);

		receive(state());
		await tick();

		expect(getByText(en.extension.panel.no_sites)).toBeInTheDocument();
	});

	it('refuses an outdated extension and does not hand it the account', async () => {
		const { getByText } = render(ExtensionPanelContent);

		receive(state({ version: '0.0.0' }));
		await tick();

		expect(getByText(en.extension.text.outdated)).toBeInTheDocument();
		expect(setAccountCalls()).toHaveLength(0);
	});

	it('says the extension is unreachable when no extension answers', () => {
		vi.spyOn(extensionProviders, 'connectExtension').mockReturnValue(undefined);

		const { getByText } = render(ExtensionPanelContent);

		expect(getByText(en.extension.text.no_extension)).toBeInTheDocument();
	});
});
