import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { ZERO } from '$lib/constants/app.constants';
import * as solRpcApi from '$sol/api/sol-rpc.api';
import {
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolRpcInstruction } from '$sol/types/sol-instructions';
import type { SplTokenAddress } from '$sol/types/spl';
import { mapSolParsedInstruction } from '$sol/utils/sol-instructions.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockAccountInfo } from '$tests/mocks/sol-rpc.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { address, type Base58EncodedBytes } from '@solana/kit';
import type { MockInstance } from 'vitest';

describe('sol-instructions.utils', () => {
	const network: SolanaNetworkType = 'mainnet';

	const mockInstruction: SolRpcInstruction = {
		parsed: { type: 'mock-type', info: {} },
		program: 'mock-program',
		programId: address(mockSolAddress),
		programAddress: address(mockSolAddress)
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
	});

	describe('mapSolParsedInstruction', () => {
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
				mockGetAccountInfo = vi.spyOn(solRpcApi, 'getAccountInfo').mockResolvedValue({
					...mockAccountInfo,
					data: {
						json: {
							space: 1n,
							program: TOKEN_PROGRAM_ADDRESS,
							parsed: { info: { mint: mockTokenAddress } }
						}
					}
				});
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

					expect(mockGetAccountInfo).toHaveBeenCalledExactlyOnceWith({
						identity: mockIdentity,
						address: mockSolAddress,
						network
					});
				});

				it('should fetch token address from destination account info if not provided by source info', async () => {
					mockGetAccountInfo.mockReturnValueOnce(undefined);

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
					expect(mockGetAccountInfo).toHaveBeenNthCalledWith(1, {
						identity: mockIdentity,
						address: mockSolAddress,
						network
					});
					expect(mockGetAccountInfo).toHaveBeenNthCalledWith(2, {
						identity: mockIdentity,
						address: mockSolAddress2,
						network
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
					value: ZERO,
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
				mockGetAccountInfo = vi.spyOn(solRpcApi, 'getAccountInfo').mockResolvedValue({
					...mockAccountInfo,
					data: {
						json: {
							space: 1n,
							program: TOKEN_2022_PROGRAM_ADDRESS,
							parsed: { info: { mint: mockTokenAddress } }
						}
					}
				});
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

					expect(mockGetAccountInfo).toHaveBeenCalledExactlyOnceWith({
						identity: mockIdentity,
						address: mockSolAddress,
						network
					});
				});

				it('should fetch token address from destination account info if not provided by source info', async () => {
					mockGetAccountInfo.mockReturnValueOnce(undefined);

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
					expect(mockGetAccountInfo).toHaveBeenNthCalledWith(1, {
						identity: mockIdentity,
						address: mockSolAddress,
						network
					});
					expect(mockGetAccountInfo).toHaveBeenNthCalledWith(2, {
						identity: mockIdentity,
						address: mockSolAddress2,
						network
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
					value: ZERO,
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
});
