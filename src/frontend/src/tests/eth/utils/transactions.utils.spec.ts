import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ERC20_APPROVE_HASH } from '$eth/constants/erc20.constants';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import {
	decodeErc20AbiData,
	decodeErc20AbiDataValue,
	isMaxUint256,
	mapAddressToName,
	mapEthTransactionUi
} from '$eth/utils/transactions.utils';
import { toCkMinterBuiltInContacts } from '$icp-eth/utils/ck-minter-contacts.utils';
import { MAX_UINT_256, ZERO } from '$lib/constants/app.constants';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkId } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import type { Transaction } from '$lib/types/transaction';
import {
	mockCkEthereumMinterAddress,
	mockCkMinterInfo,
	mockErc20HelperContractAddress,
	mockEthHelperContractAddress
} from '$tests/mocks/ck-minter.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';

const transaction: Transaction = {
	blockNumber: 123456,
	from: '0x1234',
	to: '0xabcd',
	timestamp: 1670000000,
	nonce: 1,
	gasLimit: ZERO,
	value: ZERO,
	chainId: 1n,
	data: '0x'
};

const ckMinterInfoAddresses: EthAddress[] = ['0xffff'];

const ethAddress: OptionEthAddress = '0xffff';

describe('transactions.utils', () => {
	describe('mapAddressToName', () => {
		const mockAddress: EthAddress = mockEthAddress;
		const mockNetworkId: NetworkId = ETHEREUM_NETWORK_ID;
		const mockErc20Tokens: Erc20Token[] = [USDC_TOKEN, SEPOLIA_USDC_TOKEN, PEPE_TOKEN];
		const mockMinterInfo: CertifiedData<CkEthMinterDid.MinterInfo> = {
			data: mockCkMinterInfo,
			certified: false
		};

		const mockBuiltInContacts: ContactUi[] = toCkMinterBuiltInContacts({
			minterInfo: mockMinterInfo
		});

		const mockParams = {
			address: mockAddress,
			networkId: mockNetworkId,
			erc20Tokens: mockErc20Tokens,
			builtInContacts: mockBuiltInContacts
		};

		it('should return undefined if the address is nullish', () => {
			expect(mapAddressToName({ ...mockParams, address: undefined })).toBeUndefined();

			expect(mapAddressToName({ ...mockParams, address: null })).toBeUndefined();
		});

		it('should return undefined if it does not match any known ERC20 token nor any CK Helper contracts', () => {
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

		it('should return the ckETH Helper Contract name if the address matches the ckETH Helper Contract', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: mockEthHelperContractAddress
				})
			).toBe('ckETH Minter Helper Contract');
		});

		it('should return the ckERC20 Helper Contract name if the address matches the ckERC20 Helper Contract', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: mockErc20HelperContractAddress
				})
			).toBe('ckERC20 Minter Helper Contract');
		});

		it('should return the CK Minter name if the address matches the CK Minter', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: mockCkEthereumMinterAddress
				})
			).toBe('CK Ethereum Minter');
		});

		it('should return undefined if no built-in contacts are provided', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: mockEthHelperContractAddress,
					builtInContacts: []
				})
			).toBeUndefined();

			expect(
				mapAddressToName({
					...mockParams,
					address: mockErc20HelperContractAddress,
					builtInContacts: undefined
				})
			).toBeUndefined();
		});
	});

	describe('mapEthTransactionUi', () => {
		it('should map to "withdraw" when the "from" address is in ckMinterInfoAddresses', () => {
			const ckMinterInfoAddresses: EthAddress[] = ['0x1234'];

			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.type).toBe('withdraw');
		});

		it('should map to "deposit" when the "to" address is in ckMinterInfoAddresses', () => {
			const ckMinterInfoAddresses: EthAddress[] = ['0xabcd'];

			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.type).toBe('deposit');
		});

		it('should map to "send" when the "from" address matches the ethAddress', () => {
			const result = mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				ethAddress: '0x1234'
			});

			expect(result.type).toBe('send');
		});

		it('should map to "receive" when none of the other conditions match', () => {
			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.type).toBe('receive');
		});

		it('should map to "receive" when it does not match MinterInfoAddresses and ethAddress is undefined', () => {
			const result = mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				ethAddress: undefined
			});

			expect(result.type).toBe('receive');
		});

		it('should not map to "withdraw" or to "deposit" when the MinterInfoAddresses are empty', () => {
			const ckMinterInfoAddresses: EthAddress[] = [];

			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.type).not.toBe('withdraw');
			expect(result.type).not.toBe('deposit');
		});

		it('should map an ID to the transaction hash if it exists', () => {
			const result = mapEthTransactionUi({
				transaction: { ...transaction, hash: '0x1234' },
				ckMinterInfoAddresses,
				ethAddress
			});

			expect(result.id).toBe('0x1234');
		});

		it('should map an ID to empty string if the transaction hash does not exist', () => {
			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.id).toBe('');
		});

		it('should map to "approve" when the transaction data starts with the ERC20 approve hash', () => {
			const approveData = `${ERC20_APPROVE_HASH}000000000000000000000000abcdef1234567890abcdef1234567890abcdef12ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`;

			const result = mapEthTransactionUi({
				transaction: { ...transaction, data: approveData },
				ckMinterInfoAddresses,
				ethAddress
			});

			expect(result.type).toBe('approve');
			expect(result.approveSpender?.toLowerCase()).toBe(
				'0xabcdef1234567890abcdef1234567890abcdef12'
			);
		});

		it('should prioritize approve over other types when data starts with ERC20 approve hash', () => {
			const approveData = `${ERC20_APPROVE_HASH}000000000000000000000000abcdef1234567890abcdef1234567890abcdef12ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`;

			const result = mapEthTransactionUi({
				transaction: { ...transaction, from: '0x1234', data: approveData },
				ckMinterInfoAddresses: ['0x1234'],
				ethAddress
			});

			expect(result.type).toBe('approve');
		});
	});

	describe('decodeErc20AbiData', () => {
		const txData =
			'0x26b3293f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000';
		const result = { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: 1000000n };

		it('should decode ERC20 ABI data correctly if bytesParam is false', () => {
			expect(
				decodeErc20AbiData({
					data: txData
				})
			).toStrictEqual(result);
		});

		it('should decode ERC20 ABI data correctly if bytesParam is true', () => {
			expect(
				decodeErc20AbiData({
					data: txData,
					bytesParam: true
				})
			).toStrictEqual(result);
		});
	});

	describe('decodeErc20AbiDataValue', () => {
		const txData =
			'0x26b3293f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000';
		const result = 1000000n;

		it('should decode ERC20 ABI data value correctly if bytesParam is false', () => {
			expect(
				decodeErc20AbiDataValue({
					data: txData
				})
			).toBe(result);
		});

		it('should decode ERC20 ABI data value correctly if bytesParam is true', () => {
			expect(
				decodeErc20AbiDataValue({
					data: txData,
					bytesParam: true
				})
			).toBe(result);
		});
	});

	describe('isMaxUint256', () => {
		it('should return true for the maximum uint256 value', () => {
			expect(isMaxUint256(MAX_UINT_256)).toBeTruthy();
		});

		it('should return false for a value that is not the maximum uint256', () => {
			expect(isMaxUint256(ZERO)).toBeFalsy();

			expect(isMaxUint256(123456n)).toBeFalsy();

			expect(isMaxUint256(MAX_UINT_256 - 1n)).toBeFalsy();
		});

		it('should return false for nullish values', () => {
			expect(isMaxUint256(null)).toBeFalsy();

			expect(isMaxUint256(undefined)).toBeFalsy();
		});
	});
});
