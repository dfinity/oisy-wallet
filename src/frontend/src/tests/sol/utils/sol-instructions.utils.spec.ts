import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolInstruction, SolRpcInstruction } from '$sol/types/sol-instructions';
import type { SplTokenAddress } from '$sol/types/spl';
import * as solInstructionsAtaUtils from '$sol/utils/sol-instructions-ata.utils';
import { parseSolAtaInstruction } from '$sol/utils/sol-instructions-ata.utils';
import * as solInstructionsComputeBudgetUtils from '$sol/utils/sol-instructions-compute-budget.utils';
import { parseSolComputeBudgetInstruction } from '$sol/utils/sol-instructions-compute-budget.utils';
import * as solInstructionsSystemUtils from '$sol/utils/sol-instructions-system.utils';
import { parseSolSystemInstruction } from '$sol/utils/sol-instructions-system.utils';
import * as solInstructionsToken2022Utils from '$sol/utils/sol-instructions-token-2022.utils';
import { parseSolToken2022Instruction } from '$sol/utils/sol-instructions-token-2022.utils';
import * as solInstructionsTokenUtils from '$sol/utils/sol-instructions-token.utils';
import { parseSolTokenInstruction } from '$sol/utils/sol-instructions-token.utils';
import { mapSolInstruction, mapSolParsedInstruction } from '$sol/utils/sol-instructions.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolParsedTransactionMessage } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { assertNonNullish } from '@dfinity/utils';
import {
	getApproveCheckedInstruction,
	getApproveInstruction,
	getCreateAssociatedTokenIdempotentInstruction,
	getCreateAssociatedTokenInstruction,
	getTransferCheckedInstruction,
	TokenInstruction
} from '@solana-program/token';
import {
	getApproveCheckedInstruction as getToken2022ApproveCheckedInstruction,
	getApproveInstruction as getToken2022ApproveInstruction,
	getTransferCheckedInstruction as getToken2022TransferCheckedInstruction
} from '@solana-program/token-2022';
import {
	address,
	createNoopSigner,
	type Base58EncodedBytes,
	type Rpc,
	type SolanaRpcApi
} from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock('$sol/providers/sol-rpc.providers', () => ({
	solanaHttpRpc: vi.fn(),
	solanaWebSocketRpc: vi.fn()
}));

describe('sol-instructions.utils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('mapSolParsedInstruction', () => {
		const network: SolanaNetworkType = 'mainnet';

		const mockInstruction: SolRpcInstruction = {
			parsed: { type: 'mock-type', info: {} },
			program: 'mock-program',
			programId: address(mockSolAddress),
			programAddress: address(mockSolAddress)
		};

		let originalMapGet = Map.prototype.get;

		beforeEach(() => {
			vi.clearAllMocks();

			originalMapGet = Map.prototype.get;

			vi.spyOn(Map.prototype, 'get').mockReturnValue(undefined);
		});

		afterEach(() => {
			Map.prototype.get = originalMapGet;
		});

		it('should return undefined if instruction does not have parsed data', async () => {
			const instruction: SolRpcInstruction = {
				data: 'mock-data' as Base58EncodedBytes,
				programId: address(SYSTEM_PROGRAM_ADDRESS),
				programAddress: address(SYSTEM_PROGRAM_ADDRESS),
				accounts: [address(mockSolAddress), address(mockSolAddress2)]
			};

			const result = await mapSolParsedInstruction({
				identity: mockIdentity,
				instruction,
				network
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined if info is nullish', async () => {
			const instruction: SolRpcInstruction = {
				...mockInstruction,
				parsed: { ...mockInstruction.parsed, info: undefined }
			};

			const result = await mapSolParsedInstruction({
				identity: mockIdentity,
				instruction,
				network
			});

			expect(result).toBeUndefined();
		});

		it('should log a warning if the program address is unrecognized', async () => {
			const instruction: SolRpcInstruction = {
				...mockInstruction,
				programId: address(mockSolAddress),
				programAddress: address(mockSolAddress)
			};

			const result = await mapSolParsedInstruction({
				identity: mockIdentity,
				instruction,
				network
			});

			expect(result).toBeUndefined();
			expect(console.warn).toHaveBeenCalledWith(
				`Could not map Solana instruction of type ${instruction.parsed.type} for program ${instruction.programAddress}`,
				instruction
			);
		});

		describe('with a System parsed instruction', () => {
			it('should map a valid `createAccount` instruction', async () => {
				const mockCreateAccountInstruction: SolRpcInstruction = {
					...mockInstruction,
					programAddress: address(SYSTEM_PROGRAM_ADDRESS),
					parsed: {
						type: 'createAccount',
						info: {
							newAccount: 'toAddress',
							lamports: 100n,
							source: 'fromAddress'
						}
					}
				};

				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: mockCreateAccountInstruction,
					network
				});

				expect(result).toEqual({
					value: 100n,
					from: 'fromAddress',
					to: 'toAddress'
				});
			});

			it('should map a valid `transfer` instruction', async () => {
				const mockTransferInstruction: SolRpcInstruction = {
					...mockInstruction,
					programAddress: address(SYSTEM_PROGRAM_ADDRESS),
					parsed: {
						type: 'transfer',
						info: {
							destination: 'toAddress',
							lamports: 100n,
							source: 'fromAddress'
						}
					}
				};

				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: mockTransferInstruction,
					network
				});

				expect(result).toEqual({
					value: 100n,
					from: 'fromAddress',
					to: 'toAddress'
				});
			});

			it('should return undefined for non-mapped instruction', async () => {
				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: {
						...mockInstruction,
						programAddress: address(SYSTEM_PROGRAM_ADDRESS),
						parsed: { type: 'other-type', info: {} }
					},
					network
				});

				expect(result).toBeUndefined();
			});
		});

		describe('with a Token parsed instruction', () => {
			let mockGetAccountInfo: MockInstance;

			const mockTokenAddress: SplTokenAddress = JUP_TOKEN.address;

			const mockTokenInstruction: SolRpcInstruction = {
				...mockInstruction,
				programAddress: address(TOKEN_PROGRAM_ADDRESS),
				parsed: {
					type: 'transfer',
					info: {
						destination: mockSolAddress2,
						amount: '50',
						source: mockSolAddress
					}
				}
			};

			beforeEach(() => {
				mockGetAccountInfo = vi.fn(() => ({
					send: vi.fn(() => ({
						value: {
							data: { parsed: { info: { mint: mockTokenAddress } } }
						}
					}))
				}));

				const mockRpc = { getAccountInfo: mockGetAccountInfo } as unknown as Rpc<SolanaRpcApi>;

				vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc);
			});

			describe('with `transfer` instruction', () => {
				it('should map a valid `transfer` instruction', async () => {
					const result = await mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockTokenInstruction,
						network
					});

					expect(result).toEqual({
						value: 50n,
						from: mockSolAddress,
						to: mockSolAddress2,
						tokenAddress: mockTokenAddress
					});

					expect(mockGetAccountInfo).toHaveBeenCalledExactlyOnceWith(mockSolAddress, {
						encoding: 'jsonParsed'
					});
				});

				it('should fetch token address from destination account info if not provided by source info', async () => {
					mockGetAccountInfo.mockReturnValueOnce({
						send: vi.fn(() => ({ value: { data: {} } }))
					});

					const result = await mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockTokenInstruction,
						network
					});

					expect(result).toEqual({
						value: 50n,
						from: mockSolAddress,
						to: mockSolAddress2,
						tokenAddress: mockTokenAddress
					});

					expect(mockGetAccountInfo).toHaveBeenCalledTimes(2);
					expect(mockGetAccountInfo).toHaveBeenNthCalledWith(1, mockSolAddress, {
						encoding: 'jsonParsed'
					});
					expect(mockGetAccountInfo).toHaveBeenNthCalledWith(2, mockSolAddress2, {
						encoding: 'jsonParsed'
					});
				});

				it('should not call getAccountInfo for `transfer` instruction if token address is already mapped', async () => {
					await expect(
						mapSolParsedInstruction({
							identity: mockIdentity,
							instruction: mockTokenInstruction,
							network,
							addressToToken: { [mockSolAddress]: mockTokenAddress }
						})
					).resolves.toEqual({
						value: 50n,
						from: mockSolAddress,
						to: mockSolAddress2,
						tokenAddress: mockTokenAddress
					});

					expect(mockGetAccountInfo).not.toHaveBeenCalled();

					await expect(
						mapSolParsedInstruction({
							identity: mockIdentity,
							instruction: mockTokenInstruction,
							network,
							addressToToken: { [mockSolAddress2]: mockTokenAddress }
						})
					).resolves.toEqual({
						value: 50n,
						from: mockSolAddress,
						to: mockSolAddress2,
						tokenAddress: mockTokenAddress
					});
				});
			});

			it('should map a valid `transferChecked` instruction', async () => {
				const mockTransferCheckedInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'transferChecked',
						info: {
							destination: mockSolAddress2,
							tokenAmount: {
								amount: '50'
							},
							source: mockSolAddress,
							mint: mockTokenAddress
						}
					}
				};

				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: mockTransferCheckedInstruction,
					network
				});

				expect(result).toEqual({
					value: 50n,
					from: mockSolAddress,
					to: mockSolAddress2,
					tokenAddress: mockTokenAddress
				});
			});

			it('should map a valid `closeAccount` instruction', async () => {
				const mockCloseAccountInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'closeAccount',
						info: {
							destination: mockSolAddress2,
							account: mockSolAddress
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockCloseAccountInstruction,
						network
					})
				).resolves.toEqual({
					value: ZERO,
					from: mockSolAddress,
					to: mockSolAddress2
				});

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockCloseAccountInstruction,
						network,
						cumulativeBalances: { [mockSolAddress]: 100n }
					})
				).resolves.toEqual({
					value: 100n,
					from: mockSolAddress,
					to: mockSolAddress2
				});

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockCloseAccountInstruction,
						network,
						cumulativeBalances: { [mockSolAddress2]: 100n }
					})
				).resolves.toEqual({
					value: -100n,
					from: mockSolAddress,
					to: mockSolAddress2
				});
			});

			it('should map a valid `mintTo` instruction', async () => {
				const mockMintToInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'mintTo',
						info: {
							account: mockSolAddress,
							mint: mockTokenAddress,
							amount: '12345'
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockMintToInstruction,
						network
					})
				).resolves.toEqual({
					value: 12345n,
					from: mockTokenAddress,
					to: mockSolAddress,
					tokenAddress: mockTokenAddress
				});
			});

			it('should map a valid `burn` instruction', async () => {
				const mockBurnInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'burn',
						info: {
							account: mockSolAddress,
							mint: mockTokenAddress,
							amount: '12345'
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockBurnInstruction,
						network
					})
				).resolves.toEqual({
					value: 12345n,
					from: mockSolAddress,
					to: mockTokenAddress,
					tokenAddress: mockTokenAddress
				});
			});

			it('should map a valid `mintToChecked` instruction', async () => {
				const mockMintToCheckedInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'mintToChecked',
						info: {
							account: mockSolAddress,
							mint: mockTokenAddress,
							tokenAmount: { amount: '12345' }
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockMintToCheckedInstruction,
						network
					})
				).resolves.toEqual({
					value: 12345n,
					from: mockTokenAddress,
					to: mockSolAddress,
					tokenAddress: mockTokenAddress
				});
			});

			it('should map a valid `burnChecked` instruction', async () => {
				const mockBurnCheckedInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'burnChecked',
						info: {
							account: mockSolAddress,
							mint: mockTokenAddress,
							tokenAmount: { amount: '12345' }
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockBurnCheckedInstruction,
						network
					})
				).resolves.toEqual({
					value: 12345n,
					from: mockSolAddress,
					to: mockTokenAddress,
					tokenAddress: mockTokenAddress
				});
			});

			it('should return undefined for non-mapped instruction', async () => {
				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: { ...mockTokenInstruction, parsed: { type: 'other-type', info: {} } },
					network
				});

				expect(result).toBeUndefined();
			});
		});

		describe('with a Token-2022 parsed instruction', () => {
			let mockGetAccountInfo: MockInstance;

			const mockTokenAddress: SplTokenAddress = JUP_TOKEN.address;

			const mockTokenInstruction: SolRpcInstruction = {
				...mockInstruction,
				programAddress: address(TOKEN_2022_PROGRAM_ADDRESS),
				parsed: {
					type: 'transfer',
					info: {
						destination: mockSolAddress2,
						amount: '50',
						source: mockSolAddress
					}
				}
			};

			beforeEach(() => {
				mockGetAccountInfo = vi.fn(() => ({
					send: vi.fn(() => ({
						value: {
							data: { parsed: { info: { mint: mockTokenAddress } } }
						}
					}))
				}));

				const mockRpc = { getAccountInfo: mockGetAccountInfo } as unknown as Rpc<SolanaRpcApi>;

				vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc);
			});

			describe('with `transfer` instruction', () => {
				it('should map a valid `transfer` instruction', async () => {
					const result = await mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockTokenInstruction,
						network
					});

					expect(result).toEqual({
						value: 50n,
						from: mockSolAddress,
						to: mockSolAddress2,
						tokenAddress: mockTokenAddress
					});

					expect(mockGetAccountInfo).toHaveBeenCalledExactlyOnceWith(mockSolAddress, {
						encoding: 'jsonParsed'
					});
				});

				it('should fetch token address from destination account info if not provided by source info', async () => {
					mockGetAccountInfo.mockReturnValueOnce({
						send: vi.fn(() => ({ value: { data: {} } }))
					});

					const result = await mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockTokenInstruction,
						network
					});

					expect(result).toEqual({
						value: 50n,
						from: mockSolAddress,
						to: mockSolAddress2,
						tokenAddress: mockTokenAddress
					});

					expect(mockGetAccountInfo).toHaveBeenCalledTimes(2);
					expect(mockGetAccountInfo).toHaveBeenNthCalledWith(1, mockSolAddress, {
						encoding: 'jsonParsed'
					});
					expect(mockGetAccountInfo).toHaveBeenNthCalledWith(2, mockSolAddress2, {
						encoding: 'jsonParsed'
					});
				});

				it('should not call getAccountInfo for `transfer` instruction if token address is already mapped', async () => {
					await expect(
						mapSolParsedInstruction({
							identity: mockIdentity,
							instruction: mockTokenInstruction,
							network,
							addressToToken: { [mockSolAddress]: mockTokenAddress }
						})
					).resolves.toEqual({
						value: 50n,
						from: mockSolAddress,
						to: mockSolAddress2,
						tokenAddress: mockTokenAddress
					});

					expect(mockGetAccountInfo).not.toHaveBeenCalled();

					await expect(
						mapSolParsedInstruction({
							identity: mockIdentity,
							instruction: mockTokenInstruction,
							network,
							addressToToken: { [mockSolAddress2]: mockTokenAddress }
						})
					).resolves.toEqual({
						value: 50n,
						from: mockSolAddress,
						to: mockSolAddress2,
						tokenAddress: mockTokenAddress
					});
				});
			});

			it('should map a valid `transferChecked` instruction', async () => {
				const mockTransferCheckedInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'transferChecked',
						info: {
							destination: mockSolAddress2,
							tokenAmount: {
								amount: '50'
							},
							source: mockSolAddress,
							mint: mockTokenAddress
						}
					}
				};

				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: mockTransferCheckedInstruction,
					network
				});

				expect(result).toEqual({
					value: 50n,
					from: mockSolAddress,
					to: mockSolAddress2,
					tokenAddress: mockTokenAddress
				});
			});

			it('should map a valid `closeAccount` instruction', async () => {
				const mockCloseAccountInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'closeAccount',
						info: {
							destination: mockSolAddress2,
							account: mockSolAddress
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockCloseAccountInstruction,
						network
					})
				).resolves.toEqual({
					value: ZERO,
					from: mockSolAddress,
					to: mockSolAddress2
				});

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockCloseAccountInstruction,
						network,
						cumulativeBalances: { [mockSolAddress]: 100n }
					})
				).resolves.toEqual({
					value: 100n,
					from: mockSolAddress,
					to: mockSolAddress2
				});

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockCloseAccountInstruction,
						network,
						cumulativeBalances: { [mockSolAddress2]: 100n }
					})
				).resolves.toEqual({
					value: -100n,
					from: mockSolAddress,
					to: mockSolAddress2
				});
			});

			it('should map a valid `mintTo` instruction', async () => {
				const mockMintToInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'mintTo',
						info: {
							account: mockSolAddress,
							mint: mockTokenAddress,
							amount: '12345'
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockMintToInstruction,
						network
					})
				).resolves.toEqual({
					value: 12345n,
					from: mockTokenAddress,
					to: mockSolAddress,
					tokenAddress: mockTokenAddress
				});
			});

			it('should map a valid `burn` instruction', async () => {
				const mockBurnInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'burn',
						info: {
							account: mockSolAddress,
							mint: mockTokenAddress,
							amount: '12345'
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockBurnInstruction,
						network
					})
				).resolves.toEqual({
					value: 12345n,
					from: mockSolAddress,
					to: mockTokenAddress,
					tokenAddress: mockTokenAddress
				});
			});

			it('should map a valid `mintToChecked` instruction', async () => {
				const mockMintToCheckedInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'mintToChecked',
						info: {
							account: mockSolAddress,
							mint: mockTokenAddress,
							tokenAmount: { amount: '12345' }
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockMintToCheckedInstruction,
						network
					})
				).resolves.toEqual({
					value: 12345n,
					from: mockTokenAddress,
					to: mockSolAddress,
					tokenAddress: mockTokenAddress
				});
			});

			it('should map a valid `burnChecked` instruction', async () => {
				const mockBurnCheckedInstruction: SolRpcInstruction = {
					...mockTokenInstruction,
					parsed: {
						type: 'burnChecked',
						info: {
							account: mockSolAddress,
							mint: mockTokenAddress,
							tokenAmount: { amount: '12345' }
						}
					}
				};

				await expect(
					mapSolParsedInstruction({
						identity: mockIdentity,
						instruction: mockBurnCheckedInstruction,
						network
					})
				).resolves.toEqual({
					value: 12345n,
					from: mockSolAddress,
					to: mockTokenAddress,
					tokenAddress: mockTokenAddress
				});
			});

			it('should return undefined for non-mapped instruction', async () => {
				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: { ...mockTokenInstruction, parsed: { type: 'other-type', info: {} } },
					network
				});

				expect(result).toBeUndefined();
			});
		});

		describe('with an Associated Token Account parsed instruction', () => {
			const mockAtaInstruction: SolRpcInstruction = {
				...mockInstruction,
				programAddress: address(ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS),
				parsed: { type: 'create', info: {} }
			};

			it('should map a valid `create` instruction with inner instructions', async () => {
				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: mockAtaInstruction,
					network
				});

				expect(result).toBeUndefined();
			});

			it('should map a valid `createIdempotent` instruction with inner instructions', async () => {
				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: { ...mockAtaInstruction, parsed: { type: 'createIdempotent', info: {} } },
					network
				});

				expect(result).toBeUndefined();
			});

			it('should return undefined for non-mapped instruction', async () => {
				const result = await mapSolParsedInstruction({
					identity: mockIdentity,
					instruction: { ...mockAtaInstruction, parsed: { type: 'other-type', info: {} } },
					network
				});

				expect(result).toBeUndefined();
			});
		});
	});

	describe('mapSolInstruction', () => {
		const { instructions: mockInstructions } = mockSolParsedTransactionMessage;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(solInstructionsComputeBudgetUtils, 'parseSolComputeBudgetInstruction');
			vi.spyOn(solInstructionsSystemUtils, 'parseSolSystemInstruction');
			vi.spyOn(solInstructionsTokenUtils, 'parseSolTokenInstruction');
			vi.spyOn(solInstructionsToken2022Utils, 'parseSolToken2022Instruction');
			vi.spyOn(solInstructionsAtaUtils, 'parseSolAtaInstruction');
		});

		it('should ignore a Compute Budget instruction without parsing it', () => {
			const [mockInstruction1, mockInstruction2, mockInstruction3] = mockInstructions.filter(
				({ programAddress }) => programAddress === COMPUTE_BUDGET_PROGRAM_ADDRESS
			);

			assertNonNullish(mockInstruction1, 'Compute Budget instruction 1 not found');
			assertNonNullish(mockInstruction2, 'Compute Budget instruction 2 not found');

			expect(mockInstruction3).toBeUndefined();

			expect(mapSolInstruction(mockInstruction1)).toStrictEqual({ amount: undefined });
			expect(mapSolInstruction(mockInstruction2)).toStrictEqual({ amount: undefined });

			expect(parseSolComputeBudgetInstruction).not.toHaveBeenCalled();

			expect(console.warn).not.toHaveBeenCalled();
		});

		it('should ignore a malformed Compute Budget instruction instead of throwing', () => {
			const malformedInstruction: SolInstruction = {
				programAddress: address(COMPUTE_BUDGET_PROGRAM_ADDRESS)
			};

			expect(mapSolInstruction(malformedInstruction)).toStrictEqual({ amount: undefined });

			expect(parseSolComputeBudgetInstruction).not.toHaveBeenCalled();

			expect(console.warn).not.toHaveBeenCalled();
		});

		it('should map a valid System instruction', () => {
			const [mockInstruction1, mockInstruction2, mockInstruction3] = mockInstructions.filter(
				({ programAddress }) => programAddress === SYSTEM_PROGRAM_ADDRESS
			);

			assertNonNullish(mockInstruction1, 'System instruction 1 not found');
			assertNonNullish(mockInstruction2, 'System instruction 2 not found');

			expect(mockInstruction3).toBeUndefined();

			expect(mapSolInstruction(mockInstruction1)).toStrictEqual({
				amount: 5100n,
				destination: 'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
				source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
			});
			expect(mapSolInstruction(mockInstruction2)).toStrictEqual({
				amount: 2039280n,
				payer: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
			});

			expect(parseSolSystemInstruction).toHaveBeenCalledTimes(2);
			expect(parseSolSystemInstruction).toHaveBeenNthCalledWith(1, mockInstruction1);
			expect(parseSolSystemInstruction).toHaveBeenNthCalledWith(2, mockInstruction2);

			expect(console.warn).not.toHaveBeenCalled();
		});

		it('should map a valid Token instruction', () => {
			const [mockInstruction1, mockInstruction2, mockInstruction3] = mockInstructions.filter(
				({ programAddress }) => programAddress === TOKEN_PROGRAM_ADDRESS
			);

			assertNonNullish(mockInstruction1, 'Token instruction 1 not found');
			assertNonNullish(mockInstruction2, 'Token instruction 2 not found');

			expect(mockInstruction3).toBeUndefined();

			expect(mapSolInstruction(mockInstruction1)).toStrictEqual({
				amount: undefined,
				unreviewed: true
			});
			expect(mapSolInstruction(mockInstruction2)).toStrictEqual({
				amount: undefined,
				unreviewed: true
			});

			expect(parseSolTokenInstruction).toHaveBeenCalledTimes(2);
			expect(parseSolTokenInstruction).toHaveBeenNthCalledWith(1, mockInstruction1);
			expect(parseSolTokenInstruction).toHaveBeenNthCalledWith(2, mockInstruction2);

			expect(console.warn).toHaveBeenCalledTimes(2);
			expect(console.warn).toHaveBeenNthCalledWith(
				1,
				`Could not map Solana Token instruction of type ${TokenInstruction.InitializeAccount}`
			);
			expect(console.warn).toHaveBeenNthCalledWith(
				2,
				`Could not map Solana Token instruction of type ${TokenInstruction.CloseAccount}`
			);
		});

		it('should forward the delegate as destination and flag an `Approve` instruction as an approval', () => {
			const instruction = getApproveInstruction({
				source: address(mockSolAddress),
				delegate: address(mockSolAddress2),
				owner: address(mockSolAddress),
				amount: 100n
			});

			expect(mapSolInstruction(instruction)).toStrictEqual({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				isApproval: true
			});
		});

		it('should surface the mint as tokenAddress for a `TransferChecked` instruction', () => {
			const instruction = getTransferCheckedInstruction({
				source: address(mockSolAddress),
				mint: address(JUP_TOKEN.address),
				destination: address(mockSolAddress2),
				authority: address(mockSolAddress),
				amount: 100n,
				decimals: 6
			});

			expect(mapSolInstruction(instruction)).toStrictEqual({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				tokenAddress: JUP_TOKEN.address
			});
		});

		it('should forward the delegate as destination, surface the mint and flag an `ApproveChecked` instruction as an approval', () => {
			const instruction = getApproveCheckedInstruction({
				source: address(mockSolAddress),
				mint: address(JUP_TOKEN.address),
				delegate: address(mockSolAddress2),
				owner: address(mockSolAddress),
				amount: 100n,
				decimals: 6
			});

			expect(mapSolInstruction(instruction)).toStrictEqual({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				tokenAddress: JUP_TOKEN.address,
				isApproval: true
			});
		});

		it('should surface the mint as tokenAddress for a Token-2022 `TransferChecked` instruction', () => {
			const instruction = getToken2022TransferCheckedInstruction({
				source: address(mockSolAddress),
				mint: address(JUP_TOKEN.address),
				destination: address(mockSolAddress2),
				authority: address(mockSolAddress),
				amount: 100n,
				decimals: 6
			});

			expect(mapSolInstruction(instruction)).toStrictEqual({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				tokenAddress: JUP_TOKEN.address
			});
		});

		it('should forward the delegate and flag a Token-2022 `Approve` instruction as an approval', () => {
			const instruction = getToken2022ApproveInstruction({
				source: address(mockSolAddress),
				delegate: address(mockSolAddress2),
				owner: address(mockSolAddress),
				amount: 100n
			});

			expect(mapSolInstruction(instruction)).toStrictEqual({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				isApproval: true
			});
		});

		it('should forward the delegate, surface the mint and flag a Token-2022 `ApproveChecked` instruction as an approval', () => {
			const instruction = getToken2022ApproveCheckedInstruction({
				source: address(mockSolAddress),
				mint: address(JUP_TOKEN.address),
				delegate: address(mockSolAddress2),
				owner: address(mockSolAddress),
				amount: 100n,
				decimals: 6
			});

			expect(mapSolInstruction(instruction)).toStrictEqual({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				tokenAddress: JUP_TOKEN.address,
				isApproval: true
			});
		});

		it('should ignore a Create Associated Token instruction', () => {
			const instruction = getCreateAssociatedTokenInstruction({
				payer: createNoopSigner(address(mockSolAddress)),
				ata: address(mockSolAddress2),
				owner: address(mockSolAddress),
				mint: address(JUP_TOKEN.address)
			});

			expect(mapSolInstruction(instruction)).toStrictEqual({ amount: undefined });

			expect(parseSolAtaInstruction).toHaveBeenCalledExactlyOnceWith(instruction);
			expect(console.warn).not.toHaveBeenCalled();
		});

		it('should ignore a Create Associated Token Idempotent instruction', () => {
			const instruction = getCreateAssociatedTokenIdempotentInstruction({
				payer: createNoopSigner(address(mockSolAddress)),
				ata: address(mockSolAddress2),
				owner: address(mockSolAddress),
				mint: address(JUP_TOKEN.address)
			});

			expect(mapSolInstruction(instruction)).toStrictEqual({ amount: undefined });

			expect(parseSolAtaInstruction).toHaveBeenCalledExactlyOnceWith(instruction);
			expect(console.warn).not.toHaveBeenCalled();
		});

		it('should return undefined for unrecognized instruction', () => {
			const [mockInstruction1, mockInstruction2] = mockInstructions.filter(
				({ programAddress }) =>
					![
						COMPUTE_BUDGET_PROGRAM_ADDRESS,
						SYSTEM_PROGRAM_ADDRESS,
						TOKEN_PROGRAM_ADDRESS,
						TOKEN_2022_PROGRAM_ADDRESS
					].includes(programAddress)
			);

			assertNonNullish(mockInstruction1, 'Unrecognized instruction 1 not found');

			expect(mockInstruction2).toBeUndefined();

			expect(mapSolInstruction(mockInstruction1)).toStrictEqual({
				amount: undefined,
				unreviewed: true
			});

			expect(parseSolComputeBudgetInstruction).not.toHaveBeenCalled();
			expect(parseSolSystemInstruction).not.toHaveBeenCalled();
			expect(parseSolTokenInstruction).not.toHaveBeenCalled();
			expect(parseSolToken2022Instruction).not.toHaveBeenCalled();
			expect(parseSolAtaInstruction).not.toHaveBeenCalled();

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				`Could not parse Solana instruction for program ${mockInstruction1.programAddress}`
			);
		});
	});
});
