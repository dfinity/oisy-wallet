import ExtensionConnect from '$lib/components/extension/ExtensionConnect.svelte';
import { ethAddressStore, solAddressDevnetStore } from '$lib/stores/address.store';
import type { ExtensionConnectRequest, ExtensionPairRequest } from '$lib/types/extension';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { fireEvent, render } from '@testing-library/svelte';

describe('ExtensionConnect', () => {
	const onApprove = vi.fn();
	const onReject = vi.fn();

	const connectRequest: ExtensionConnectRequest = {
		id: 'request-1',
		kind: 'connect',
		chain: 'eth',
		origin: 'https://dapp.example'
	};

	const pairRequest: ExtensionPairRequest = { id: 'request-2', kind: 'pair' };

	const renderConnect = (request: ExtensionConnectRequest | ExtensionPairRequest) =>
		render(ExtensionConnect, { props: { request, onApprove, onReject } });

	beforeEach(() => {
		vi.clearAllMocks();

		setupTestnetsStore('enabled');
		ethAddressStore.set({ certified: true, data: mockEthAddress });
		solAddressDevnetStore.set({ certified: true, data: mockSolAddress });
	});

	afterEach(() => {
		setupTestnetsStore('reset');
		ethAddressStore.reset();
		solAddressDevnetStore.reset();
	});

	it('shows a site only the address of the chain it asked for', () => {
		const { getByText, queryByText } = renderConnect(connectRequest);

		expect(getByText(en.extension.connect.title_site)).toBeInTheDocument();
		expect(getByText(en.extension.connect.eth_network)).toBeInTheDocument();
		expect(queryByText(en.extension.connect.sol_network)).not.toBeInTheDocument();
		expect(getByText(en.extension.connect.site_sees)).toBeInTheDocument();
	});

	it('shows the extension both addresses when pairing', () => {
		const { getByText } = renderConnect(pairRequest);

		expect(getByText(en.extension.connect.title_extension)).toBeInTheDocument();
		expect(getByText(en.extension.connect.eth_network)).toBeInTheDocument();
		expect(getByText(en.extension.connect.sol_network)).toBeInTheDocument();
		expect(getByText(en.extension.connect.extension_keeps)).toBeInTheDocument();
	});

	it('approves with both addresses, which the extension keeps for balances', async () => {
		const { getByRole } = renderConnect(connectRequest);

		await fireEvent.click(getByRole('button', { name: en.extension.connect.connect }));

		expect(onApprove).toHaveBeenCalledExactlyOnceWith({ eth: mockEthAddress, sol: mockSolAddress });
		expect(onReject).not.toHaveBeenCalled();
	});

	it('rejects', async () => {
		const { getByRole } = renderConnect(connectRequest);

		await fireEvent.click(getByRole('button', { name: en.core.text.reject }));

		expect(onReject).toHaveBeenCalledOnce();
		expect(onApprove).not.toHaveBeenCalled();
	});

	it('asks to turn on testnets and holds Connect while they are off', () => {
		setupTestnetsStore('disabled');

		const { getByText, getByRole } = renderConnect(connectRequest);

		expect(getByText(en.extension.text.testnets_off)).toBeInTheDocument();
		expect(getByRole('button', { name: en.extension.connect.connect })).toBeDisabled();
	});

	it('holds Connect until both addresses are loaded', () => {
		solAddressDevnetStore.reset();

		const { getByText, getByRole } = renderConnect(connectRequest);

		expect(getByText(en.extension.text.loading_addresses)).toBeInTheDocument();
		expect(getByRole('button', { name: en.extension.connect.connect })).toBeDisabled();
	});
});
