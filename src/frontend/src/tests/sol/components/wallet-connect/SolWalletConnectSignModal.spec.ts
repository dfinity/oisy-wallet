import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import SolWalletConnectSignMessageModal from '$sol/components/wallet-connect/SolWalletConnectSignMessageModal.svelte';
import SolWalletConnectSignModal from '$sol/components/wallet-connect/SolWalletConnectSignModal.svelte';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_MESSAGE,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { decode, sign } from '$sol/services/wallet-connect.services';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

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
		type DecodedReview = Awaited<ReturnType<typeof decode>>;

		let resolveDecode: (mapped: DecodedReview) => void = () => {};

		vi.mocked(decode).mockReturnValueOnce(
			new Promise<DecodedReview>((resolve) => {
				resolveDecode = resolve;
			})
		);

		const { getByRole } = render(SolWalletConnectSignModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
		});

		const approve = getByRole('button', { name: en.core.text.approve });

		expect(approve).toBeDisabled();

		resolveDecode({ amount: 1n, parties: { sources: [], destinations: [], partial: true } });

		await waitFor(() => {
			expect(approve).toBeEnabled();
		});
	});

	describe('the simulated flag it hands the signing service', () => {
		// The service tests pass this flag in, so only these cover the derivation itself: a
		// regression hard-coding it would leave those green and disable the refusal.
		const approve = async (decoded: Awaited<ReturnType<typeof decode>>) => {
			vi.mocked(sign).mockClear();
			vi.mocked(decode).mockResolvedValueOnce(decoded);

			const { getByRole } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			const button = getByRole('button', { name: en.core.text.approve });

			await waitFor(() => {
				expect(button).toBeEnabled();
			});

			await fireEvent.click(button);

			await waitFor(() => {
				expect(sign).toHaveBeenCalledOnce();
			});

			return vi.mocked(sign).mock.calls[0][0];
		};

		it('should be true when the run described something', async () => {
			const args = await approve({
				amount: 1n,
				preview: { solDelta: -5_000n, tokenDeltas: [], controlChanges: [] },
				parties: { sources: [], destinations: [], partial: false }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: true }));
		});

		it('should be false when a run completed but described nothing', async () => {
			// A stake delegation is the case: the run succeeds and leaves the parties complete, yet
			// changes nothing the preview measures, so nothing describes the instruction nobody read.
			const args = await approve({
				amount: 1n,
				parties: { sources: [], destinations: [], partial: false }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false }));
		});

		it('should be false when there was no run at all', async () => {
			const args = await approve({
				amount: 1n,
				parties: { sources: [], destinations: [], partial: true }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false }));
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
