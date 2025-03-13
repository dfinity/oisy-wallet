import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { mapAddressToName, mapEthTransactionUi } from '$eth/utils/transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { OptionEthAddress } from '$lib/types/address';
import type { Transaction } from '$lib/types/transaction';
import { mockEthAddress } from '$tests/mocks/eth.mocks';

const transaction: Transaction = {
	blockNumber: 123456,
	from: '0x1234',
	to: '0xabcd',
	timestamp: 1670000000,
	nonce: 1,
	gasLimit: ZERO,
	value: ZERO,
	chainId: 1
};

const ckMinterInfoAddresses: OptionEthAddress[] = ['0xffff'];

const $ethAddress: OptionEthAddress = '0xffff';

describe('transactions.utils', () => {
	describe('mapAddressToName', () => {
		const mockAddress = mockEthAddress;
		const mockNetworkId = ETHEREUM_NETWORK_ID;
		const mockErc20Tokens = [USDC_TOKEN, SEPOLIA_USDC_TOKEN, PEPE_TOKEN];

		const mockParams = {
			address: mockAddress,
			networkId: mockNetworkId,
			erc20Tokens: mockErc20Tokens
		};

		it('should return undefined if the address is nullish', () => {
			expect(mapAddressToName({ ...mockParams, address: undefined })).toBeUndefined();

			expect(mapAddressToName({ ...mockParams, address: null })).toBeUndefined();
		});

		it('should return undefined if it does not match any known ERC20 token', () => {
			expect(mapAddressToName(mockParams)).toBeUndefined();
		});

		it('should return the token name if the address matches a known ERC20 token', () => {
			expect(mapAddressToName({ ...mockParams, address: PEPE_TOKEN.address })).toBe(
				PEPE_TOKEN.name
			);

			expect(
				mapAddressToName({
					...mockParams,
					address: SEPOLIA_USDC_TOKEN.address,
					networkId: SEPOLIA_NETWORK_ID
				})
			).toBe(SEPOLIA_USDC_TOKEN.name);
		});

		it('should return undefined if the network does not match', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: PEPE_TOKEN.address,
					networkId: SEPOLIA_NETWORK_ID
				})
			).toBeUndefined();
		});

		it('should return undefined if the ERC20 token is not found', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: PEPE_TOKEN.address,
					erc20Tokens: [USDC_TOKEN, SEPOLIA_USDC_TOKEN]
				})
			).toBeUndefined();

			expect(
				mapAddressToName({
					...mockParams,
					address: SEPOLIA_USDC_TOKEN.address,
					networkId: SEPOLIA_NETWORK_ID,
					erc20Tokens: [USDC_TOKEN, PEPE_TOKEN]
				})
			).toBeUndefined();
		});

		it('should return undefined if the ERC20 token list is empty', () => {
			expect(
				mapAddressToName({ ...mockParams, address: PEPE_TOKEN.address, erc20Tokens: [] })
			).toBeUndefined();
		});
	});

	describe('mapEthTransactionUi', () => {
		it('should map to "withdraw" when the "from" address is in ckMinterInfoAddresses', () => {
			const ckMinterInfoAddresses: OptionEthAddress[] = ['0x1234'];

			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

			expect(result.type).toBe('withdraw');
		});

		it('should map to "deposit" when the "to" address is in ckMinterInfoAddresses', () => {
			const ckMinterInfoAddresses: OptionEthAddress[] = ['0xabcd'];

			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

			expect(result.type).toBe('deposit');
		});

		it('should map to "send" when the "from" address matches the $ethAddress', () => {
			const result = mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				$ethAddress: '0x1234'
			});

			expect(result.type).toBe('send');
		});

		it('should map to "receive" when none of the other conditions match', () => {
			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

			expect(result.type).toBe('receive');
		});

		it('should map to "receive" when it does not match MinterInfoAddresses and $ethAddress is undefined', () => {
			const result = mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				$ethAddress: undefined
			});

			expect(result.type).toBe('receive');
		});

		it('should not map to "withdraw" or to "deposit" when the MinterInfoAddresses are empty', () => {
			const ckMinterInfoAddresses: OptionEthAddress[] = [];

			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

			expect(result.type).not.toBe('withdraw');
			expect(result.type).not.toBe('deposit');
		});

		it('should not map to "withdraw" or to "deposit" when the MinterInfoAddresses are undefined', () => {
			const ckMinterInfoAddresses: OptionEthAddress[] = [undefined];

			const result = mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				$ethAddress: undefined
			});

			expect(result.type).not.toBe('withdraw');
			expect(result.type).not.toBe('deposit');
		});

		it('should map an ID to the transaction hash if it exists', () => {
			const result = mapEthTransactionUi({
				transaction: { ...transaction, hash: '0x1234' },
				ckMinterInfoAddresses,
				$ethAddress
			});

			expect(result.id).toBe('0x1234');
		});

		it('should map an ID to undefined if the transaction hash does not exist', () => {
			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

			expect(result.id).toBeUndefined;
		});
	});
});
