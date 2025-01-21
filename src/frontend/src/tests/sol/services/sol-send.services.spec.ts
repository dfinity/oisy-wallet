import { DEVNET_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import { sendSol } from '$sol/services/sol-send.services';
import * as networkUtils from '$sol/utils/network.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolAddress, mockSolAddress2, mockSplAddress } from '$tests/mocks/sol.mock';
import { BigNumber } from '@ethersproject/bignumber';
import * as solanaFunctional from '@solana/functional';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { RpcSubscriptions, SolanaRpcSubscriptionsApi } from '@solana/rpc-subscriptions';
import { sendAndConfirmTransactionFactory } from '@solana/web3.js';
import { expect, type MockInstance } from 'vitest';

vi.mock('@solana/functional', () => ({
	pipe: vi.fn()
}));

vi.mock('@solana/signers', () => ({
	assertIsTransactionSigner: vi.fn(),
	assertIsTransactionPartialSigner: vi.fn(),
	signTransactionMessageWithSigners: vi.fn()
}));

vi.mock('@solana/transactions', () => ({
	assertTransactionIsFullySigned: vi.fn(),
	getSignatureFromTransaction: vi.fn()
}));

vi.mock('@solana/transaction-messages', () => ({
	createTransactionMessage: vi.fn(),
	setTransactionMessageFeePayer: vi.fn(),
	setTransactionMessageLifetimeUsingBlockhash: vi.fn(),
	appendTransactionMessageInstructions: vi.fn()
}));

vi.mock('@solana-program/system', () => ({
	getTransferSolInstruction: vi.fn()
}));

vi.mock('@solana/web3.js', () => ({
	sendAndConfirmTransactionFactory: vi.fn()
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
		const mockAmount = BigNumber.from('1000000');
		const mockSource = mockSolAddress;
		const mockDestination = mockSolAddress2;
		const mockRpc = {
			getTokenAccountsByOwner: vi.fn(() => ({
				send: vi.fn(() => Promise.resolve({ value: [{ pubkey: mockSplAddress }] }))
			}))
		} as unknown as Rpc<SolanaRpcApi>;
		const mockRpcSubscriptions = {} as RpcSubscriptions<SolanaRpcSubscriptionsApi>;

		let spyMapNetworkIdToNetwork: MockInstance;
		let spyPipe: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(solanaHttpRpc).mockReturnValue(mockRpc);
			vi.mocked(solanaWebSocketRpc).mockReturnValue(mockRpcSubscriptions);
			vi.mocked(signWithSchnorr).mockResolvedValue(new Uint8Array([0, 1, 2, 3]));
			vi.mocked(sendAndConfirmTransactionFactory).mockReturnValue(() => Promise.resolve());

			spyMapNetworkIdToNetwork = vi.spyOn(networkUtils, 'mapNetworkIdToNetwork');
			spyPipe = vi.spyOn(solanaFunctional, 'pipe').mockImplementation(vi.fn());
		});

		it('should send SOL successfully', async () => {
			await expect(
				sendSol({
					identity: mockIdentity,
					token: SOLANA_TOKEN,
					amount: mockAmount,
					destination: mockDestination,
					source: mockSource,
					onProgress: vi.fn()
				})
			).resolves.not.toThrow();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(SOLANA_TOKEN.network.id);
			expect(spyPipe).toHaveBeenCalled();
		});

		it('should send SPL tokens successfully', async () => {
			await expect(
				sendSol({
					identity: mockIdentity,
					token: DEVNET_USDC_TOKEN,
					amount: mockAmount,
					destination: mockDestination,
					source: mockSource,
					onProgress: vi.fn()
				})
			).resolves.not.toThrow();

			expect(spyMapNetworkIdToNetwork).toHaveBeenCalledWith(DEVNET_USDC_TOKEN.network.id);
			expect(spyPipe).toHaveBeenCalled();
		});

		it('should throw an error if network is invalid', async () => {
			spyMapNetworkIdToNetwork.mockReturnValueOnce(undefined);

			await expect(
				sendSol({
					identity: mockIdentity,
					token: SOLANA_TOKEN,
					amount: mockAmount,
					destination: mockDestination,
					source: mockSource,
					onProgress: vi.fn()
				})
			).rejects.toThrowError(
				replacePlaceholders(en.init.error.no_solana_network, {
					$network: SOLANA_TOKEN.network.id.description ?? ''
				})
			);
		});

		it('should throw an error if no token accounts are found', async () => {
			vi.mocked(solanaHttpRpc).mockReturnValue({
				getTokenAccountsByOwner: vi.fn(() => ({
					send: vi.fn(() => Promise.resolve({ value: [] }))
				}))
			} as unknown as Rpc<SolanaRpcApi>);

			await expect(
				sendSol({
					identity: mockIdentity,
					token: DEVNET_USDC_TOKEN,
					amount: mockAmount,
					destination: mockDestination,
					source: mockSource,
					onProgress: vi.fn()
				})
			).rejects.toThrowError(
				`Token account not found for wallet ${mockSource} and token ${DEVNET_USDC_TOKEN.address} on devnet network`
			);
		});
	});
});
