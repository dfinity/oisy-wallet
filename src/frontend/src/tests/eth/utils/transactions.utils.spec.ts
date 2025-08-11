import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import type { Erc20Token } from '$eth/types/erc20';
import {
	decodeErc20AbiDataValue,
	mapAddressToName,
	mapEthTransactionUi
} from '$eth/utils/transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { EthAddress, OptionEthAddress } from '$lib/types/address';
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
import type { MinterInfo } from '@dfinity/cketh';

const transaction: Transaction = {
	blockNumber: 123456,
	from: '0x1234',
	to: '0xabcd',
	timestamp: 1670000000,
	nonce: 1,
	gasLimit: ZERO,
	value: ZERO,
	chainId: 1n
};

const ckMinterInfoAddresses: EthAddress[] = ['0xffff'];

const ethAddress: OptionEthAddress = '0xffff';

describe('transactions.utils', () => {
	describe('mapAddressToName', () => {
		const mockAddress: EthAddress = mockEthAddress;
		const mockNetworkId: NetworkId = ETHEREUM_NETWORK_ID;
		const mockErc20Tokens: Erc20Token[] = [USDC_TOKEN, SEPOLIA_USDC_TOKEN, PEPE_TOKEN];
		const mockMinterInfo: CertifiedData<MinterInfo> = {
			data: mockCkMinterInfo,
			certified: false
		};

		const mockParams = {
			address: mockAddress,
			networkId: mockNetworkId,
			erc20Tokens: mockErc20Tokens,
			ckMinterInfo: mockMinterInfo
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

		it('should return undefined if the CK Helper Contract info are nullish', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: mockEthHelperContractAddress,
					ckMinterInfo: undefined
				})
			).toBeUndefined();

			expect(
				mapAddressToName({
					...mockParams,
					address: mockErc20HelperContractAddress,
					ckMinterInfo: null
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
});
