import { DEVNET_EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { WALLET_PAGINATION, ZERO } from '$lib/constants/app.constants';
import {
	checkIfAccountExists,
	estimatePriorityFee,
	fetchSignatures,
	getAccountOwner,
	getSolCreateAccountFee,
	getTokenDecimals,
	getTokenOwner,
	loadSolLamportsBalance,
	loadTokenAccount,
	loadTokenBalance
} from '$sol/api/solana.api';
import { ATA_SIZE } from '$sol/constants/ata.constants';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import * as solRpcProviders from '$sol/providers/sol-rpc.providers';
import { SolanaNetworks } from '$sol/types/network';
import {
	mockSolSignatureResponse,
	mockSolSignatureWithErrorResponse
} from '$tests/mocks/sol-signatures.mock';
import {
	mockAtaAddress,
	mockSolAddress,
	mockSolAddress2,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { address, lamports } from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock('$sol/providers/sol-rpc.providers');

describe('solana.api', () => {
	let mockGetBalance: MockInstance;
	let mockGetTokenAccountBalance: MockInstance;
	let mockGetSignaturesForAddress: MockInstance;
	let mockGetMinimumBalanceForRentExemption: MockInstance;
	let mockGetRecentPrioritizationFees: MockInstance;
	let mockGetAccountInfo: MockInstance;

	const mockAddresses = [mockSolAddress, mockSolAddress2];
	const mockBalance = 500000n;
	const mockAtaBalance = 987654321n;
	const mockCreateAccountFee = 123n;
	const mockPriorityFee = 100n;
	const mockRecentPriorityFees = [
		{
			prioritizationFee: mockPriorityFee - 1n
		},
		{
			prioritizationFee: mockPriorityFee
		},
		{
			prioritizationFee: mockPriorityFee - 2n
		}
	];
	const mockTokenAccountInfo = {
		value: {
			owner: TOKEN_PROGRAM_ADDRESS,
			data: {
				parsed: {
					info: {
						decimals: 6
					}
				}
			}
		}
	};
	const mockAtaInfo = {
		value: {
			data: {
				parsed: {
					info: {
						owner: mockSolAddress
					}
				}
			}
		}
	};
	const mockOwnerInfo = { value: { lamports: mockBalance } };
	let mockAccountInfo = {};

	const mockError = new Error('RPC Error');

	beforeEach(() => {
		vi.clearAllMocks();

		mockAccountInfo = {};

		mockGetBalance = vi
			.fn()
			.mockReturnValue({ send: () => Promise.resolve({ value: lamports(mockBalance) }) });

		mockGetTokenAccountBalance = vi.fn().mockReturnValue({
			send: () => Promise.resolve({ value: { amount: mockAtaBalance } })
		});

		mockGetSignaturesForAddress = vi.fn().mockReturnValue({
			send: () => Promise.resolve([mockSolSignatureResponse(), mockSolSignatureResponse()])
		});

		mockGetMinimumBalanceForRentExemption = vi.fn().mockReturnValue({
			send: () => Promise.resolve(lamports(mockCreateAccountFee))
		});

		mockGetRecentPrioritizationFees = vi.fn().mockReturnValue({
			send: () => Promise.resolve(mockRecentPriorityFees)
		});

		mockGetAccountInfo = vi.fn().mockReturnValue({
			send: () => Promise.resolve(mockAccountInfo)
		});

		const mockSolanaHttpRpc = vi.fn().mockReturnValue({
			getBalance: mockGetBalance,
			getTokenAccountBalance: mockGetTokenAccountBalance,
			getSignaturesForAddress: mockGetSignaturesForAddress,
			getMinimumBalanceForRentExemption: mockGetMinimumBalanceForRentExemption,
			getRecentPrioritizationFees: mockGetRecentPrioritizationFees,
			getAccountInfo: mockGetAccountInfo
		});
		vi.mocked(solRpcProviders.solanaHttpRpc).mockImplementation(mockSolanaHttpRpc);
	});

	describe('loadSolLamportsBalance', () => {
		it('should load balance successfully', async () => {
			const balance = await loadSolLamportsBalance({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(balance).toEqual(mockBalance);
			expect(mockGetBalance).toHaveBeenCalled();
		});

		it('should handle zero balance', async () => {
			mockGetBalance.mockReturnValueOnce({ send: () => Promise.resolve({ value: lamports(0n) }) });

			const balance = await loadSolLamportsBalance({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(balance).toEqual(0n);
		});

		it('should throw error when RPC call fails', async () => {
			mockGetBalance.mockReturnValueOnce({ send: () => Promise.reject(mockError) });

			await expect(
				loadSolLamportsBalance({
					address: mockSolAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});

		it('should throw error when address is empty', async () => {
			await expect(
				loadSolLamportsBalance({
					address: '',
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow();
		});
	});

	describe('loadTokenBalance', () => {
		it('should load balance successfully', async () => {
			const balance = await loadTokenBalance({
				ataAddress: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});

			expect(balance).toEqual(mockAtaBalance);
			expect(mockGetTokenAccountBalance).toHaveBeenCalled();
		});

		it('should handle zero balance', async () => {
			mockGetTokenAccountBalance.mockReturnValueOnce({
				send: () => Promise.resolve({ value: { amount: ZERO } })
			});

			const balance = await loadTokenBalance({
				ataAddress: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});

			expect(balance).toEqual(0n);
		});

		it('should handle undefined balance', async () => {
			mockGetTokenAccountBalance.mockReturnValueOnce({
				send: () => Promise.resolve({ value: { amount: undefined } })
			});

			const balance = await loadTokenBalance({
				ataAddress: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});

			expect(balance).toBeUndefined();
		});

		it('should handle null balance', async () => {
			mockGetTokenAccountBalance.mockReturnValueOnce({
				send: () => Promise.resolve({ value: { amount: null } })
			});

			const balance = await loadTokenBalance({
				ataAddress: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});

			expect(balance).toBeUndefined();
		});

		it('should throw error when RPC call fails', async () => {
			mockGetTokenAccountBalance.mockReturnValueOnce({ send: () => Promise.reject(mockError) });

			await expect(
				loadTokenBalance({
					ataAddress: mockAtaAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});

		it('should throw error when address is empty', async () => {
			await expect(
				loadTokenBalance({
					ataAddress: '',
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow();
		});
	});

	describe('fetchSignatures', () => {
		it('should fetch transactions in multiple batches until limit is reached', async () => {
			const lastSignatureFromFirstBatch = mockSolSignatureResponse();

			mockGetSignaturesForAddress
				.mockReturnValueOnce({
					send: () =>
						Promise.resolve([
							mockSolSignatureResponse(),
							mockSolSignatureResponse(),
							mockSolSignatureResponse(),
							mockSolSignatureWithErrorResponse(),
							lastSignatureFromFirstBatch
						])
				})
				.mockReturnValueOnce({
					send: () => Promise.resolve([mockSolSignatureResponse(), mockSolSignatureResponse()])
				});

			const transactions = await fetchSignatures({
				wallet: address(mockSolAddress),
				network: SolanaNetworks.mainnet,
				limit: 5
			});

			expect(transactions).toHaveLength(5);
			expect(mockGetSignaturesForAddress).toHaveBeenCalledTimes(2);
			// Verify the second call uses the last signature from first batch for pagination
			expect(mockGetSignaturesForAddress).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({
					before: lastSignatureFromFirstBatch.signature
				})
			);
		});

		it('should stop fetching when no more signatures are available', async () => {
			mockGetSignaturesForAddress
				.mockReturnValueOnce({
					send: () => Promise.resolve([mockSolSignatureResponse(), mockSolSignatureResponse()])
				})
				// Second batch returns empty array
				.mockReturnValueOnce({
					send: () => Promise.resolve([])
				});

			const transactions = await fetchSignatures({
				wallet: address(mockSolAddress),
				network: SolanaNetworks.mainnet,
				limit: 5
			});

			expect(transactions).toHaveLength(2);
			expect(mockGetSignaturesForAddress).toHaveBeenCalledOnce();
		});

		it('should handle empty signatures response', async () => {
			mockGetSignaturesForAddress.mockReturnValue({
				send: () => Promise.resolve([])
			});

			const transactions = await fetchSignatures({
				wallet: address(mockSolAddress),
				network: SolanaNetworks.mainnet,
				limit: Number(WALLET_PAGINATION)
			});

			expect(transactions).toHaveLength(0);
		});

		it('should filter out signatures with errors', async () => {
			mockGetSignaturesForAddress.mockReturnValue({
				send: () =>
					Promise.resolve([mockSolSignatureResponse(), mockSolSignatureWithErrorResponse()])
			});

			const transactions = await fetchSignatures({
				wallet: address(mockSolAddress),
				network: SolanaNetworks.mainnet,
				limit: Number(WALLET_PAGINATION)
			});

			expect(transactions).toHaveLength(1);
		});
	});

	describe('loadTokenAccount', () => {
		let mockGetTokenAccountsByOwner: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			mockGetTokenAccountsByOwner = vi.fn().mockReturnValue({
				send: () =>
					Promise.resolve({
						value: [
							{
								pubkey: mockSplAddress,
								account: {
									data: {
										parsed: {
											info: {
												tokenAmount: {
													amount: '123'
												}
											}
										}
									}
								}
							}
						]
					})
			});

			const mockSolanaHttpRpc = vi.fn().mockReturnValue({
				getTokenAccountsByOwner: mockGetTokenAccountsByOwner
			});

			vi.mocked(solRpcProviders.solanaHttpRpc).mockImplementation(mockSolanaHttpRpc);
		});

		it('should load token account successfully', async () => {
			const account = await loadTokenAccount({
				address: mockSolAddress,
				network: SolanaNetworks.devnet,
				tokenAddress: DEVNET_EURC_TOKEN.address
			});

			expect(account).toEqual(mockSplAddress);
			expect(mockGetTokenAccountsByOwner).toHaveBeenCalledOnce();
		});

		it('should return undefined if no token account exists', async () => {
			mockGetTokenAccountsByOwner.mockReturnValueOnce({
				send: () => Promise.resolve({ value: [] })
			});

			const account = await loadTokenAccount({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				tokenAddress: DEVNET_EURC_TOKEN.address
			});

			expect(account).toBeUndefined();
		});

		it('should throw an error if RPC call fails', async () => {
			mockGetTokenAccountsByOwner.mockReturnValueOnce({
				send: () => Promise.reject(mockError)
			});

			await expect(
				loadTokenAccount({
					address: mockSolAddress,
					network: SolanaNetworks.mainnet,
					tokenAddress: DEVNET_EURC_TOKEN.address
				})
			).rejects.toThrow(mockError);
		});

		it('should throw an error when address is empty', async () => {
			await expect(
				loadTokenAccount({
					address: '',
					network: SolanaNetworks.mainnet,
					tokenAddress: DEVNET_EURC_TOKEN.address
				})
			).rejects.toThrow();
		});

		it('should throw an error when token address is empty', async () => {
			await expect(
				loadTokenAccount({
					address: mockSolAddress,
					network: SolanaNetworks.mainnet,
					tokenAddress: ''
				})
			).rejects.toThrow();
		});
	});

	describe('getSolCreateAccountFee', () => {
		it('should get the fee to create a new account', async () => {
			const fee = await getSolCreateAccountFee(SolanaNetworks.mainnet);

			expect(fee).toEqual(mockCreateAccountFee);
			expect(mockGetMinimumBalanceForRentExemption).toHaveBeenCalledWith(ATA_SIZE);
		});

		it('should throw error when RPC call fails', async () => {
			mockGetMinimumBalanceForRentExemption.mockReturnValueOnce({
				send: () => Promise.reject(mockError)
			});

			await expect(getSolCreateAccountFee(SolanaNetworks.mainnet)).rejects.toThrow(mockError);
		});
	});

	describe('estimatePriorityFee', () => {
		it('should estimate the recent max priority fee', async () => {
			const fee = await estimatePriorityFee({ network: SolanaNetworks.mainnet });

			expect(fee).toEqual(mockPriorityFee);
			expect(mockGetRecentPrioritizationFees).toHaveBeenCalledWith(undefined);
		});

		it('should estimate the recent max priority fee if addresses are passed too', async () => {
			const fee = await estimatePriorityFee({
				network: SolanaNetworks.mainnet,
				addresses: mockAddresses
			});

			expect(fee).toEqual(mockPriorityFee);
			expect(mockGetRecentPrioritizationFees).toHaveBeenCalledWith(mockAddresses);
		});

		it('should handle gracefully when addresses are empty', async () => {
			const fee = await estimatePriorityFee({
				network: SolanaNetworks.mainnet,
				addresses: []
			});

			expect(fee).toEqual(mockPriorityFee);
			expect(mockGetRecentPrioritizationFees).toHaveBeenCalledWith([]);
		});

		it('should handle gracefully the return of an empty array of fees', async () => {
			mockGetRecentPrioritizationFees.mockReturnValueOnce({
				send: () => Promise.resolve([])
			});

			const fee = await estimatePriorityFee({ network: SolanaNetworks.mainnet });

			expect(fee).toEqual(0n);
			expect(mockGetRecentPrioritizationFees).toHaveBeenCalledOnce();
		});

		it('should throw error when RPC call fails', async () => {
			mockGetRecentPrioritizationFees.mockReturnValueOnce({
				send: () => Promise.reject(mockError)
			});

			await expect(estimatePriorityFee({ network: SolanaNetworks.mainnet })).rejects.toThrow(
				mockError
			);
		});
	});

	describe('getTokenDecimals', () => {
		beforeEach(() => {
			mockAccountInfo = mockTokenAccountInfo;
		});

		it('should get token decimals successfully', async () => {
			const decimals = await getTokenDecimals({
				address: mockSplAddress,
				network: SolanaNetworks.mainnet
			});

			expect(decimals).toEqual(6);
			expect(mockGetAccountInfo).toHaveBeenCalledWith(mockSplAddress, { encoding: 'jsonParsed' });
		});

		it('should throw error when RPC call fails', async () => {
			mockGetAccountInfo.mockReturnValueOnce({ send: () => Promise.reject(mockError) });

			await expect(
				getTokenDecimals({
					address: mockSplAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});

		it('should return 0 when decimals are not found', async () => {
			mockGetAccountInfo.mockReturnValueOnce({
				send: () => Promise.resolve({ value: { data: { parsed: { info: {} } } } })
			});

			const decimals = await getTokenDecimals({
				address: mockSplAddress,
				network: SolanaNetworks.mainnet
			});

			expect(decimals).toEqual(0);
		});

		it('should return 0 when value is nullish', async () => {
			mockGetAccountInfo.mockReturnValueOnce({ send: () => Promise.resolve({}) });

			const decimals = await getTokenDecimals({
				address: mockSplAddress,
				network: SolanaNetworks.mainnet
			});

			expect(decimals).toEqual(0);
		});

		it('should return 0 when the value was not parsed', async () => {
			mockGetAccountInfo.mockReturnValueOnce({
				send: () => Promise.resolve({ value: { data: [1, 2, 3] } })
			});

			const decimals = await getTokenDecimals({
				address: mockSplAddress,
				network: SolanaNetworks.mainnet
			});

			expect(decimals).toEqual(0);
		});
	});

	describe('getTokenOwner', () => {
		beforeEach(() => {
			mockAccountInfo = mockTokenAccountInfo;
		});

		it('should get token owner successfully', async () => {
			const owner = await getTokenOwner({
				address: mockSplAddress,
				network: SolanaNetworks.mainnet
			});

			expect(owner).toEqual(TOKEN_PROGRAM_ADDRESS);
			expect(mockGetAccountInfo).toHaveBeenCalledWith(mockSplAddress, { encoding: 'jsonParsed' });
		});

		it('should throw error when RPC call fails', async () => {
			mockGetAccountInfo.mockReturnValueOnce({ send: () => Promise.reject(mockError) });

			await expect(
				getTokenOwner({
					address: mockSplAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});

		it('should return undefined when owner is not found', async () => {
			mockGetAccountInfo.mockReturnValueOnce({
				send: () => Promise.resolve({})
			});

			const owner = await getTokenOwner({
				address: mockSplAddress,
				network: SolanaNetworks.mainnet
			});

			expect(owner).toBeUndefined();
		});
	});

	describe('getAccountOwner', () => {
		beforeEach(() => {
			mockAccountInfo = mockAtaInfo;
		});

		it('should get token owner successfully', async () => {
			const owner = await getAccountOwner({
				address: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});

			expect(owner).toEqual(mockSolAddress);
			expect(mockGetAccountInfo).toHaveBeenCalledWith(mockAtaAddress, { encoding: 'jsonParsed' });
		});

		it('should throw error when RPC call fails', async () => {
			mockGetAccountInfo.mockReturnValueOnce({ send: () => Promise.reject(mockError) });

			await expect(
				getAccountOwner({
					address: mockSplAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});

		it('should return undefined when owner is not found', async () => {
			mockGetAccountInfo.mockReturnValueOnce({
				send: () => Promise.resolve({})
			});

			const owner = await getAccountOwner({
				address: mockSplAddress,
				network: SolanaNetworks.mainnet
			});

			expect(owner).toBeUndefined();
		});
	});

	describe('checkIfAccountExists', () => {
		it('should return true if the ATA address has info data', async () => {
			mockAccountInfo = mockAtaInfo;

			const result = await checkIfAccountExists({
				address: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});

			expect(result).toBeTruthy();
			expect(mockGetAccountInfo).toHaveBeenCalledWith(mockAtaAddress, { encoding: 'jsonParsed' });
		});

		it('should return true if it is a non-ATA address', async () => {
			mockAccountInfo = mockOwnerInfo;

			const result = await checkIfAccountExists({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(result).toBeTruthy();
			expect(mockGetAccountInfo).toHaveBeenCalledWith(mockSolAddress, { encoding: 'jsonParsed' });
		});

		it('should return false if the ATA address has no info data', async () => {
			mockAccountInfo = {};

			const result = await checkIfAccountExists({
				address: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});

			expect(result).toBeFalsy();
			expect(mockGetAccountInfo).toHaveBeenCalledWith(mockAtaAddress, { encoding: 'jsonParsed' });
		});

		it('should return false if the ATA address if the info data are nullish', async () => {
			mockAccountInfo = { value: null };

			const result = await checkIfAccountExists({
				address: mockAtaAddress,
				network: SolanaNetworks.mainnet
			});

			expect(result).toBeFalsy();
			expect(mockGetAccountInfo).toHaveBeenCalledWith(mockAtaAddress, { encoding: 'jsonParsed' });
		});

		it('should throw error when RPC call fails', async () => {
			mockGetAccountInfo.mockReturnValueOnce({ send: () => Promise.reject(mockError) });

			await expect(
				checkIfAccountExists({
					address: mockSplAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});
	});
});
