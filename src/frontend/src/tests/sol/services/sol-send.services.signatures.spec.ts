import { DEVNET_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import {
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	SOLANA_LAMPORTS_PER_SIGNATURE,
	SOLANA_SEND_REQUIRED_SIGNATURES
} from '$sol/constants/sol.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { sendSol } from '$sol/services/sol-send.services';
import * as accountServices from '$sol/services/spl-accounts.services';
import type { SolAddress } from '$sol/types/address';
import {
	calculateSolPrioritizationFee,
	calculateSolSendFee,
	getSolSendComputeUnitLimit
} from '$sol/utils/fee.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2
} from '$tests/mocks/sol.mock';
import {
	findSetComputeUnitLimitInstructionIndexAndUnits,
	findSetComputeUnitPriceInstructionIndexAndMicroLamports
} from '@solana-program/compute-budget';
import { getCreateAssociatedTokenInstruction } from '@solana-program/token';
import {
	address,
	compileTransactionMessage,
	signTransactionMessageWithSigners,
	type Rpc,
	type SolanaRpcApi
} from '@solana/kit';

// The message is built for real and caught where it is signed, so nothing past that point needs a
// network. The main spec replaces the builders themselves, which leaves no message to count.
vi.mock(import('@solana/kit'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		signTransactionMessageWithSigners: vi.fn()
	};
});

vi.mock('$sol/providers/sol-rpc.providers', () => ({
	solanaHttpRpc: vi.fn(),
	solanaWebSocketRpc: vi.fn()
}));

describe('sol-send.services', () => {
	describe('sendSol', () => {
		const signingReached = new Error('signing reached');

		const mockRpc = (destinationTokenAccounts: { pubkey: SolAddress }[]) =>
			({
				getLatestBlockhash: () => ({
					send: () =>
						Promise.resolve({
							value: {
								blockhash: 'HSR6rNUUeh6Grf2mVzP6u33wEfvXeLt7rNaTqkQoFLtN',
								lastValidBlockHeight: 100n
							}
						})
				}),
				getAccountInfo: () => ({ send: () => Promise.resolve({ value: null }) }),
				getTokenAccountsByOwner: () => ({
					send: () => Promise.resolve({ value: destinationTokenAccounts })
				})
			}) as unknown as Rpc<SolanaRpcApi>;

		const buildMessage = async ({
			token,
			computeUnitPrice = ZERO
		}: {
			token: Token;
			computeUnitPrice?: bigint;
		}): Promise<{
			requiredSignatures: number;
			programs: string[];
			message: Parameters<typeof signTransactionMessageWithSigners>[0];
		}> => {
			await expect(
				sendSol({
					identity: mockIdentity,
					token,
					amount: 1_000_000n,
					computeUnitPrice,
					source: mockSolAddress,
					destination: mockSolAddress2
				})
			).rejects.toThrow(signingReached);

			const [[message]] = vi.mocked(signTransactionMessageWithSigners).mock.calls;

			return {
				requiredSignatures: compileTransactionMessage(message).header.numSignerAccounts,
				programs: message.instructions.map(({ programAddress }) => programAddress),
				message
			};
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(signTransactionMessageWithSigners).mockRejectedValue(signingReached);
			vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc([{ pubkey: mockAtaAddress2 }]));

			// Deriving an associated token account needs the subtle crypto that only a secure context
			// offers, so the addresses are given rather than derived.
			vi.spyOn(accountServices, 'calculateAssociatedTokenAddress').mockImplementation(({ owner }) =>
				Promise.resolve(owner === mockSolAddress ? mockAtaAddress : mockAtaAddress2)
			);
			vi.spyOn(accountServices, 'createAtaInstruction').mockImplementation(
				({ signer, destination, tokenAddress, tokenOwnerAddress }) =>
					Promise.resolve(
						getCreateAssociatedTokenInstruction({
							payer: signer,
							ata: address(mockAtaAddress2),
							owner: address(destination),
							mint: address(tokenAddress),
							tokenProgram: address(tokenOwnerAddress)
						})
					)
			);
		});

		// The send flow quotes its base fee before the message exists, for a fixed number of
		// signatures, so every message it builds has to require exactly that many.
		describe('the signatures its message requires', () => {
			it('should need no signature but the user one on a SOL send', async () => {
				const { requiredSignatures } = await buildMessage({ token: SOLANA_TOKEN });

				expect(requiredSignatures).toBe(SOLANA_SEND_REQUIRED_SIGNATURES);
			});

			it('should need no further signature for a priority fee', async () => {
				const { requiredSignatures, programs } = await buildMessage({
					token: SOLANA_TOKEN,
					computeUnitPrice: 100_000n
				});

				expect(programs).toContain(COMPUTE_BUDGET_PROGRAM_ADDRESS);
				expect(requiredSignatures).toBe(SOLANA_SEND_REQUIRED_SIGNATURES);
			});

			it('should need no signature but the user one on an SPL send', async () => {
				const { requiredSignatures } = await buildMessage({ token: DEVNET_USDC_TOKEN });

				expect(requiredSignatures).toBe(SOLANA_SEND_REQUIRED_SIGNATURES);
			});

			// The account opened for the recipient is funded by the user, whose signature already pays
			// the fee and authorises the transfer.
			it('should need no further signature to open the recipient token account', async () => {
				vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc([]));

				const { requiredSignatures, programs } = await buildMessage({ token: DEVNET_USDC_TOKEN });

				expect(programs).toContain(ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS);
				expect(requiredSignatures).toBe(SOLANA_SEND_REQUIRED_SIGNATURES);
			});
		});

		// What the network charges, read from the signed message as the review reads a dApp's: the
		// base fee of every signature, plus the price over the limit the message states.
		describe('the fee its message is charged', () => {
			const computeUnitPrice = 1_500n;

			const chargedFee = async (token: Token): Promise<bigint> => {
				const { requiredSignatures, message } = await buildMessage({ token, computeUnitPrice });

				const price = findSetComputeUnitPriceInstructionIndexAndMicroLamports(message);
				const limit = findSetComputeUnitLimitInstructionIndexAndUnits(message);

				return (
					SOLANA_LAMPORTS_PER_SIGNATURE * BigInt(requiredSignatures) +
					(calculateSolPrioritizationFee({
						computeUnitPrice: price === null ? undefined : BigInt(price.microLamports),
						computeUnitLimit: limit === null ? undefined : BigInt(limit.units),
						instructionsCount: message.instructions.length
					}) ?? ZERO)
				);
			};

			const quotedFee = (params: Parameters<typeof getSolSendComputeUnitLimit>[0]): bigint =>
				calculateSolSendFee({
					computeUnitPrice,
					computeUnitLimit: getSolSendComputeUnitLimit(params)
				});

			it('should be the fee quoted for a SOL send', async () => {
				await expect(chargedFee(SOLANA_TOKEN)).resolves.toBe(
					quotedFee({ isSpl: false, createsTokenAccount: false })
				);
			});

			it('should be the fee quoted for an SPL send', async () => {
				await expect(chargedFee(DEVNET_USDC_TOKEN)).resolves.toBe(
					quotedFee({ isSpl: true, createsTokenAccount: false })
				);
			});

			it('should be the fee quoted for an SPL send that opens the recipient token account', async () => {
				vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc([]));

				await expect(chargedFee(DEVNET_USDC_TOKEN)).resolves.toBe(
					quotedFee({ isSpl: true, createsTokenAccount: true })
				);
			});

			it('should be the base fee alone when there is no price', async () => {
				const { message } = await buildMessage({ token: SOLANA_TOKEN });

				expect(findSetComputeUnitPriceInstructionIndexAndMicroLamports(message)).toBeNull();
				expect(findSetComputeUnitLimitInstructionIndexAndUnits(message)).toBeNull();
			});
		});
	});
});
