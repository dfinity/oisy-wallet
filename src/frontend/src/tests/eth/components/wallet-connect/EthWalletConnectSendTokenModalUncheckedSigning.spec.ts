import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthWalletConnectSendTokenModal from '$eth/components/wallet-connect/EthWalletConnectSendTokenModal.svelte';
import { ERC20_TRANSFER_HASH } from '$eth/constants/erc20.constants';
import { send } from '$eth/services/wallet-connect.services';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import {
	WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE,
	WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS,
	WALLET_CONNECT_UNCHECKED_SIGNING_POINTER
} from '$lib/constants/test-ids.constants';
import * as walletConnectServices from '$lib/services/wallet-connect.services';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { walletConnectUncheckedSigningStore } from '$lib/stores/wallet-connect-unchecked-signing.store';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { AbiCoder } from 'ethers/abi';

vi.mock(
	'$eth/components/fee/EthFeeContext.svelte',
	async () => await import('$tests/eth/components/wallet-connect/EthFeeContextWithFeeStub.svelte')
);

vi.mock(
	'$icp-eth/components/core/CkEthLoader.svelte',
	async () => await import('$tests/eth/components/wallet-connect/PassthroughStub.svelte')
);

vi.mock('$eth/services/wallet-connect.services', () => ({
	send: vi.fn()
}));

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => mockGoto(...args)
}));

describe('EthWalletConnectSendTokenModal and the way past a refusal', () => {
	const RECIPIENT = '0x2222222222222222222222222222222222222222';

	const undecodableTransfer = `${ERC20_TRANSFER_HASH}deadbeef`;

	const transfer = `${ERC20_TRANSFER_HASH}${AbiCoder.defaultAbiCoder()
		.encode(['address', 'uint256'], [RECIPIENT, 1n])
		.slice(2)}`;

	const renderModal = ({
		data,
		validation = 'VALID'
	}: {
		data: string;
		validation?: 'VALID' | 'INVALID' | 'UNKNOWN';
	}) =>
		render(EthWalletConnectSendTokenModal, {
			props: {
				request: {
					id: 1,
					topic: 'mock-topic',
					verifyContext: {
						verified: {
							verifyUrl: 'https://verify.walletconnect.org',
							validation,
							origin: 'https://dapp.example',
							isScam: false
						}
					}
				} as unknown as WalletKitTypes.SessionRequest,
				firstTransaction: {
					from: '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a',
					to: USDC_TOKEN.address,
					data
				},
				sourceNetwork: ETHEREUM_NETWORK,
				listener: undefined as OptionWalletConnectListener
			},
			context: new Map<symbol, unknown>([
				[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })]
			])
		});

	beforeEach(() => {
		vi.mocked(send).mockReset();
		vi.mocked(send).mockResolvedValue({ success: false });

		mockGoto.mockClear();

		erc20DefaultTokensStore.reset();
		erc20CustomTokensStore.resetAll();
		erc20DefaultTokensStore.add(USDC_TOKEN);

		walletConnectUncheckedSigningStore.disable();
	});

	afterEach(() => {
		walletConnectUncheckedSigningStore.disable();
	});

	it('should hand the acknowledged refusal to the signing service, with the switch on', async () => {
		walletConnectUncheckedSigningStore.enable();

		const { getByRole, getByText } = renderModal({ data: undecodableTransfer });

		const approve = getByRole('button', { name: en.core.text.approve });

		await waitFor(() => {
			expect(getByText(en.wallet_connect.text.unchecked_signing_acknowledge)).toBeInTheDocument();
		});

		expect(approve).toBeDisabled();

		await fireEvent.click(getByText(en.wallet_connect.text.unchecked_signing_acknowledge));

		expect(approve).toBeEnabled();

		await fireEvent.click(approve);

		await waitFor(() => {
			expect(send).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ acknowledgedRefusals: ['unverifiable_erc20'] })
			);
		});
	});

	it('should hand on no acknowledgement for a request it would sign anyway', async () => {
		walletConnectUncheckedSigningStore.enable();

		const { getByRole } = renderModal({ data: transfer });

		const approve = getByRole('button', { name: en.core.text.approve });

		await waitFor(() => {
			expect(approve).toBeEnabled();
		});

		await fireEvent.click(approve);

		await waitFor(() => {
			expect(send).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ acknowledgedRefusals: [] })
			);
		});
	});

	it('should offer no way past a refusal for a site the domain check flagged', async () => {
		walletConnectUncheckedSigningStore.enable();

		const { getByRole, getByText, queryByTestId } = renderModal({
			data: undecodableTransfer,
			validation: 'INVALID'
		});

		await waitFor(() => {
			expect(getByText(en.wallet_connect.text.undecodable_erc20_request)).toBeInTheDocument();
		});

		expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE)).not.toBeInTheDocument();
		expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_POINTER)).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('should reject the request and open Settings from the pointer, with the switch off', async () => {
		const rejectSpy = vi
			.spyOn(walletConnectServices, 'reject')
			.mockResolvedValue({ success: true });

		const { getByTestId } = renderModal({ data: undecodableTransfer });

		await waitFor(() => {
			expect(getByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS)).toBeInTheDocument();
		});

		await fireEvent.click(getByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS));

		await waitFor(() => {
			expect(mockGoto).toHaveBeenCalledWith(expect.stringContaining('/settings'));
		});

		expect(rejectSpy).toHaveBeenCalledOnce();
	});
});
