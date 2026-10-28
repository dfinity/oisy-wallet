import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	assertLifiSolTransaction,
	lifiSolTransactionCeiling
} from '$lib/services/lifi-sol-transaction.services';
import { LifiQuoteRejectedError, LifiSolFeeChangedError } from '$lib/types/errors';
import { getAccountData, getSolCreateAccountFee } from '$sol/api/solana.api';
import { LIFI_SOLANA_FEE_WALLET } from '$sol/constants/lifi.constants';
import {
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { simulateSolTransaction } from '$sol/services/sol-simulation.services';
import { calculateAssociatedTokenAddress } from '$sol/services/spl-accounts.services';
import type { SolInstruction } from '$sol/types/sol-instructions';
import type { SolSimulationPreview } from '$sol/types/sol-simulation';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import { parseSolBase64TransactionMessage } from '$sol/utils/sol-transactions.utils';
import {
	mockLifiSolSolToPyusd,
	mockLifiSolSolToUsdc,
	mockLifiSolTransactionMessage,
	mockLifiSolUsdcToSol,
	mockLifiSolUser,
	type LifiSolTransactionFixture
} from '$tests/mocks/lifi-sol-transaction.mock';
import { mockSolAddress2 } from '$tests/mocks/sol.mock';
import type { LiFiStep } from '@lifi/sdk';
import { getMintDecoder, type Extension, type Mint } from '@solana-program/token-2022';
import {
	AccountRole,
	address,
	appendTransactionMessageInstruction,
	blockhash,
	compileTransaction,
	createTransactionMessage,
	getBase64EncodedWireTransaction,
	lamports,
	none,
	pipe,
	setTransactionMessageFeePayer,
	setTransactionMessageLifetimeUsingBlockhash,
	some
} from '@solana/kit';

vi.mock('$sol/api/solana.api', () => ({
	getAccountData: vi.fn(),
	getSolCreateAccountFee: vi.fn()
}));

vi.mock('$sol/services/sol-simulation.services', () => ({
	simulateSolTransaction: vi.fn()
}));

vi.mock(import('$sol/utils/sol-transactions.utils'), async (importOriginal) => ({
	...(await importOriginal()),
	parseSolBase64TransactionMessage: vi.fn()
}));

vi.mock(import('@solana-program/token-2022'), async (importOriginal) => ({
	...(await importOriginal()),
	getMintDecoder: vi.fn()
}));

describe('lifi-sol-transaction.services', () => {
	// What mainnet charged a token account to exist on 2026-10-06.
	const rentExemptMinimum = 1_488_440n;

	const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
	const PYUSD = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo';

	// PYUSD's extensions on chain (2026-10-23), whose accounts are 187 bytes.
	const pyusdExtensions: Extension['__kind'][] = [
		'MintCloseAuthority',
		'PermanentDelegate',
		'TransferFeeConfig',
		'ConfidentialTransferMint',
		'ConfidentialTransferFee',
		'TransferHook',
		'MetadataPointer',
		'TokenMetadata'
	];

	const mintWith = (kinds: Extension['__kind'][]) =>
		({
			extensions: kinds.length > 0 ? some(kinds.map((__kind) => ({ __kind }))) : none()
		}) as unknown as Mint;

	const mockMintDecoder = (kinds: Extension['__kind'][]) =>
		vi.mocked(getMintDecoder).mockReturnValue({
			decode: () => mintWith(kinds)
		} as unknown as ReturnType<typeof getMintDecoder>);

	// SOL → USDC: 1,400,000 units at 263,157 micro-lamports and one signature, then the rent of the
	// wrapped SOL and USDC accounts it creates.
	const solToUsdcNetworkFee = 5_000n + 368_420n;
	const solToUsdcCeiling = solToUsdcNetworkFee + 2n * rentExemptMinimum;

	const ataOf = (mint: string) =>
		calculateAssociatedTokenAddress({
			owner: mockLifiSolUser,
			tokenAddress: mint,
			tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
		});

	// What the run of SOL → USDC shows when it pays the minimum and costs the network fee and the USDC
	// account's rent; the temporary wrapped SOL account's rent comes back when it is closed.
	const solToUsdcPreview = async (): Promise<SolSimulationPreview> => {
		const usdcAccount = await ataOf(USDC);

		return {
			solDelta: -100_000_000n - solToUsdcNetworkFee - rentExemptMinimum,
			tokenDeltas: [
				{
					account: usdcAccount,
					tokenAddress: USDC,
					decimals: 6,
					delta: mockLifiSolSolToUsdc.toAmountMin
				}
			],
			controlChanges: [],
			createdAccounts: [{ account: usdcAccount, owner: mockLifiSolUser }]
		};
	};

	const assertFixture = ({
		fixture: { quote, request, toAmountMin },
		reviewedCeiling = solToUsdcCeiling
	}: {
		fixture: LifiSolTransactionFixture;
		reviewedCeiling?: bigint;
	}) =>
		assertLifiSolTransaction({
			quote,
			request,
			displayedToAmountMin: toAmountMin,
			reviewedCeiling
		});

	const mockFixture = (fixture: LifiSolTransactionFixture) =>
		vi
			.mocked(parseSolBase64TransactionMessage)
			.mockResolvedValue(mockLifiSolTransactionMessage(fixture));

	beforeAll(() => {
		// The derivation of associated token accounts hashes, which the kit refuses outside a secure
		// context.
		vi.stubGlobal('isSecureContext', true);
	});

	beforeEach(async () => {
		vi.clearAllMocks();

		vi.mocked(getSolCreateAccountFee).mockResolvedValue(lamports(rentExemptMinimum));
		mockFixture(mockLifiSolSolToUsdc);
		vi.mocked(simulateSolTransaction).mockResolvedValue({
			preview: await solToUsdcPreview(),
			parties: { sources: [], destinations: [], partial: false },
			unreadPrograms: []
		});
	});

	afterAll(() => {
		vi.unstubAllGlobals();
	});

	describe('lifiSolTransactionCeiling', () => {
		it('should add the rent of an SPL Token account at its size', async () => {
			await expect(
				lifiSolTransactionCeiling({
					networkFee: 10_000n,
					createdAccounts: [
						{ account: mockSolAddress2, mint: USDC, tokenProgram: TOKEN_PROGRAM_ADDRESS }
					],
					rentExemptMinimum
				})
			).resolves.toBe(10_000n + rentExemptMinimum);

			expect(getAccountData).not.toHaveBeenCalled();
		});

		// 187 bytes cost 315 of the 293 bytes' worth a 165-byte account costs, its header included.
		it("should add the rent of a Token-2022 account at the size its mint's extensions give", async () => {
			vi.mocked(getAccountData).mockResolvedValue(new Uint8Array([1]));
			mockMintDecoder(pyusdExtensions);

			await expect(
				lifiSolTransactionCeiling({
					networkFee: 10_000n,
					createdAccounts: [
						{ account: mockSolAddress2, mint: PYUSD, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }
					],
					rentExemptMinimum
				})
			).resolves.toBe(10_000n + 1_600_200n);

			expect(getAccountData).toHaveBeenCalledExactlyOnceWith({
				address: PYUSD,
				network: 'mainnet'
			});
		});

		it('should size a Token-2022 account of a mint without extensions', async () => {
			vi.mocked(getAccountData).mockResolvedValue(new Uint8Array([1]));
			mockMintDecoder([]);

			await expect(
				lifiSolTransactionCeiling({
					networkFee: ZERO,
					createdAccounts: [
						{ account: mockSolAddress2, mint: PYUSD, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }
					],
					rentExemptMinimum
				})
			).resolves.toBe((rentExemptMinimum * (128n + 170n)) / (128n + 165n));
		});

		it('should be the network fee alone without accounts created', async () => {
			await expect(
				lifiSolTransactionCeiling({ networkFee: 10_000n, createdAccounts: [], rentExemptMinimum })
			).resolves.toBe(10_000n);
		});

		describe('a Token-2022 mint whose accounts cannot be sized', () => {
			const ceilingFor = () =>
				lifiSolTransactionCeiling({
					networkFee: 10_000n,
					createdAccounts: [
						{ account: mockSolAddress2, mint: USDC, tokenProgram: TOKEN_PROGRAM_ADDRESS },
						{ account: mockSolAddress2, mint: PYUSD, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }
					],
					rentExemptMinimum
				});

			it('should give none for a mint that does not exist', async () => {
				vi.mocked(getAccountData).mockResolvedValue(undefined);

				await expect(ceilingFor()).resolves.toBeUndefined();
			});

			it('should give none for a mint that cannot be read', async () => {
				vi.mocked(getAccountData).mockRejectedValue(new Error('rpc'));

				await expect(ceilingFor()).resolves.toBeUndefined();
			});

			it('should give none for a mint that does not decode', async () => {
				vi.mocked(getAccountData).mockResolvedValue(new Uint8Array([1]));
				vi.mocked(getMintDecoder).mockReturnValue({
					decode: () => {
						throw new Error('Union variant out of range.');
					}
				} as unknown as ReturnType<typeof getMintDecoder>);

				await expect(ceilingFor()).resolves.toBeUndefined();
			});

			it('should give none for a mint with an extension the sizing does not place', async () => {
				vi.mocked(getAccountData).mockResolvedValue(new Uint8Array([1]));
				mockMintDecoder(['PermissionedBurn']);

				await expect(ceilingFor()).resolves.toBeUndefined();
			});
		});
	});

	describe('assertLifiSolTransaction', () => {
		it('should accept a LI.FI transaction that binds and simulates within the bounds', async () => {
			await expect(assertFixture({ fixture: mockLifiSolSolToUsdc })).resolves.toBeUndefined();
		});

		it("should simulate LI.FI's own bytes, with their blockhash, at one slot", async () => {
			await assertFixture({ fixture: mockLifiSolSolToUsdc });

			expect(simulateSolTransaction).toHaveBeenCalledExactlyOnceWith({
				base64EncodedTransactionMessage: mockLifiSolSolToUsdc.quote.transactionRequest?.data,
				transactionMessage: mockLifiSolTransactionMessage(mockLifiSolSolToUsdc),
				address: mockLifiSolUser,
				network: 'mainnet',
				rentExemptMinimumRequest: expect.any(Promise),
				replaceRecentBlockhash: false,
				consistentSnapshot: true
			});

			await expect(
				vi.mocked(simulateSolTransaction).mock.calls[0]?.[0].rentExemptMinimumRequest
			).resolves.toBe(rentExemptMinimum);
		});

		it('should decompile the message with the lookup tables it reads', async () => {
			await assertFixture({ fixture: mockLifiSolSolToUsdc });

			expect(parseSolBase64TransactionMessage).toHaveBeenCalledExactlyOnceWith({
				transactionMessage: mockLifiSolSolToUsdc.quote.transactionRequest?.data,
				rpc: expect.anything()
			});
		});

		it('should refuse a quote without a transaction', async () => {
			await expect(
				assertFixture({
					fixture: {
						...mockLifiSolSolToUsdc,
						quote: { ...mockLifiSolSolToUsdc.quote, transactionRequest: {} }
					}
				})
			).rejects.toThrow(LifiQuoteRejectedError);
		});

		// A transaction of the user's with one instruction, and another signer if given.
		const wireTransaction = ({
			version,
			signer
		}: {
			version: 'legacy' | 0;
			signer?: string;
		}): LiFiStep =>
			({
				transactionRequest: {
					data: getBase64EncodedWireTransaction(
						compileTransaction(
							pipe(
								createTransactionMessage({ version }),
								(message) => setTransactionMessageFeePayer(address(mockLifiSolUser), message),
								(message) =>
									setTransactionMessageLifetimeUsingBlockhash(
										{
											blockhash: blockhash('EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N'),
											lastValidBlockHeight: ZERO
										},
										message
									),
								(message) =>
									appendTransactionMessageInstruction(
										{
											programAddress: address(SYSTEM_PROGRAM_ADDRESS),
											...(signer !== undefined && {
												accounts: [{ address: address(signer), role: AccountRole.READONLY_SIGNER }]
											})
										},
										message
									)
							)
						)
					)
				}
			}) as unknown as LiFiStep;

		it('should refuse a transaction that is not a version 0 message', async () => {
			await expect(
				assertFixture({
					fixture: { ...mockLifiSolSolToUsdc, quote: wireTransaction({ version: 'legacy' }) }
				})
			).rejects.toThrow(LifiQuoteRejectedError);

			expect(parseSolBase64TransactionMessage).not.toHaveBeenCalled();
		});

		it('should refuse a transaction for another signer than the user', async () => {
			await expect(
				assertFixture({
					fixture: {
						...mockLifiSolSolToUsdc,
						request: { ...mockLifiSolSolToUsdc.request, fromAddress: mockSolAddress2 }
					}
				})
			).rejects.toThrow(LifiQuoteRejectedError);

			expect(parseSolBase64TransactionMessage).not.toHaveBeenCalled();
		});

		it('should refuse a transaction for another signer besides the user', async () => {
			await expect(
				assertFixture({
					fixture: {
						...mockLifiSolSolToUsdc,
						quote: wireTransaction({ version: 0, signer: mockSolAddress2 })
					}
				})
			).rejects.toThrow(LifiQuoteRejectedError);

			expect(parseSolBase64TransactionMessage).not.toHaveBeenCalled();
		});

		it('should go on to the instructions of a transaction the user alone signs', async () => {
			await expect(
				assertFixture({
					fixture: { ...mockLifiSolSolToUsdc, quote: wireTransaction({ version: 0 }) }
				})
			).resolves.toBeUndefined();

			expect(parseSolBase64TransactionMessage).toHaveBeenCalledOnce();
		});

		it('should refuse a transaction whose instructions do not bind, before simulating it', async () => {
			await expect(
				assertLifiSolTransaction({
					quote: mockLifiSolSolToUsdc.quote,
					request: mockLifiSolSolToUsdc.request,
					displayedToAmountMin: mockLifiSolSolToUsdc.toAmountMin + 1n,
					reviewedCeiling: solToUsdcCeiling
				})
			).rejects.toThrow(LifiQuoteRejectedError);

			expect(simulateSolTransaction).not.toHaveBeenCalled();
		});

		// The fee wallet's USDC account is derived, so the fixture's transfer to it binds.
		it('should bind the fee of an SPL source to the derived fee account', async () => {
			mockFixture(mockLifiSolUsdcToSol);
			vi.mocked(simulateSolTransaction).mockResolvedValue({
				preview: {
					solDelta: mockLifiSolUsdcToSol.toAmountMin,
					tokenDeltas: [
						{
							account: await ataOf(USDC),
							tokenAddress: USDC,
							decimals: 6,
							delta: -20_000_000n
						}
					],
					controlChanges: []
				},
				parties: { sources: [], destinations: [], partial: false },
				unreadPrograms: []
			});

			await expect(assertFixture({ fixture: mockLifiSolUsdcToSol })).resolves.toBeUndefined();
		});

		// The program the transfer calls decides which of the fee wallet's accounts it must pay.
		it("should bind a Token-2022 source's fee to the fee account under Token-2022", async () => {
			const feeAccount = await calculateAssociatedTokenAddress({
				owner: LIFI_SOLANA_FEE_WALLET,
				tokenAddress: USDC,
				tokenOwnerAddress: TOKEN_2022_PROGRAM_ADDRESS
			});

			const message = mockLifiSolTransactionMessage(mockLifiSolUsdcToSol);

			// The fixture's fee transfer, the fourth instruction, moved to Token-2022.
			vi.mocked(parseSolBase64TransactionMessage).mockResolvedValue({
				...message,
				instructions: [...message.instructions].map((instruction: SolInstruction, index) =>
					index === 3
						? {
								...instruction,
								programAddress: address(TOKEN_2022_PROGRAM_ADDRESS),
								accounts: (instruction.accounts ?? []).map((meta, metaIndex) =>
									metaIndex === 2 ? { ...meta, address: address(feeAccount) } : meta
								)
							}
						: instruction
				)
			} as CompilableTransactionMessage);
			vi.mocked(simulateSolTransaction).mockResolvedValue({
				preview: {
					solDelta: mockLifiSolUsdcToSol.toAmountMin,
					tokenDeltas: [],
					controlChanges: []
				},
				parties: { sources: [], destinations: [], partial: false },
				unreadPrograms: []
			});

			await expect(assertFixture({ fixture: mockLifiSolUsdcToSol })).resolves.toBeUndefined();
		});

		describe('ceiling', () => {
			it('should accept a ceiling no higher than the one reviewed', async () => {
				await expect(
					assertFixture({ fixture: mockLifiSolSolToUsdc, reviewedCeiling: solToUsdcCeiling })
				).resolves.toBeUndefined();
			});

			it('should carry a ceiling above the one reviewed back, without simulating', async () => {
				const error = await assertFixture({
					fixture: mockLifiSolSolToUsdc,
					reviewedCeiling: solToUsdcCeiling - 1n
				}).catch((err: unknown) => err);

				expect(error).toBeInstanceOf(LifiSolFeeChangedError);
				expect((error as LifiSolFeeChangedError).ceiling).toBe(solToUsdcCeiling);
				expect(simulateSolTransaction).not.toHaveBeenCalled();
			});

			// 1,400,000 units at 200,018 micro-lamports, the wrapped SOL and USDC accounts at 165 bytes
			// and the PYUSD one at 187.
			it("should size a Token-2022 account from its mint's extensions", async () => {
				mockFixture(mockLifiSolSolToPyusd);
				vi.mocked(getAccountData).mockResolvedValue(new Uint8Array([1]));
				mockMintDecoder(pyusdExtensions);

				const error = await assertFixture({
					fixture: mockLifiSolSolToPyusd,
					reviewedCeiling: ZERO
				}).catch((err: unknown) => err);

				expect((error as LifiSolFeeChangedError).ceiling).toBe(
					5_000n + 280_026n + 2n * rentExemptMinimum + 1_600_200n
				);
				expect(getAccountData).toHaveBeenCalledExactlyOnceWith({
					address: PYUSD,
					network: 'mainnet'
				});
			});

			it('should refuse a transaction creating an account whose rent cannot be bounded', async () => {
				mockFixture(mockLifiSolSolToPyusd);
				vi.mocked(getAccountData).mockResolvedValue(undefined);

				await expect(
					assertFixture({ fixture: mockLifiSolSolToPyusd, reviewedCeiling: 10n ** 18n })
				).rejects.toThrow(LifiQuoteRejectedError);

				expect(simulateSolTransaction).not.toHaveBeenCalled();
			});
		});

		describe('simulation', () => {
			it('should refuse when the simulation fails or times out', async () => {
				vi.mocked(simulateSolTransaction).mockResolvedValue(undefined);

				await expect(assertFixture({ fixture: mockLifiSolSolToUsdc })).rejects.toThrow(
					LifiQuoteRejectedError
				);
			});

			it('should hold the run to the ceiling of the transaction', async () => {
				const preview = await solToUsdcPreview();

				vi.mocked(simulateSolTransaction).mockResolvedValue({
					preview: { ...preview, solDelta: -100_000_000n - solToUsdcCeiling - 1n },
					parties: { sources: [], destinations: [], partial: false },
					unreadPrograms: []
				});

				await expect(
					assertFixture({ fixture: mockLifiSolSolToUsdc, reviewedCeiling: solToUsdcCeiling + 1n })
				).rejects.toThrow(LifiQuoteRejectedError);
			});

			it("should hold the user's wrapped SOL account to the derived one", async () => {
				const { solDelta = ZERO, ...preview } = await solToUsdcPreview();
				const wrappedSolAccount = await ataOf(WSOL_TOKEN.address);

				vi.mocked(simulateSolTransaction).mockResolvedValue({
					preview: {
						...preview,
						solDelta: solDelta + rentExemptMinimum,
						closedAccounts: [{ account: wrappedSolAccount, lamports: rentExemptMinimum }]
					},
					parties: { sources: [], destinations: [], partial: false },
					unreadPrograms: []
				});

				await expect(assertFixture({ fixture: mockLifiSolSolToUsdc })).resolves.toBeUndefined();
			});
		});
	});
});
