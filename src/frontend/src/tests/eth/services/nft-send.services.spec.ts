import {
	encodeErc1155SafeTransfer,
	encodeErc721SafeTransfer,
	transferErc1155,
	transferErc721
} from '$eth/services/nft-send.services';

import { ERC1155_ABI } from '$eth/constants/erc1155.constants';
import { ERC721_ABI } from '$eth/constants/erc721.constants';
import * as providersMod from '$eth/providers/infura.providers';
import * as signerApi from '$lib/api/signer.api';

import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import { ProgressStepsSend as Steps } from '$lib/enums/progress-steps';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Interface } from 'ethers/abi';
import type { TransactionResponse } from 'ethers/providers';

const iface721 = new Interface(ERC721_ABI);
const iface1155 = new Interface(ERC1155_ABI);

const FROM = '0x8f9c0f4F8d2E3C2a7B1E5D6A4c9B7f3E2d1a6C4B';
const TO = '0x3a1E2B9F5D7c8A4E6F2D9b1C0A7f8E4d6C5b9A2f';
const CONTRACT_721 = '0xf60a44920D51F4264ba0a8EB164A4bC15dc34E92';
const CONTRACT_1155 = '0xd11324e0fd7099499B4B0DC1Ad035F6Db00a3D62';

describe('nft-send.services', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		mockAuthStore();
	});

	it('encodeErc721SafeTransfer encodes selector + args correctly', () => {
		const tokenId = 47744;
		const { to, data } = encodeErc721SafeTransfer({
			contractAddress: CONTRACT_721,
			from: FROM,
			to: TO,
			tokenId
		});

		expect(to).toBe(CONTRACT_721);

		const decoded = iface721.decodeFunctionData('safeTransferFrom', data);

		expect(decoded[0]).toBe(FROM);
		expect(decoded[1]).toBe(TO);
		expect(decoded[2]).toEqual(BigInt(tokenId));
	});

	it('encodeErc1155SafeTransfer encodes selector + args correctly (default bytes data)', () => {
		const tokenId = 123;
		const amount = 2n;
		const { to, data } = encodeErc1155SafeTransfer({
			contractAddress: CONTRACT_1155,
			from: FROM,
			to: TO,
			tokenId,
			amount
		});

		expect(to).toBe(CONTRACT_1155);

		const decoded = iface1155.decodeFunctionData('safeTransferFrom', data);

		expect(decoded[0]).toBe(FROM);
		expect(decoded[1]).toBe(TO);
		expect(decoded[2]).toEqual(BigInt(tokenId));
		expect(decoded[3]).toEqual(amount);
		expect(decoded[4]).toBe('0x');
	});

	it('encodeErc1155SafeTransfer accepts explicit bytes data', () => {
		const tokenId = 9;
		const amount = 1n;
		const extra = '0x1234';
		const { data } = encodeErc1155SafeTransfer({
			contractAddress: CONTRACT_1155,
			from: FROM,
			to: TO,
			tokenId,
			amount,
			data: extra
		});

		const decoded = iface1155.decodeFunctionData('safeTransferFrom', data);

		expect(decoded[4]).toBe(extra);
	});
});

describe('transferErc721', () => {
	it('builds, signs, sends and reports progress', async () => {
		const nonce = 23;
		const gas = 70_492n;
		const maxFeePerGas = 5_481_328n;
		const maxPriorityFeePerGas = 2_000_000n;

		const fakeTx = {
			hash: '0xabc',
			to: CONTRACT_721,
			from: FROM
		} as unknown as TransactionResponse;

		const sendTransaction = vi.fn().mockResolvedValue(fakeTx);
		const getTransactionCount = vi.fn().mockResolvedValue(nonce);

		vi.spyOn(providersMod, 'infuraProviders').mockReturnValue({
			getTransactionCount,
			sendTransaction
		} as unknown as InfuraProvider);

		const signTransactionSpy = vi.spyOn(signerApi, 'signTransaction').mockResolvedValue('0xsigned');

		const steps: Steps[] = [];
		const identity = mockIdentity;

		const result = await transferErc721({
			identity,
			sourceNetwork: BASE_NETWORK,
			to: TO,
			from: FROM,
			tokenId: 47744,
			contractAddress: CONTRACT_721,
			gas,
			maxFeePerGas,
			maxPriorityFeePerGas,
			progress: (s) => steps.push(s)
		});

		expect(providersMod.infuraProviders).toHaveBeenCalledWith(BASE_NETWORK.id);
		expect(getTransactionCount).toHaveBeenCalledWith(FROM);
		expect(signTransactionSpy).toHaveBeenCalledOnce();

		const signedReq = signTransactionSpy.mock.calls[0][0].transaction;

		expect(signedReq.to).toBe(CONTRACT_721);
		expect(signedReq.chain_id).toBe(BASE_NETWORK.chainId);
		expect(signedReq.nonce).toBe(BigInt(nonce));
		expect(signedReq.gas).toBe(gas);
		expect(signedReq.max_fee_per_gas).toBe(maxFeePerGas);
		expect(signedReq.max_priority_fee_per_gas).toBe(maxPriorityFeePerGas);
		expect(Array.isArray(signedReq.data)).toBeTruthy();
		expect(signedReq.data).toHaveLength(1);
		expect(sendTransaction).toHaveBeenCalledWith('0xsigned');
		expect(steps).toEqual([Steps.SIGN_TRANSFER, Steps.TRANSFER]);
		expect(result).toBe(fakeTx);
	});
});

describe('transferErc1155', () => {
	it('builds, signs, sends and reports progress', async () => {
		const nonce = 7;
		const gas = 90_000n;
		const maxFeePerGas = 10_000_000n;
		const maxPriorityFeePerGas = 3_000_000n;

		const fakeTx = {
			hash: '0xdef',
			to: CONTRACT_1155,
			from: FROM
		} as unknown as TransactionResponse;

		const sendTransaction = vi.fn().mockResolvedValue(fakeTx);
		const getTransactionCount = vi.fn().mockResolvedValue(nonce);
		vi.spyOn(providersMod, 'infuraProviders').mockReturnValue({
			getTransactionCount,
			sendTransaction
		} as unknown as InfuraProvider);

		const signTransactionSpy = vi
			.spyOn(signerApi, 'signTransaction')
			.mockResolvedValue('0xsigned1155');

		const steps: Steps[] = [];
		const identity = mockIdentity;

		const result = await transferErc1155({
			identity,
			sourceNetwork: BASE_NETWORK,
			to: TO,
			from: FROM,
			id: 123,
			amount: 2n,
			contractAddress: CONTRACT_1155,
			gas,
			maxFeePerGas,
			maxPriorityFeePerGas,
			progress: (s) => steps.push(s)
		});

		expect(providersMod.infuraProviders).toHaveBeenCalledWith(BASE_NETWORK.id);
		expect(getTransactionCount).toHaveBeenCalledWith(FROM);
		expect(signTransactionSpy).toHaveBeenCalledOnce();

		const signedReq = signTransactionSpy.mock.calls[0][0].transaction;

		expect(signedReq.to).toBe(CONTRACT_1155);
		expect(signedReq.chain_id).toBe(BASE_NETWORK.chainId);
		expect(signedReq.nonce).toBe(BigInt(nonce));
		expect(signedReq.gas).toBe(gas);
		expect(signedReq.max_fee_per_gas).toBe(maxFeePerGas);
		expect(signedReq.max_priority_fee_per_gas).toBe(maxPriorityFeePerGas);
		expect(Array.isArray(signedReq.data)).toBeTruthy();
		expect(signedReq.data).toHaveLength(1);
		expect((signedReq.data[0] as string).startsWith('0xf242432a')).toBeTruthy();
		expect(sendTransaction).toHaveBeenCalledWith('0xsigned1155');
		expect(steps).toEqual([Steps.SIGN_TRANSFER, Steps.TRANSFER]);
		expect(result).toBe(fakeTx);
	});
});
