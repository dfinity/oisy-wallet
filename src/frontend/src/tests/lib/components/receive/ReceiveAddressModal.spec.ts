import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import * as ethNetworksDerived from '$eth/derived/networks.derived';
import * as evmNetworksDerived from '$evm/derived/networks.derived';
import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
import ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
import {
	RECEIVE_TOKENS_MODAL_ETH_SECTION,
	RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON
} from '$lib/constants/test-ids.constants';
import { ethAddressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('ReceiveAddressModal', () => {
	const evmQrButtonSelector = `[data-tid="${RECEIVE_TOKENS_MODAL_ETH_SECTION}"] [data-tid="${RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON}"]`;

	beforeEach(() => {
		vi.restoreAllMocks();
		mockPage.reset();

		authStore.setForTesting(mockIdentity);

		vi.spyOn(ethNetworksDerived, 'enabledEthereumNetworks', 'get').mockReturnValue(
			readable([ETHEREUM_NETWORK])
		);
		vi.spyOn(evmNetworksDerived, 'enabledEvmNetworks', 'get').mockReturnValue(
			readable([BASE_NETWORK])
		);

		ethAddressStore.set({ data: mockEthAddress, certified: true });
	});

	it('should keep focus in the QR code detail and bring it back to the row it came from', async () => {
		const { container, getByRole } = render(ReceiveAddressModal, {
			props: { infoCmp: ReceiveAddresses, title: get(i18n).wallet.text.your_addresses }
		});

		container.querySelector<HTMLElement>(evmQrButtonSelector)?.click();

		await waitFor(() => {
			expect(getByRole('button', { name: get(i18n).core.text.back })).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(document.activeElement).not.toBe(document.body);
		});

		expect(container).toHaveTextContent(`${ETHEREUM_NETWORK.name}, ${BASE_NETWORK.name}`);

		getByRole('button', { name: get(i18n).core.text.back }).click();

		await waitFor(() => {
			expect(document.activeElement).toBe(container.querySelector(evmQrButtonSelector));
		});
	});
});
