import { DEVNET_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import type { SolAddress } from '$lib/types/address';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import { sendSol } from '$sol/services/sol-send.services';
import * as accountServices from '$sol/services/spl-accounts.services';
import type { SolInstruction } from '$sol/types/sol-instructions';
import * as networkUtils from '$sol/utils/network.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockAtaAddress3,
	mockSolAddress,
	mockSolAddress2
} from '$tests/mocks/sol.mock';
import { getTransferSolInstruction } from '@solana-program/system';
import { getTransferInstruction } from '@solana-program/token';
import * as solanaWeb3 from '@solana/kit';
import {
	appendTransactionMessageInstructions,
	getComputeUnitEstimateForTransactionMessageFactory,
	pipe,
	sendAndConfirmTransactionFactory,
	type Rpc,
	type RpcSubscriptions,
	type SolanaRpcApi,
	type SolanaRpcSubscriptionsApi
} from '@solana/kit';
import { type MockInstance } from 'vitest';

vi.mock(import('@solana/kit'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		appendTransactionMessageInstructions: vi.fn(),
		assertIsTransactionPartialSigner: vi.fn(),
		assertIsTransactionSigner: vi.fn(),
		assertTransactionIsFullySigned: vi.fn(),
		createTransactionMessage: vi.fn().mockReturnValue('mock-transaction-message'),
		getComputeUnitEstimateForTransactionMessageFactory: vi.fn(),
		getSignatureFromTransaction: vi.fn(),
		prependTransactionMessageInstruction: vi.fn(),
		sendAndConfirmTransactionFactory: vi.fn(),
		setTransactionMessageFeePayer: vi.fn((message) => message),
		setTransactionMessageFeePayerSigner: vi.fn((message) => message),
		setTransactionMessageLifetimeUsingBlockhash: vi.fn((message) => message),
		signTransactionMessageWithSigners: vi.fn()
	};
});

vi.mock('@solana-program/system', () => ({
	getTransferSolInstruction: vi.fn().mockReturnValue('mock-transfer-sol-instruction')
}));

vi.mock('@solana-program/token', () => ({
	getTransferInstruction: vi.fn().mockReturnValue('mock-transfer-instruction')
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
			vi.mocked(sendAndConfirmTransactionFactory).mockReturnValue(() => Promise.resolve());
			vi.mocked(getComputeUnitEstimateForTransactionMessageFactory).mockReturnValue(() =>
				Promise.resolve(123)
			);

			spyMapNetworkIdToNetwork = vi.spyOn(networkUtils, 'mapNetworkIdToNetwork');

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
			expect(appendTransactionMessageInstructions).toHaveBeenCalledOnce();
			expect(appendTransactionMessageInstructions).toHaveBeenCalledWith(
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
			expect(spyCreateAtaInstruction).toHaveBeenCalledOnce();

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
			// Providing an owner for the destination address, so that it is considered an ATA address
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
			spyMapNetworkIdToNetwork.mockReturnValueOnce(undefined);

			await expect(
				sendSol({
					...mockParams,
					token: SOLANA_TOKEN
				})
			).rejects.toThrowError(
				replacePlaceholders(en.init.error.no_solana_network, {
					$network: SOLANA_TOKEN.network.id.description ?? ''
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

			await expect(sendSol({ ...mockParams, token: DEVNET_USDC_TOKEN })).rejects.toThrowError(
				`Destination ATA address is different from the calculated one. Destination: different-address, Calculated: ${mockAtaAddress2}`
			);
		});
	});
});
