import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { DEVNET_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import { sendSol } from '$sol/services/sol-send.services';
import * as accountServices from '$sol/services/spl-accounts.services';
import type { SolAddress } from '$sol/types/address';
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
import {
	estimateComputeUnitLimitFactory,
	setTransactionMessageComputeUnitPrice
} from '@solana-program/compute-budget';
import { getTransferSolInstruction } from '@solana-program/system';
import { getTransferCheckedInstruction, getTransferInstruction } from '@solana-program/token';
import {
	createTransactionPlanExecutor,
	createTransactionPlanner,
	flattenTransactionPlanResult,
	nonDivisibleSequentialInstructionPlan,
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
		assertIsFullySignedTransaction: vi.fn(),
		assertIsSuccessfulSingleTransactionPlanResult: vi.fn(),
		assertIsTransactionPartialSigner: vi.fn(),
		assertIsTransactionSigner: vi.fn(),
		assertIsTransactionWithBlockhashLifetime: vi.fn(),
		assertIsTransactionWithinSizeLimit: vi.fn(),
		createTransactionMessage: vi.fn().mockReturnValue('mock-transaction-message'),
		createTransactionPlanExecutor: vi.fn(),
		createTransactionPlanner: vi.fn(),
		flattenTransactionPlanResult: vi.fn(),
		getSignatureFromTransaction: vi.fn(),
		nonDivisibleSequentialInstructionPlan: vi.fn(),
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

vi.mock('@solana-program/compute-budget', () => ({
	estimateComputeUnitLimitFactory: vi.fn(),
	setTransactionMessageComputeUnitPrice: vi
		.fn()
		.mockReturnValue('mock-message-with-compute-unit-price')
}));

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
	describe('sendSol', () => {
		const mockAmount = 1000000n;
		const mockSource = mockSolAddress;
		const mockSigner = expect.objectContaining({
			address: mockSolAddress,
			signTransactions: expect.any(Function)
		});
		const mockDestination = mockSolAddress2;
		const mockPrioritizationFee = ZERO;
		const mockParams = {
			identity: mockIdentity,
			amount: mockAmount,
			prioritizationFee: mockPrioritizationFee,
			source: mockSource,
			destination: mockDestination,
			progress: vi.fn()
		};

		const mockBlockhash = 'mock-blockhash';
		const mockSignature = 'mock-signature';
		const mockInstructionPlan = 'mock-instruction-plan';
		const mockTransactionPlan = 'mock-transaction-plan';
		const mockSuccessfulResult = {
			status: 'successful',
			context: { signature: mockSignature }
		};

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

			vi.mocked(nonDivisibleSequentialInstructionPlan).mockReturnValue(
				mockInstructionPlan as never
			);
			vi.mocked(createTransactionPlanner).mockReturnValue(() =>
				Promise.resolve(mockTransactionPlan as never)
			);
			vi.mocked(createTransactionPlanExecutor).mockImplementation(
				({ executeTransactionMessage }) => (async () => {
						const context = {};
						await executeTransactionMessage(context, 'mock-planned-message' as never);
						return 'mock-result';
					}) as never
			);
			vi.mocked(flattenTransactionPlanResult).mockReturnValue([mockSuccessfulResult] as never);

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
			).resolves.not.toThrowError();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledExactlyOnceWith(SOLANA_TOKEN.network.id);

			expect(nonDivisibleSequentialInstructionPlan).toHaveBeenCalledExactlyOnceWith([
				'mock-transfer-sol-instruction'
			]);
			expect(getTransferSolInstruction).toHaveBeenCalledExactlyOnceWith({
				source: mockSigner,
				destination: mockDestination,
				amount: mockAmount
			});
			expect(createTransactionPlanner).toHaveBeenCalledOnce();
			expect(createTransactionPlanExecutor).toHaveBeenCalledOnce();
		});

		it('should send SPL tokens successfully', async () => {
			await expect(
				sendSol({
					...mockParams,
					token: DEVNET_USDC_TOKEN
				})
			).resolves.not.toThrowError();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(DEVNET_USDC_TOKEN.network.id);

			expect(nonDivisibleSequentialInstructionPlan).toHaveBeenCalledExactlyOnceWith([
				'mock-transfer-instruction'
			]);
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
			).resolves.not.toThrowError();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(DEVNET_USDC_TOKEN.network.id);

			expect(nonDivisibleSequentialInstructionPlan).toHaveBeenCalledExactlyOnceWith([
				'mock-transfer-checked-instruction'
			]);
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

		it('should send Token-2022 SPL tokens successfully', async () => {
			await expect(
				sendSol({
					...mockParams,
					token: { ...DEVNET_USDC_TOKEN, owner: TOKEN_2022_PROGRAM_ADDRESS } as SplToken
				})
			).resolves.not.toThrowError();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(DEVNET_USDC_TOKEN.network.id);

			expect(nonDivisibleSequentialInstructionPlan).toHaveBeenCalledExactlyOnceWith([
				'mock-transfer-checked-instruction'
			]);
			expect(getTransferCheckedInstruction).toHaveBeenCalledWith(
				{
					source: mockAtaAddress,
					destination: mockAtaAddress2,
					mint: DEVNET_USDC_TOKEN.address,
					decimals: DEVNET_USDC_TOKEN.decimals,
					authority: mockSigner,
					amount: mockAmount
				},
				{ programAddress: TOKEN_2022_PROGRAM_ADDRESS }
			);
		});

		it('should send add ATA creation instructions if needed', async () => {
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
			).resolves.not.toThrowError();

			expect(spyCalculateAssociatedTokenAddress).toHaveBeenCalledTimes(2);
			expect(spyCreateAtaInstruction).toHaveBeenCalledExactlyOnceWith({
				signer: mockSigner,
				destination: mockSolAddress2,
				tokenAddress: DEVNET_USDC_TOKEN.address,
				tokenOwnerAddress: DEVNET_USDC_TOKEN.owner
			});

			expect(nonDivisibleSequentialInstructionPlan).toHaveBeenCalledExactlyOnceWith([
				{ keys: 'mock-ata-creation-instruction' },
				'mock-transfer-instruction'
			]);
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
			).resolves.not.toThrowError();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(DEVNET_USDC_TOKEN.network.id);
			expect(spyCalculateAssociatedTokenAddress).toHaveBeenCalledOnce();
			expect(spyCreateAtaInstruction).toHaveBeenCalledOnce();

			expect(nonDivisibleSequentialInstructionPlan).toHaveBeenCalledExactlyOnceWith([
				'mock-transfer-instruction'
			]);
			expect(getTransferInstruction).toHaveBeenCalledExactlyOnceWith(
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
			).rejects.toThrowError(
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

			await expect(sendSol({ ...mockParams, token: DEVNET_USDC_TOKEN })).rejects.toThrowError(
				`Destination ATA address is different from the calculated one. Destination: different-address, Calculated: ${mockAtaAddress2}`
			);
		});

		it('should apply compute unit price when prioritization fee is set', async () => {
			const prioritizationFee = 1000n;

			await expect(
				sendSol({
					...mockParams,
					prioritizationFee,
					token: SOLANA_TOKEN
				})
			).resolves.not.toThrowError();

			expect(setTransactionMessageComputeUnitPrice).toHaveBeenCalledOnce();
		});

		it('should not apply compute unit price when prioritization fee is zero', async () => {
			await expect(
				sendSol({
					...mockParams,
					prioritizationFee: ZERO,
					token: SOLANA_TOKEN
				})
			).resolves.not.toThrowError();

			expect(setTransactionMessageComputeUnitPrice).not.toHaveBeenCalled();
		});
	});
});
