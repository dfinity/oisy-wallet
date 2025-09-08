import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { DEVNET_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import type { SolAddress } from '$lib/types/address';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import { sendSol } from '$sol/services/sol-send.services';
import * as accountServices from '$sol/services/spl-accounts.services';
import type { SolInstruction } from '$sol/types/sol-instructions';
import type { SplToken } from '$sol/types/spl';
import * as networkUtils from '$sol/utils/safe-network.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockAtaAddress3,
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3
} from '$tests/mocks/sol.mock';
import { estimateComputeUnitLimitFactory } from '@solana-program/compute-budget';
import { getTransferSolInstruction } from '@solana-program/system';
import { getTransferCheckedInstruction, getTransferInstruction } from '@solana-program/token';
import * as solanaWeb3 from '@solana/kit';
import {
	appendTransactionMessageInstructions,
	pipe,
	sendTransactionWithoutConfirmingFactory,
	type Rpc,
	type RpcSubscriptions,
	type SolanaRpcApi,
	type SolanaRpcSubscriptionsApi
} from '@solana/kit';
import {
	createBlockHeightExceedencePromiseFactory,
	createRecentSignatureConfirmationPromiseFactory,
	waitForRecentTransactionConfirmation
} from '@solana/transaction-confirmation';
import type { MockInstance } from 'vitest';

vi.mock(import('@solana/kit'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		appendTransactionMessageInstructions: vi.fn(),
		assertIsFullySignedTransaction: vi.fn(),
		assertIsTransactionPartialSigner: vi.fn(),
		assertIsTransactionSigner: vi.fn(),
		assertIsTransactionWithinSizeLimit: vi.fn(),
		createTransactionMessage: vi.fn().mockReturnValue('mock-transaction-message'),
		getSignatureFromTransaction: vi.fn(),
		prependTransactionMessageInstruction: vi.fn(),
		sendTransactionWithoutConfirmingFactory: vi.fn(),
		setTransactionMessageFeePayer: vi.fn((message) => message),
		setTransactionMessageFeePayerSigner: vi.fn((message) => message),
		setTransactionMessageLifetimeUsingBlockhash: vi.fn((message) => message),
		signTransactionMessageWithSigners: vi.fn()
	};
});

vi.mock(import('@solana/transaction-confirmation'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		createBlockHeightExceedencePromiseFactory: vi.fn(),
		createRecentSignatureConfirmationPromiseFactory: vi.fn(),
		waitForRecentTransactionConfirmation: vi.fn()
	};
});

vi.mock(import('@solana-program/compute-budget'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		estimateComputeUnitLimitFactory: vi.fn()
	};
});

vi.mock('@solana-program/system', () => ({
	getTransferSolInstruction: vi.fn().mockReturnValue('mock-transfer-sol-instruction')
}));

vi.mock('@solana-program/token', () => ({
	getTransferInstruction: vi.fn().mockReturnValue('mock-transfer-instruction'),
	getTransferCheckedInstruction: vi.fn().mockReturnValue('mock-transfer-checked-instruction')
}));

vi.mock('$sol/providers/sol-rpc.providers', () => ({
	solanaHttpRpc: vi.fn(),
	solanaWebSocketRpc: vi.fn()
}));

vi.mock('$lib/api/signer.api', () => ({
	signWithSchnorr: vi.fn()
}));

describe('sol-send.services', () => {
	// TODO: add more practical tests deploying the Solana local node
	describe('sendSol', () => {
		const mockAmount = 1000000n;
		const mockSource = mockSolAddress;
		const mockSigner = expect.objectContaining({
			address: mockSolAddress,
			signTransactions: expect.any(Function)
		});
		const mockDestination = mockSolAddress2;
		const mockPrioritizationFee = 0n;
		const mockParams = {
			identity: mockIdentity,
			amount: mockAmount,
			prioritizationFee: mockPrioritizationFee,
			source: mockSource,
			destination: mockDestination,
			progress: vi.fn()
		};

		const mockBlockhash = 'mock-blockhash';
		const mockTx = { blockhash: mockBlockhash, lastValidBlockHeight: undefined };

		const mockRpc = {
			getLatestBlockhash: vi.fn(() => ({
				send: vi.fn(() => Promise.resolve({ value: { blockhash: mockBlockhash } }))
			})),
			getTokenAccountsByOwner: vi.fn((address: SolAddress) => ({
				send: vi.fn(() =>
					Promise.resolve({
						value: [
							{
								pubkey:
									address === mockSolAddress
										? mockAtaAddress
										: address === mockSolAddress2
											? mockAtaAddress2
											: undefined
							}
						]
					})
				)
			})),
			getAccountInfo: vi.fn(() => ({
				send: vi.fn(() => Promise.resolve({}))
			}))
		} as unknown as Rpc<SolanaRpcApi>;
		const mockRpcSubscriptions = {} as RpcSubscriptions<SolanaRpcSubscriptionsApi>;

		let spyMapNetworkIdToNetwork: MockInstance;

		let spyCalculateAssociatedTokenAddress: MockInstance;
		let spyCreateAtaInstruction: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(solanaWeb3, 'pipe');

			vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc);
			vi.mocked(solanaWebSocketRpc).mockReturnValue(mockRpcSubscriptions);
			vi.mocked(signWithSchnorr).mockResolvedValue(new Uint8Array([0, 1, 2, 3]));
			vi.mocked(sendTransactionWithoutConfirmingFactory).mockReturnValue(() => Promise.resolve());
			vi.mocked(createBlockHeightExceedencePromiseFactory).mockReturnValue(() => Promise.resolve());
			vi.mocked(createRecentSignatureConfirmationPromiseFactory).mockReturnValue(() =>
				Promise.resolve()
			);
			vi.mocked(waitForRecentTransactionConfirmation).mockResolvedValue();

			vi.mocked(estimateComputeUnitLimitFactory).mockReturnValue(() => Promise.resolve(123));

			spyMapNetworkIdToNetwork = vi.spyOn(networkUtils, 'safeMapNetworkIdToNetwork');

			spyCalculateAssociatedTokenAddress = vi
				.spyOn(accountServices, 'calculateAssociatedTokenAddress')
				.mockImplementation(({ owner }: { owner: SolAddress }) =>
					Promise.resolve(
						owner === mockSolAddress
							? mockAtaAddress
							: owner === mockSolAddress2
								? mockAtaAddress2
								: ''
					)
				);
			spyCreateAtaInstruction = vi
				.spyOn(accountServices, 'createAtaInstruction')
				.mockResolvedValue({ keys: 'mock-ata-creation-instruction' } as unknown as SolInstruction);
		});

		it('should send SOL successfully', async () => {
			await expect(
				sendSol({
					...mockParams,
					token: SOLANA_TOKEN
				})
			).resolves.not.toThrow();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledOnce();
			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(SOLANA_TOKEN.network.id);

			expect(pipe).toHaveBeenCalledTimes(4);
			expect(appendTransactionMessageInstructions).toHaveBeenCalledOnce();
			expect(appendTransactionMessageInstructions).toHaveBeenCalledWith(
				['mock-transfer-sol-instruction'],
				mockTx
			);
			expect(getTransferSolInstruction).toHaveBeenCalledOnce();
			expect(getTransferSolInstruction).toHaveBeenCalledWith({
				source: mockSigner,
				destination: mockDestination,
				amount: mockAmount
			});
		});

		it('should send SPL tokens successfully', async () => {
			await expect(
				sendSol({
					...mockParams,
					token: DEVNET_USDC_TOKEN
				})
			).resolves.not.toThrow();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(DEVNET_USDC_TOKEN.network.id);

			expect(pipe).toHaveBeenCalledTimes(4);
			expect(appendTransactionMessageInstructions).toHaveBeenCalledExactlyOnceWith(
				['mock-transfer-instruction'],
				mockTx
			);
			expect(getTransferInstruction).toHaveBeenCalledWith(
				{
					source: mockAtaAddress,
					destination: mockAtaAddress2,
					authority: mockSigner,
					amount: mockAmount
				},
				{ programAddress: DEVNET_USDC_TOKEN.owner }
			);
		});

		it('should send SPL tokens with mint authority successfully', async () => {
			await expect(
				sendSol({
					...mockParams,
					token: { ...DEVNET_USDC_TOKEN, mintAuthority: mockSolAddress3 } as SplToken
				})
			).resolves.not.toThrow();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(DEVNET_USDC_TOKEN.network.id);

			expect(pipe).toHaveBeenCalledTimes(4);
			expect(appendTransactionMessageInstructions).toHaveBeenCalledExactlyOnceWith(
				['mock-transfer-checked-instruction'],
				mockTx
			);
			expect(getTransferCheckedInstruction).toHaveBeenCalledWith(
				{
					source: mockAtaAddress,
					destination: mockAtaAddress2,
					mint: DEVNET_USDC_TOKEN.address,
					decimals: DEVNET_USDC_TOKEN.decimals,
					authority: mockSigner,
					amount: mockAmount
				},
				{ programAddress: DEVNET_USDC_TOKEN.owner }
			);
		});

		it('should send add ATA creation instructions if needed', async () => {
			// Removing the mocked ATA address for the destination address
			vi.mocked(solanaHttpRpc).mockReturnValue({
				...mockRpc,
				getTokenAccountsByOwner: vi.fn((address: SolAddress) => ({
					send: vi.fn(() =>
						Promise.resolve({
							value: [{ pubkey: address === mockSolAddress ? mockAtaAddress : undefined }]
						})
					)
				}))
			} as unknown as Rpc<SolanaRpcApi>);

			await expect(
				sendSol({
					...mockParams,
					token: DEVNET_USDC_TOKEN
				})
			).resolves.not.toThrow();

			expect(spyCalculateAssociatedTokenAddress).toHaveBeenCalledTimes(2);
			expect(spyCreateAtaInstruction).toHaveBeenCalledExactlyOnceWith({
				signer: mockSigner,
				destination: mockSolAddress2,
				tokenAddress: DEVNET_USDC_TOKEN.address,
				tokenOwnerAddress: DEVNET_USDC_TOKEN.owner
			});

			expect(pipe).toHaveBeenCalledTimes(4);
			expect(appendTransactionMessageInstructions).toHaveBeenCalledOnce();
			expect(appendTransactionMessageInstructions).toHaveBeenCalledWith(
				[{ keys: 'mock-ata-creation-instruction' }, 'mock-transfer-instruction'],
				mockTx
			);
			expect(getTransferInstruction).toHaveBeenCalledWith(
				{
					source: mockAtaAddress,
					destination: mockAtaAddress2,
					authority: mockSigner,
					amount: mockAmount
				},
				{ programAddress: DEVNET_USDC_TOKEN.owner }
			);
		});

		it('should use the destination address if it is an ATA address already', async () => {
			// Providing an owner for the destination address so that it is considered an ATA address
			vi.mocked(solanaHttpRpc).mockReturnValue({
				...mockRpc,
				getAccountInfo: vi.fn((address: SolAddress) => ({
					send: vi.fn(() =>
						Promise.resolve({
							value: {
								data: {
									parsed: {
										info: { owner: address === mockAtaAddress3 ? mockSolAddress2 : undefined }
									}
								}
							}
						})
					)
				}))
			} as unknown as Rpc<SolanaRpcApi>);

			await expect(
				sendSol({
					...mockParams,
					destination: mockAtaAddress3,
					token: DEVNET_USDC_TOKEN
				})
			).resolves.not.toThrow();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(DEVNET_USDC_TOKEN.network.id);
			expect(spyCalculateAssociatedTokenAddress).toHaveBeenCalledOnce();
			expect(spyCreateAtaInstruction).toHaveBeenCalledOnce();

			expect(pipe).toHaveBeenCalledTimes(4);
			expect(appendTransactionMessageInstructions).toHaveBeenCalledOnce();
			expect(appendTransactionMessageInstructions).toHaveBeenCalledWith(
				['mock-transfer-instruction'],
				mockTx
			);
			expect(getTransferInstruction).toHaveBeenCalledOnce();
			expect(getTransferInstruction).toHaveBeenCalledWith(
				{
					source: mockAtaAddress,
					destination: mockAtaAddress3,
					authority: expect.objectContaining({
						address: mockSolAddress,
						signTransactions: expect.any(Function)
					}),
					amount: mockAmount
				},
				{ programAddress: DEVNET_USDC_TOKEN.owner }
			);
		});

		it('should throw an error if network is invalid', async () => {
			await expect(
				sendSol({
					...mockParams,
					token: { ...SOLANA_TOKEN, network: ETHEREUM_NETWORK }
				})
			).rejects.toThrow(
				replacePlaceholders(en.init.error.no_solana_network, {
					$network: ETHEREUM_NETWORK.id.description ?? ''
				})
			);
		});

		it('should throw an error if the destination ATA address is different from the calculated one', async () => {
			vi.mocked(solanaHttpRpc).mockReturnValue({
				...mockRpc,
				getTokenAccountsByOwner: vi.fn(() => ({
					send: vi.fn(() => Promise.resolve({ value: [{ pubkey: 'different-address' }] }))
				}))
			} as unknown as Rpc<SolanaRpcApi>);

			await expect(sendSol({ ...mockParams, token: DEVNET_USDC_TOKEN })).rejects.toThrow(
				`Destination ATA address is different from the calculated one. Destination: different-address, Calculated: ${mockAtaAddress2}`
			);
		});
	});
});
