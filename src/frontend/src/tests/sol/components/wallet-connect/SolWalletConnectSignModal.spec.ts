import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import SolWalletConnectSignMessageModal from '$sol/components/wallet-connect/SolWalletConnectSignMessageModal.svelte';
import SolWalletConnectSignModal from '$sol/components/wallet-connect/SolWalletConnectSignModal.svelte';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_MESSAGE,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { decode } from '$sol/services/wallet-connect.services';
import type { MappedSolTransaction } from '$sol/types/sol-transaction';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$sol/services/wallet-connect.services', () => ({
	decode: vi.fn().mockResolvedValue({
		amount: undefined,
		destination: undefined,
		tokenAddress: undefined,
		isApproval: false,
		unreviewed: false
	}),
	decodeMessage: vi.fn().mockReturnValue('Sign in to Example'),
	sign: vi.fn(),
	signMessage: vi.fn()
}));

describe('SolWalletConnectSignModal', () => {
	const mockRequest = (method: string): WalletKitTypes.SessionRequest =>
		({
			id: 1,
			topic: 'mock-topic',
			params: {
				request: {
					method,
					params: { transaction: 'bW9jay10cmFuc2FjdGlvbg==', message: 'bW9jay1tZXNzYWdl' }
				},
				chainId: SOLANA_MAINNET_NETWORK.chainId
			},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					validation: 'VALID',
					origin: 'https://dapp.example',
					isScam: false
				}
			}
		}) as unknown as WalletKitTypes.SessionRequest;

	const props = (method: string) => ({
		listener: undefined,
		network: SOLANA_MAINNET_NETWORK,
		request: mockRequest(method)
	});

	it('should title a sign-transaction request as a transaction', async () => {
		const { getByText, queryByText } = render(SolWalletConnectSignModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
		});

		await waitFor(() => {
			expect(getByText(en.wallet_connect.text.sign_transaction)).toBeInTheDocument();
		});

		expect(queryByText(en.wallet_connect.text.sign_message)).not.toBeInTheDocument();
	});

	it('should title a sign-and-send-transaction request as sign and send', async () => {
		const { getByText, queryByText } = render(SolWalletConnectSignModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION)
		});

		await waitFor(() => {
			expect(getByText(en.wallet_connect.text.sign_and_send_transaction)).toBeInTheDocument();
		});

		expect(queryByText(en.wallet_connect.text.sign_message)).not.toBeInTheDocument();
	});

	it('should keep approval disabled until the transaction decode resolves', async () => {
		let resolveDecode: (mapped: MappedSolTransaction) => void = () => {};

		vi.mocked(decode).mockReturnValueOnce(
			new Promise<MappedSolTransaction>((resolve) => {
				resolveDecode = resolve;
			})
		);

		const { getByRole } = render(SolWalletConnectSignModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
		});

		const approve = getByRole('button', { name: en.core.text.approve });

		expect(approve).toBeDisabled();

		resolveDecode({ amount: 1n });

		await waitFor(() => {
			expect(approve).toBeEnabled();
		});
	});

	it('should keep the message title for a sign-message request', async () => {
		const { getByText } = render(SolWalletConnectSignMessageModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_MESSAGE)
		});

		await waitFor(() => {
			expect(getByText(en.wallet_connect.text.sign_message)).toBeInTheDocument();
		});
	});
});
