import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { solAddressMainnetStore } from '$lib/stores/address.store';
import SolWalletConnectSignMessageModal from '$sol/components/wallet-connect/SolWalletConnectSignMessageModal.svelte';
import SolWalletConnectSignModal from '$sol/components/wallet-connect/SolWalletConnectSignModal.svelte';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_MESSAGE,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { decode, sign } from '$sol/services/wallet-connect.services';
import en from '$tests/mocks/i18n.mock';
import { mockAtaAddress, mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { lamports } from '@solana/kit';
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

		resolveDecode({
			amount: 1n,
			requiredSignatures: 1,
			parties: { sources: [], destinations: [], partial: true }
		});

		await waitFor(() => {
			expect(approve).toBeEnabled();
		});
	});

	it('should hold approval on a message it will not sign', async () => {
		// `sign()` refuses an ambiguous message, so letting the button be pressed would trade a
		// stated reason for a toast over a closed modal.
		vi.mocked(decode).mockResolvedValueOnce({
			amount: 1n,
			ambiguous: true,
			requiredSignatures: 1,
			parties: { sources: [], destinations: [], partial: true }
		});

		const { getByRole, getByText } = render(SolWalletConnectSignModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
		});

		await waitFor(() => {
			expect(getByText(en.wallet_connect.text.cannot_be_shown)).toBeInTheDocument();
		});

		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('should charge the base fee for every signature the decode counted', async () => {
		vi.mocked(decode).mockResolvedValueOnce({
			amount: 1n,
			requiredSignatures: 2,
			parties: { sources: [], destinations: [], partial: true }
		});

		const { getByTestId } = render(SolWalletConnectSignModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
		});

		await waitFor(() => {
			expect(getByTestId('network-fee')).toHaveTextContent('0.00001 SOL');
		});
	});

	// The review allows for the fees only when the wallet pays them, so it has to be told whether it does.
	describe('whether the wallet pays the fees, as the review is told', () => {
		// A two-signature send whose run takes both base fees from the wallet.
		const renderSend = async ({ sponsored }: { sponsored: boolean }) => {
			vi.mocked(decode).mockResolvedValueOnce({
				amount: 1n,
				requiredSignatures: 2,
				...(sponsored && { feePaidByOthers: true }),
				messageSummary: {
					kind: 'send',
					spent: { delta: -1_000_000n },
					counterparty: mockSolAddress2
				},
				preview: { solDelta: -1_010_000n, tokenDeltas: [], controlChanges: [] },
				parties: { sources: [], destinations: [], partial: false }
			});

			const result = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			// Once the base fee reads two signatures, the decode has reached the review.
			await waitFor(() => {
				expect(result.getByTestId('network-fee')).toHaveTextContent('0.00001 SOL');
			});

			return result;
		};

		it('should state a send the wallet pays the fees of', async () => {
			const { getByTestId } = await renderSend({ sponsored: false });

			expect(getByTestId('message-summary')).toHaveTextContent(en.send.text.send);
		});

		it('should not state a send whose run takes fees the dApp sponsors', async () => {
			const { queryByTestId } = await renderSend({ sponsored: true });

			expect(queryByTestId('message-summary')).not.toBeInTheDocument();
		});
	});

	// A send goes out with the wallet as the fee payer, so a message that names another payer is
	// refused when it is to be sent, and only then: signing it alone keeps the payer it names.
	describe('a message that names another account to pay its fee', () => {
		const decoded: Awaited<ReturnType<typeof decode>> = {
			amount: 1n,
			requiredSignatures: 1,
			feePaidByOthers: true,
			parties: { sources: [], destinations: [], partial: true }
		};

		it('should hold approval when it is to be sent', async () => {
			vi.mocked(decode).mockResolvedValueOnce(decoded);

			const { getByRole, getByText } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByText(en.wallet_connect.text.fee_paid_by_others)).toBeInTheDocument();
			});

			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
		});

		it('should let it be signed when it is only to be signed', async () => {
			vi.mocked(decode).mockResolvedValueOnce(decoded);

			const { getByRole, queryByText } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			const approve = getByRole('button', { name: en.core.text.approve });

			await waitFor(() => {
				expect(approve).toBeEnabled();
			});

			expect(queryByText(en.wallet_connect.text.fee_paid_by_others)).not.toBeInTheDocument();
		});
	});

	// The service tests are handed what the modal passes to signing, so only these cover how the modal
	// derives it: a regression hard-coding a value would leave those green and disable the refusal.
	const approve = async (decoded: Awaited<ReturnType<typeof decode>>) => {
		vi.mocked(sign).mockClear();
		vi.mocked(sign).mockResolvedValueOnce({ success: false });
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

	describe('the simulated flag it hands the signing service', () => {
		it('should be true when the run accounted for every instruction', async () => {
			// A routed swap's router instruction is unreadable and still covered: the transfers its own
			// invocations make carry its index, so the run leaves nothing unknown.
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				simulatedInstructions: true,
				instructions: [{ kind: 'route' }, { kind: 'send', amount: 1n }],
				parties: { sources: [], destinations: [], partial: false }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: true }));
		});

		it('should be false when the run left an instruction unaccounted for', async () => {
			// A stake delegation is the case: the run succeeds, the user's lamports still move by the
			// fee so the preview is not empty, and nothing anywhere describes the delegation.
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				simulatedInstructions: true,
				instructions: [{ kind: 'unknown' }],
				preview: { solDelta: -5_000n, tokenDeltas: [], controlChanges: [] },
				parties: { sources: [], destinations: [], partial: false }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false }));
		});

		it('should be false when the list came from the message rather than a run', async () => {
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				simulatedInstructions: false,
				instructions: [{ kind: 'send', amount: 1n }],
				parties: { sources: [], destinations: [], partial: true }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false }));
		});

		// An empty list never reached this flag before. Whether a run with nothing to list vouches
		// for an instruction nobody read is a decision of its own, not one made by letting it pass.
		it('should be false when the run listed nothing', async () => {
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				simulatedInstructions: true,
				instructions: [],
				parties: { sources: [], destinations: [], partial: false }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false }));
		});

		it('should be false when there was no run at all', async () => {
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				parties: { sources: [], destinations: [], partial: true }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false }));
		});
	});

	// Which refusal the signing service gives for a message it cannot describe depends on whether a
	// run came back at all, described anything or not.
	describe('the run flag it hands the signing service', () => {
		it('should be true when a run came back and left an instruction unaccounted for', async () => {
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				simulatedInstructions: true,
				instructions: [{ kind: 'unknown' }],
				parties: { sources: [], destinations: [], partial: false }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false, simulationRan: true }));
		});

		it('should be false when there was no run at all', async () => {
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				parties: { sources: [], destinations: [], partial: true }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false, simulationRan: false }));
		});
	});

	// Signing refuses an unchecked approval no run came back for, so the review holds the button.
	it('should hold approval on an unchecked approval with no simulation', async () => {
		vi.mocked(decode).mockResolvedValueOnce({
			amount: 1n,
			requiredSignatures: 1,
			destination: mockSolAddress2,
			isApproval: true,
			uncheckedApproval: true,
			parties: { sources: [], destinations: [], partial: true }
		});

		const { getByRole, getByText } = render(SolWalletConnectSignModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
		});

		await waitFor(() => {
			expect(getByText(en.wallet_connect.text.approval_without_simulation)).toBeInTheDocument();
		});

		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('should let an unchecked approval through when a simulation came back', async () => {
		const args = await approve({
			amount: 1n,
			requiredSignatures: 1,
			destination: mockSolAddress2,
			isApproval: true,
			uncheckedApproval: true,
			instructions: [
				{ kind: 'approve', account: mockAtaAddress, amount: 1n, counterparty: mockSolAddress2 }
			],
			simulatedInstructions: true,
			parties: { sources: [], destinations: [], partial: false }
		});

		expect(args).toEqual(expect.objectContaining({ simulationRan: true }));
	});

	// An account the run opens inside another program's instruction with more than its size costs is
	// refused by signing like an ambiguous message, so the review holds the button the same way.
	it('should hold approval when the run opens an account above its rent', async () => {
		vi.mocked(decode).mockResolvedValueOnce({
			amount: 1n,
			requiredSignatures: 1,
			opensAccountBeyondRent: true,
			parties: { sources: [], destinations: [], partial: false }
		});

		const { getByRole, getByText } = render(SolWalletConnectSignModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
		});

		await waitFor(() => {
			expect(getByText(en.wallet_connect.text.cannot_be_shown)).toBeInTheDocument();
		});

		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('should hand signing no over-funded opening when the run found none', async () => {
		const args = await approve({
			amount: 1n,
			requiredSignatures: 1,
			parties: { sources: [], destinations: [], partial: true }
		});

		expect(args).toEqual(expect.objectContaining({ opensAccountBeyondRent: false }));
	});

	// A token batch the run keeps whole has none of its steps listed, and signing refuses it like an
	// ambiguous message, so the review holds the button the same way.
	it('should hold approval when the run keeps a token batch whole', async () => {
		vi.mocked(decode).mockResolvedValueOnce({
			amount: 1n,
			requiredSignatures: 1,
			keepsBatchWhole: true,
			parties: { sources: [], destinations: [], partial: false }
		});

		const { getByRole, getByText } = render(SolWalletConnectSignModal, {
			props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
		});

		await waitFor(() => {
			expect(getByText(en.wallet_connect.text.cannot_be_shown)).toBeInTheDocument();
		});

		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('should hand signing no whole batch when the run kept none', async () => {
		const args = await approve({
			amount: 1n,
			requiredSignatures: 1,
			parties: { sources: [], destinations: [], partial: true }
		});

		expect(args).toEqual(expect.objectContaining({ keepsBatchWhole: false }));
	});

	describe('the wallet handed to another program', () => {
		beforeEach(() => {
			solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
		});

		afterEach(() => {
			solAddressMainnetStore.reset();
		});

		// Signing refuses the run reassigning the wallet as it does an assignment the message states,
		// so the review holds the button the same way.
		it('should hold approval when the run reassigns the wallet', async () => {
			vi.mocked(decode).mockResolvedValueOnce({
				amount: 1n,
				requiredSignatures: 1,
				preview: {
					solDelta: -5_000n,
					tokenDeltas: [],
					controlChanges: [{ account: mockSolAddress, field: 'program', to: mockSolAddress2 }]
				},
				parties: { sources: [], destinations: [], partial: false }
			});

			const { getByRole, getByText } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByText(en.wallet_connect.text.cannot_be_shown)).toBeInTheDocument();
			});

			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
		});

		it('should hand signing no reassignment when the run changes another account', async () => {
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				preview: {
					solDelta: -5_000n,
					tokenDeltas: [],
					controlChanges: [{ account: mockAtaAddress, field: 'delegate', to: mockSolAddress2 }]
				},
				parties: { sources: [], destinations: [], partial: false }
			});

			expect(args).toEqual(expect.objectContaining({ reassignsWallet: false }));
		});
	});

	// Signing holds the message's account creations to the reserve the review was computed with, so
	// what the review allowed is what gets signed.
	describe('the rent reserve it hands the signing service', () => {
		it('should be the reserve the decode read', async () => {
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				rentExemptMinimum: lamports(1_488_440n),
				parties: { sources: [], destinations: [], partial: true }
			});

			expect(args).toEqual(expect.objectContaining({ rentExemptMinimum: 1_488_440n }));
		});

		it('should be none when the decode read none', async () => {
			const args = await approve({
				amount: 1n,
				requiredSignatures: 1,
				parties: { sources: [], destinations: [], partial: true }
			});

			expect(args).toEqual(expect.objectContaining({ rentExemptMinimum: undefined }));
		});
	});

	describe('the programs the run calls that OISY cannot read', () => {
		const decoded = (unreadPrograms: { address: string; name?: string }[]) => ({
			amount: 1n,
			requiredSignatures: 1,
			unreadPrograms,
			parties: { sources: [], destinations: [], partial: false }
		});

		it('should hold approval until the user confirms them, and say so when signing', async () => {
			vi.mocked(sign).mockClear();
			vi.mocked(sign).mockResolvedValueOnce({ success: false });
			vi.mocked(decode).mockResolvedValueOnce(
				decoded([{ address: 'Stake11111111111111111111111111111111111111' }])
			);

			const { getByRole, getByText } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByText(en.wallet_connect.text.unread_programs_one)).toBeInTheDocument();
			});

			const button = getByRole('button', { name: en.core.text.approve });

			expect(button).toBeDisabled();

			await fireEvent.click(getByText(en.wallet_connect.text.unread_programs_acknowledge));

			expect(button).toBeEnabled();

			await fireEvent.click(button);

			await waitFor(() => {
				expect(sign).toHaveBeenCalledOnce();
			});

			expect(vi.mocked(sign).mock.calls[0][0]).toEqual(
				expect.objectContaining({ unreadProgramsAcknowledged: true })
			);
		});

		it('should call a run that reaches only known programs confirmed', async () => {
			vi.mocked(sign).mockClear();
			vi.mocked(sign).mockResolvedValueOnce({ success: false });
			vi.mocked(decode).mockResolvedValueOnce(decoded([]));

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

			expect(vi.mocked(sign).mock.calls[0][0]).toEqual(
				expect.objectContaining({ unreadProgramsAcknowledged: true })
			);
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

	describe('a request Verify flags as a scam', () => {
		const flaggedProps = (method: string) => {
			const { request, ...rest } = props(method);

			return {
				...rest,
				request: {
					...request,
					verifyContext: { verified: { ...request.verifyContext.verified, isScam: true } }
				}
			};
		};

		it('should only offer to reject a transaction, and say why', async () => {
			const { getByRole, getByTestId, queryByRole } = render(SolWalletConnectSignModal, {
				props: flaggedProps(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByTestId('wallet-connect-scam-warning')).toBeInTheDocument();
			});

			expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.reject })).toBeInTheDocument();
		});

		it('should only offer to reject a message, and say why', async () => {
			const { getByRole, getByTestId, queryByRole } = render(SolWalletConnectSignMessageModal, {
				props: flaggedProps(SESSION_REQUEST_SOL_SIGN_MESSAGE)
			});

			await waitFor(() => {
				expect(getByTestId('wallet-connect-scam-warning')).toBeInTheDocument();
			});

			expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.reject })).toBeInTheDocument();
		});
	});
});
