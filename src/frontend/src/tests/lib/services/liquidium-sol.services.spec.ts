import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
import { sendLiquidiumSol } from '$lib/services/liquidium-sol.services';
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
vi.mock('$sol/api/solana.api', () => ({ isBlockhashValid: vi.fn() }));
vi.mock(import('$sol/utils/sol-error.utils'), async (importOriginal) => ({
	...(await importOriginal()),
	isSolSendRefusal: vi.fn()
}));

describe('liquidium-sol.services', () => {
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
