import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import {
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolRpcInstruction } from '$sol/types/sol-instructions';
import type { SplTokenAddress } from '$sol/types/spl';
import { mapSolParsedInstruction } from '$sol/utils/sol-instructions.utils';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Base58EncodedBytes } from '@solana/rpc-types';

vi.mock('$sol/providers/sol-rpc.providers', () => ({
	solanaHttpRpc: vi.fn(),
	solanaWebSocketRpc: vi.fn()
}));

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
		vi.resetAllMocks();
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
				instruction,
				network
			});
			expect(result).toBeUndefined();
		});

		it('should log a warning if the program address is unrecognized', async () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const instruction: SolRpcInstruction = {
				...mockInstruction,
				programId: address(mockSolAddress),
				programAddress: address(mockSolAddress)
			};

			const result = await mapSolParsedInstruction({
				instruction,
				network
			});

			expect(result).toBeUndefined();
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				`Could not map Solana instruction of type ${instruction.parsed.type} for program ${instruction.programAddress}`,
				instruction
			);
		});

		describe('with a System parsed instruction', () => {
			const mockSystemInstruction: SolRpcInstruction = {
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

			it('should map a valid `transfer` instruction', async () => {
				const result = await mapSolParsedInstruction({
					instruction: mockSystemInstruction,
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
					instruction: { ...mockSystemInstruction, parsed: { type: 'other-type', info: {} } },
					network
				});

				expect(result).toBeUndefined();
			});
		});

		describe('with a Token parsed instruction', () => {
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
				const mockRpc = {
					getAccountInfo: vi.fn(() => ({
						send: vi.fn(() => ({
							value: {
								data: { parsed: { info: { mint: mockTokenAddress } } }
							}
						}))
					}))
				} as unknown as Rpc<SolanaRpcApi>;

				vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc);
			});

			it('should map a valid `transfer` instruction', async () => {
				const result = await mapSolParsedInstruction({
					instruction: mockTokenInstruction,
					network
				});

				expect(result).toEqual({
					value: 50n,
					from: mockSolAddress,
					to: mockSolAddress2,
					tokenAddress: mockTokenAddress
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

				const result = await mapSolParsedInstruction({
					instruction: mockCloseAccountInstruction,
					network
				});

				expect(result).toEqual({
					value: 0n,
					from: mockSolAddress,
					to: mockSolAddress2
				});
			});

			it('should return undefined for non-mapped instruction', async () => {
				const result = await mapSolParsedInstruction({
					instruction: { ...mockTokenInstruction, parsed: { type: 'other-type', info: {} } },
					network
				});

				expect(result).toBeUndefined();
			});
		});

		describe('with a Token-2022 parsed instruction', () => {
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
				const mockRpc = {
					getAccountInfo: vi.fn(() => ({
						send: vi.fn(() => ({
							value: {
								data: { parsed: { info: { mint: mockTokenAddress } } }
							}
						}))
					}))
				} as unknown as Rpc<SolanaRpcApi>;

				vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc);
			});

			it('should map a valid `transfer` instruction', async () => {
				const result = await mapSolParsedInstruction({
					instruction: mockTokenInstruction,
					network
				});

				expect(result).toEqual({
					value: 50n,
					from: mockSolAddress,
					to: mockSolAddress2,
					tokenAddress: mockTokenAddress
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

			it('should return undefined for non-mapped instruction', async () => {
				const result = await mapSolParsedInstruction({
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

			const mockInnerInstruction: SolRpcInstruction = {
				parsed: {
					type: 'createAccount',
					info: {
						source: mockSolAddress,
						newAccount: mockSolAddress2,
						lamports: 200n
					}
				},
				program: 'mock-program',
				programId: address(SYSTEM_PROGRAM_ADDRESS),
				programAddress: address(SYSTEM_PROGRAM_ADDRESS)
			};

			const mockInnerInstructions: SolRpcInstruction[] = [mockInnerInstruction];

			it('should map a valid `create` instruction with inner instructions', async () => {
				const result = await mapSolParsedInstruction({
					instruction: mockAtaInstruction,
					network,
					innerInstructions: mockInnerInstructions
				});

				expect(result).toEqual({
					value: 200n,
					from: mockSolAddress,
					to: mockSolAddress2
				});
			});

			it('should map a valid `createIdempotent` instruction with inner instructions', async () => {
				const result = await mapSolParsedInstruction({
					instruction: { ...mockAtaInstruction, parsed: { type: 'createIdempotent', info: {} } },
					network,
					innerInstructions: mockInnerInstructions
				});

				expect(result).toEqual({
					value: 200n,
					from: mockSolAddress,
					to: mockSolAddress2
				});
			});

			it('should return undefined if inner instructions are undefined', async () => {
				const result = await mapSolParsedInstruction({
					instruction: mockAtaInstruction,
					network
				});

				expect(result).toBeUndefined();
			});

			it('should return undefined if there are no inner instructions', async () => {
				const result = await mapSolParsedInstruction({
					instruction: mockAtaInstruction,
					network,
					innerInstructions: []
				});

				expect(result).toBeUndefined();
			});

			it('should return undefined if there is no `createAccount` in the inner instructions', async () => {
				const result = await mapSolParsedInstruction({
					instruction: mockAtaInstruction,
					network,
					innerInstructions: [{ ...mockInnerInstruction, parsed: { type: 'other-type', info: {} } }]
				});

				expect(result).toBeUndefined();
			});

			it('should return undefined if the `createAccount` inner instruction is not parsed', async () => {
				const innerInstruction: SolRpcInstruction = {
					data: 'mock-data' as Base58EncodedBytes,
					programId: address(SYSTEM_PROGRAM_ADDRESS),
					programAddress: address(SYSTEM_PROGRAM_ADDRESS),
					accounts: [address(mockSolAddress), address(mockSolAddress2)]
				};

				const result = await mapSolParsedInstruction({
					instruction: mockAtaInstruction,
					network,
					innerInstructions: [innerInstruction]
				});

				expect(result).toBeUndefined();
			});

			it('should return undefined for non-mapped instruction', async () => {
				const result = await mapSolParsedInstruction({
					instruction: { ...mockAtaInstruction, parsed: { type: 'other-type', info: {} } },
					network
				});

				expect(result).toBeUndefined();
			});
		});
	});
});
