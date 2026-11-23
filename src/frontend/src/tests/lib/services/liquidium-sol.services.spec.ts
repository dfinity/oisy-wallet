import {
	IC_CKSOL_LEDGER_CANISTER_ID,
	IC_CKSOL_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.sol.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { minterInfo } from '$icp/api/cksol-minter.api';
import { transactionFee } from '$icp/api/icrc-ledger.api';
import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
import {
	getLiquidiumSolNativeOutflowMinimum,
	sendLiquidiumSol
} from '$lib/services/liquidium-sol.services';
import {
	LiquidiumSolBlockhashExpiredError,
	LiquidiumSolTransferRefusedError
} from '$lib/types/errors';
import { isBlockhashValid } from '$sol/api/solana.api';
import { sendSol } from '$sol/services/sol-send.services';
import { SolanaNetworks } from '$sol/types/network';
import { isSolSendRefusal } from '$sol/utils/sol-error.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

vi.mock('$sol/services/sol-send.services', () => ({ sendSol: vi.fn() }));
vi.mock('$icp/api/cksol-minter.api', () => ({ minterInfo: vi.fn() }));
vi.mock(import('$icp/api/icrc-ledger.api'), async (importOriginal) => ({
	...(await importOriginal()),
	transactionFee: vi.fn()
}));
vi.mock('$sol/api/solana.api', () => ({ isBlockhashValid: vi.fn() }));
vi.mock(import('$sol/utils/sol-error.utils'), async (importOriginal) => ({
	...(await importOriginal()),
	isSolSendRefusal: vi.fn()
}));

describe('liquidium-sol.services', () => {
	describe('getLiquidiumSolNativeOutflowMinimum', () => {
		// Mainnet today: a 0.002 SOL minimum withdrawal and a 500-lamport ckSOL ledger fee.
		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(minterInfo).mockResolvedValue({
				deposit_sol_fee: 45_000_000_000n,
				balance: 995_500n,
				withdrawal_fee: 1_000_000n,
				minimum_deposit_amount: 20_000_000n,
				deposit_sol_required_cycles: 1_000_000_000_000n,
				nonce_accounts: [],
				minimum_withdrawal_amount: 2_000_000n,
				minter_address: [],
				automatic_deposit_fee: [],
				collected_automatic_deposit_fees: []
			});
			vi.mocked(transactionFee).mockResolvedValue(500n);
		});

		it("is the minter's minimum withdrawal plus two ckSOL ledger fees", async () => {
			await expect(getLiquidiumSolNativeOutflowMinimum()).resolves.toBe(2_001_000n);
		});

		it('reads the ckSOL minter and ledger uncertified', async () => {
			await getLiquidiumSolNativeOutflowMinimum();

			expect(minterInfo).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					minterCanisterId: IC_CKSOL_MINTER_CANISTER_ID,
					certified: false
				})
			);
			expect(transactionFee).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					ledgerCanisterId: IC_CKSOL_LEDGER_CANISTER_ID,
					certified: false
				})
			);
		});

		it('fails when the minter cannot be read', async () => {
			const err = new Error('minter unreachable');
			vi.mocked(minterInfo).mockRejectedValue(err);

			await expect(getLiquidiumSolNativeOutflowMinimum()).rejects.toBe(err);
		});
	});

	describe('sendLiquidiumSol', () => {
		const signature = mockSolSignature();
		const blockhash = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N';
		const destination = 'GXVewvv6HehcLFYCmwpqh5CrMjqN9zJ8rqzGq3HEt9Ax';
		const beforeBroadcast = vi.fn();

		// As `sendSol` does: sign, `beforeBroadcast`, then the broadcast and its confirmation, failing
		// with `err` at the step `failAt`.
		const mockSendSol = ({
			failAt,
			err
		}: { failAt?: 'sign' | 'send' | 'confirm'; err?: unknown } = {}) =>
			vi.mocked(sendSol).mockImplementation(async ({ progress, beforeBroadcast: hook }) => {
				progress?.(ProgressStepsSendSol.SIGN);

				if (failAt === 'sign') {
					throw err;
				}

				await hook?.({ signature, blockhash });

				progress?.(ProgressStepsSendSol.SEND);

				if (failAt === 'send') {
					throw err;
				}

				progress?.(ProgressStepsSendSol.CONFIRM);

				if (failAt === 'confirm') {
					throw err;
				}

				progress?.(ProgressStepsSendSol.DONE);

				return signature;
			});

		const send = () =>
			sendLiquidiumSol({
				identity: mockIdentity,
				source: mockSolAddress,
				destination,
				amount: 30_000_000n,
				prioritizationFee: 1_000n,
				beforeBroadcast
			});

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(isBlockhashValid).mockResolvedValue({ slot: 42n, valid: true });
			vi.mocked(isSolSendRefusal).mockReturnValue(false);
			beforeBroadcast.mockResolvedValue(undefined);
		});

		it('sends the amount as native SOL from the source to the destination', async () => {
			mockSendSol();

			await expect(send()).resolves.toBe(signature);

			expect(sendSol).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					identity: mockIdentity,
					token: SOLANA_TOKEN,
					amount: 30_000_000n,
					prioritizationFee: 1_000n,
					destination,
					source: mockSolAddress
				})
			);
		});

		it('hands the signature, the blockhash and a slot where it is valid over before the broadcast', async () => {
			mockSendSol();

			await send();

			expect(isBlockhashValid).toHaveBeenCalledExactlyOnceWith({
				blockhash,
				network: SolanaNetworks.mainnet
			});
			expect(beforeBroadcast).toHaveBeenCalledExactlyOnceWith({
				txid: signature,
				solBlockhash: { blockhash, slot: 42n }
			});
		});

		it('sends nothing when the blockhash is no longer valid, and says so', async () => {
			vi.mocked(isBlockhashValid).mockResolvedValue({ slot: 42n, valid: false });
			mockSendSol();

			const refused = await send().catch((e: unknown) => e);

			expect(refused).toBeInstanceOf(LiquidiumSolTransferRefusedError);
			expect((refused as LiquidiumSolTransferRefusedError).cause).toBeInstanceOf(
				LiquidiumSolBlockhashExpiredError
			);
			expect(beforeBroadcast).not.toHaveBeenCalled();
		});

		it('reports a failure before the broadcast as refused, with its cause', async () => {
			const err = new Error('signing failed');
			mockSendSol({ failAt: 'sign', err });

			const refused = await send().catch((e: unknown) => e);

			expect(refused).toBeInstanceOf(LiquidiumSolTransferRefusedError);
			expect((refused as LiquidiumSolTransferRefusedError).cause).toBe(err);
		});

		it('reports the node refusing the broadcast as refused', async () => {
			vi.mocked(isSolSendRefusal).mockReturnValue(true);
			mockSendSol({ failAt: 'send', err: new Error('preflight failure') });

			await expect(send()).rejects.toBeInstanceOf(LiquidiumSolTransferRefusedError);
		});

		it('passes on a broadcast failure that is not a refusal, since the SOL may have left', async () => {
			const err = new Error('connection reset');
			mockSendSol({ failAt: 'send', err });

			await expect(send()).rejects.toBe(err);
		});

		it('passes on any failure while confirming, even one shaped like a refusal', async () => {
			const err = new Error('preflight failure');
			vi.mocked(isSolSendRefusal).mockReturnValue(true);
			mockSendSol({ failAt: 'confirm', err });

			await expect(send()).rejects.toBe(err);
		});
	});
});
