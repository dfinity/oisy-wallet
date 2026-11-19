import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import * as ethNetworksDerived from '$eth/derived/networks.derived';
import * as evmNetworksDerived from '$evm/derived/networks.derived';
import { icpAccountIdentifierText } from '$icp/derived/ic.derived';
import { btcAddressStore } from '$icp/stores/btc.store';
import ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
import {
	RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
	RECEIVE_TOKENS_MODAL_ETH_SECTION,
	RECEIVE_TOKENS_MODAL_ICP_SECTION,
	RECEIVE_TOKENS_MODAL_ICRC_SECTION,
	RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON
} from '$lib/constants/test-ids.constants';
import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity, mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('ReceiveAddresses', () => {
	const section = ({ container, testId }: { container: HTMLElement; testId: string }) =>
		container.querySelector<HTMLElement>(`[data-tid="${testId}"]`);

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
		btcAddressMainnetStore.reset();
		btcAddressStore.reinitialize();
	});

	const short = (address: string) => shortenWithMiddleEllipsis({ text: address, splitLength: 6 });

	it('should list the ICP Principal and the ICP Account ID separately, each shortened', () => {
		const { container } = render(ReceiveAddresses, { props: { onQRCode: vi.fn() } });

		expect(section({ container, testId: RECEIVE_TOKENS_MODAL_ICRC_SECTION })).toHaveTextContent(
			short(mockPrincipalText)
		);
		expect(section({ container, testId: RECEIVE_TOKENS_MODAL_ICP_SECTION })).toHaveTextContent(
			short(get(icpAccountIdentifierText) ?? '')
		);
	});

	it('should keep what an ICP address is for with its QR code details', () => {
		const onQRCode = vi.fn();

		const { container } = render(ReceiveAddresses, { props: { onQRCode } });

		section({ container, testId: RECEIVE_TOKENS_MODAL_ICP_SECTION })
			?.querySelector<HTMLButtonElement>(`[data-tid="${RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON}"]`)
			?.click();

		expect(onQRCode).toHaveBeenCalledWith(
			expect.objectContaining({
				address: get(icpAccountIdentifierText),
				description: get(i18n).receive.icp.text.use_for_icp_deposit
			})
		);
	});

	it('should show the EVM address once', () => {
		const { container } = render(ReceiveAddresses, { props: { onQRCode: vi.fn() } });

		const evm = section({ container, testId: RECEIVE_TOKENS_MODAL_ETH_SECTION });

		expect(evm).toHaveTextContent(short(mockEthAddress));
		expect(
			container.querySelectorAll(`[data-tid="${RECEIVE_TOKENS_MODAL_ETH_SECTION}"]`)
		).toHaveLength(1);
	});

	it('should keep the networks with the EVM address in its QR code details', () => {
		const onQRCode = vi.fn();

		const { container } = render(ReceiveAddresses, { props: { onQRCode } });

		section({ container, testId: RECEIVE_TOKENS_MODAL_ETH_SECTION })
			?.querySelector<HTMLButtonElement>(`[data-tid="${RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON}"]`)
			?.click();

		expect(onQRCode).toHaveBeenCalledWith(
			expect.objectContaining({
				address: mockEthAddress,
				description: expect.stringContaining(`${ETHEREUM_NETWORK.name}, ${BASE_NETWORK.name}`)
			})
		);
	});

	it('should not offer an uncertified Bitcoin address', () => {
		btcAddressMainnetStore.set({ data: mockBtcAddress, certified: false });

		const { container } = render(ReceiveAddresses, { props: { onQRCode: vi.fn() } });

		const btc = section({ container, testId: RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION });

		expect(btc).not.toHaveTextContent(short(mockBtcAddress));
		expect(btc?.querySelector(`[data-tid="${RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON}"]`)).toBeNull();
	});

	it('should never list the ckBTC deposit address', () => {
		const depositAddress = 'bc1qdepositaddressforckbtc';

		btcAddressStore.set({
			id: parseTokenId('ckBTC'),
			data: { data: depositAddress, certified: true }
		});

		const { container } = render(ReceiveAddresses, { props: { onQRCode: vi.fn() } });

		expect(container).not.toHaveTextContent(depositAddress);
	});
});
