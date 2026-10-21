import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import {
	WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE,
	WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS,
	WALLET_CONNECT_UNCHECKED_SIGNING_POINTER
} from '$lib/constants/test-ids.constants';
import * as walletConnectServices from '$lib/services/wallet-connect.services';
import { solAddressMainnetStore } from '$lib/stores/address.store';
import { walletConnectUncheckedSigningStore } from '$lib/stores/wallet-connect-unchecked-signing.store';
import SolWalletConnectSignMessageModal from '$sol/components/wallet-connect/SolWalletConnectSignMessageModal.svelte';
import SolWalletConnectSignModal from '$sol/components/wallet-connect/SolWalletConnectSignModal.svelte';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_MESSAGE,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { decode, sign } from '$sol/services/wallet-connect.services';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { lamports } from '@solana/kit';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => mockGoto(...args)
}));

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

	it('should hold approval on a message it will not sign', async () => {
		// `sign()` refuses an ambiguous message, so letting the button be pressed would trade a
		// stated reason for a toast over a closed modal.
		vi.mocked(decode).mockResolvedValueOnce({
			amount: 1n,
			ambiguous: true,
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
				simulatedInstructions: true,
				instructions: [],
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

	// Which refusal the signing service gives for a message it cannot describe depends on whether a
	// run came back at all, described anything or not.
	describe('the run flag it hands the signing service', () => {
		it('should be true when a run came back and left an instruction unaccounted for', async () => {
			const args = await approve({
				amount: 1n,
				simulatedInstructions: true,
				instructions: [{ kind: 'unknown' }],
				parties: { sources: [], destinations: [], partial: false }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false, simulationRan: true }));
		});

		it('should be false when there was no run at all', async () => {
			const args = await approve({
				amount: 1n,
				parties: { sources: [], destinations: [], partial: true }
			});

			expect(args).toEqual(expect.objectContaining({ simulated: false, simulationRan: false }));
		});
	});

	// An account the run opens inside another program's instruction with more than its size costs is
	// refused by signing like an ambiguous message, so the review holds the button the same way.
	it('should hold approval when the run opens an account above its rent', async () => {
		vi.mocked(decode).mockResolvedValueOnce({
			amount: 1n,
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
			parties: { sources: [], destinations: [], partial: true }
		});

		expect(args).toEqual(expect.objectContaining({ opensAccountBeyondRent: false }));
	});

	// Signing holds the message's account creations to the reserve the review was computed with, so
	// what the review allowed is what gets signed.
	describe('the rent reserve it hands the signing service', () => {
		it('should be the reserve the decode read', async () => {
			const args = await approve({
				amount: 1n,
				rentExemptMinimum: lamports(1_488_440n),
				parties: { sources: [], destinations: [], partial: true }
			});

			expect(args).toEqual(expect.objectContaining({ rentExemptMinimum: 1_488_440n }));
		});

		it('should be none when the decode read none', async () => {
			const args = await approve({
				amount: 1n,
				parties: { sources: [], destinations: [], partial: true }
			});

			expect(args).toEqual(expect.objectContaining({ rentExemptMinimum: undefined }));
		});
	});

	describe('the programs the run calls that OISY cannot read', () => {
		const decoded = (unreadPrograms: { address: string; name?: string }[]) => ({
			amount: 1n,
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

	describe('the way past a refusal', () => {
		const refused = {
			amount: 1n,
			ambiguous: true,
			parties: { sources: [], destinations: [], partial: true }
		};

		const flagged = (method: string) => ({
			...props(method),
			request: {
				...mockRequest(method),
				verifyContext: {
					verified: {
						verifyUrl: 'https://verify.walletconnect.org',
						validation: 'INVALID',
						origin: 'https://dapp.example',
						isScam: false
					}
				}
			} as unknown as WalletKitTypes.SessionRequest
		});

		beforeEach(() => {
			vi.mocked(sign).mockClear();
			vi.mocked(sign).mockResolvedValue({ success: false });

			mockGoto.mockClear();

			walletConnectUncheckedSigningStore.disable();
		});

		afterEach(() => {
			walletConnectUncheckedSigningStore.disable();
		});

		it('should hold Approve until the acknowledgement is ticked, with the switch on', async () => {
			walletConnectUncheckedSigningStore.enable();

			vi.mocked(decode).mockResolvedValueOnce(refused);

			const { getByRole, getByText } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByText(en.wallet_connect.text.cannot_be_shown_reason)).toBeInTheDocument();
			});

			const approve = getByRole('button', { name: en.core.text.approve });

			expect(approve).toBeDisabled();

			await fireEvent.click(getByText(en.wallet_connect.text.unchecked_signing_acknowledge));

			expect(approve).toBeEnabled();

			await fireEvent.click(approve);

			await waitFor(() => {
				expect(sign).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ acknowledgedRefusals: ['cannot_be_shown'] })
				);
			});
		});

		it('should keep Approve held and point to the switch, with the switch off', async () => {
			vi.mocked(decode).mockResolvedValueOnce(refused);

			const { getByRole, getByTestId, queryByTestId } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_POINTER)).toBeInTheDocument();
			});

			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE)).not.toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
		});

		// Decided when the review opens, so a switch turned on meanwhile does not reach it.
		it('should not gain the offer from a switch turned on after it opened', async () => {
			vi.mocked(decode).mockResolvedValueOnce(refused);

			const { getByTestId, queryByTestId } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			walletConnectUncheckedSigningStore.enable();

			await waitFor(() => {
				expect(getByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_POINTER)).toBeInTheDocument();
			});

			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE)).not.toBeInTheDocument();
		});

		it('should offer no way past a refusal for a site the domain check flagged', async () => {
			walletConnectUncheckedSigningStore.enable();

			vi.mocked(decode).mockResolvedValueOnce(refused);

			const { getByRole, getByText, queryByTestId } = render(SolWalletConnectSignModal, {
				props: flagged(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByText(en.wallet_connect.text.cannot_be_shown)).toBeInTheDocument();
			});

			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE)).not.toBeInTheDocument();
			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_POINTER)).not.toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
		});

		// The wallet itself handed to another program is never signed past: no app needs it.
		it('should offer no way past handing over the wallet the message states, with the switch on', async () => {
			walletConnectUncheckedSigningStore.enable();

			vi.mocked(decode).mockResolvedValueOnce({ ...refused, reassignsWallet: true });

			const { getByRole, getByText, queryByTestId } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByText(en.wallet_connect.text.cannot_be_shown)).toBeInTheDocument();
			});

			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE)).not.toBeInTheDocument();
			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_POINTER)).not.toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
		});

		it('should offer no way past a run handing over the wallet, with the switch on', async () => {
			solAddressMainnetStore.set({ data: mockSolAddress, certified: true });
			walletConnectUncheckedSigningStore.enable();

			vi.mocked(decode).mockResolvedValueOnce({
				amount: 1n,
				preview: {
					solDelta: -5_000n,
					tokenDeltas: [],
					controlChanges: [{ account: mockSolAddress, field: 'program', to: mockSolAddress2 }]
				},
				parties: { sources: [], destinations: [], partial: false }
			});

			const { getByRole, getByText, queryByTestId } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByText(en.wallet_connect.text.cannot_be_shown)).toBeInTheDocument();
			});

			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_ACKNOWLEDGE)).not.toBeInTheDocument();
			expect(queryByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_POINTER)).not.toBeInTheDocument();
			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();

			solAddressMainnetStore.reset();
		});

		it('should refuse on the review an instruction nobody read and no run described', async () => {
			vi.mocked(decode).mockResolvedValueOnce({
				amount: 1n,
				unreviewed: true,
				parties: { sources: [], destinations: [], partial: true }
			});

			const { getByRole, getByText } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByText(en.wallet_connect.text.unreviewed_without_simulation)).toBeInTheDocument();
			});

			expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
		});

		it('should reject the request and open Settings from the pointer', async () => {
			const rejectSpy = vi
				.spyOn(walletConnectServices, 'reject')
				.mockResolvedValue({ success: true });

			vi.mocked(decode).mockResolvedValueOnce(refused);

			const { getByTestId } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			await waitFor(() => {
				expect(getByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS)).toBeInTheDocument();
			});

			await fireEvent.click(getByTestId(WALLET_CONNECT_UNCHECKED_SIGNING_OPEN_SETTINGS));

			await waitFor(() => {
				expect(mockGoto).toHaveBeenCalledOnce();
			});

			expect(rejectSpy).toHaveBeenCalledOnce();
			expect(mockGoto).toHaveBeenCalledWith(expect.stringContaining('/settings'));
		});

		it('should hand on no acknowledgement for a request it would sign anyway', async () => {
			walletConnectUncheckedSigningStore.enable();

			vi.mocked(decode).mockResolvedValueOnce({
				amount: 1n,
				parties: { sources: [], destinations: [], partial: true }
			});

			const { getByRole } = render(SolWalletConnectSignModal, {
				props: props(SESSION_REQUEST_SOL_SIGN_TRANSACTION)
			});

			const approve = getByRole('button', { name: en.core.text.approve });

			await waitFor(() => {
				expect(approve).toBeEnabled();
			});

			await fireEvent.click(approve);

			await waitFor(() => {
				expect(sign).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ acknowledgedRefusals: [] })
				);
			});
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
