import {
	ETHEREUM_NETWORK_ID,
	ETHERSCAN_API_URL_HOMESTEAD,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { EtherscanRest, etherscanRests } from '$eth/rest/etherscan.rest';
import type { Transaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import type { MockedFunction } from 'vitest';

global.fetch = vi.fn();

vi.mock('$env/rest/etherscan.env', () => ({
	ETHERSCAN_API_KEY: 'test-api-key'
}));

describe('etherscan.rest', () => {
	describe('EtherscanRest', () => {
		const API_URL = ETHERSCAN_API_URL_HOMESTEAD;

		const mockApiResponse = {
			status: '1',
			message: 'OK',
			result: [
				{
					nonce: '1',
					gas: '21000',
					gasPrice: '20000000000',
					hash: '0x123abc',
					blockNumber: '123456',
					blockHash: '0x456def',
					timeStamp: '1697049600',
					confirmations: '10',
					from: '0xabc...',
					to: '0xdef...',
					value: '1000000000000000000'
				}
			]
		};

		const expectedTransaction: Transaction = {
			hash: '0x123abc',
			blockNumber: 123456,
			timestamp: 1697049600,
			from: '0xabc...',
			to: '0xdef...',
			nonce: 1,
			gasLimit: 21000n,
			gasPrice: 20000000000n,
			value: 1000000000000000000n,
			chainId: 0n
		};

		const mockEtherscanErrorResponse = {
			status: '0',
			message: 'NOTOK',
			result: 'Invalid API Key'
		};

		it('should fetch and map transactions correctly', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => mockApiResponse
			} as unknown as Response);

			const mockFetch = fetch as MockedFunction<typeof fetch>;

			const etherscanRest = new EtherscanRest(API_URL);

			const result = await etherscanRest.transactions({
				address: mockEthAddress,
				contract: mockValidErc20Token
			});

			const urlString = mockFetch.mock.calls[0][0].toString();

			expect(fetch).toHaveBeenCalledOnce();
			expect(urlString).toBe(
				`${API_URL}?module=account&action=tokentx&contractaddress=${mockValidErc20Token.address}&address=${mockEthAddress}&startblock=0&endblock=99999999&sort=desc&apikey=test-api-key`
			);

			expect(result).toEqual([expectedTransaction]);
		});

		it('should throw an error if the API response status is not OK', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => mockEtherscanErrorResponse
			} as unknown as Response);

			const etherscanRest = new EtherscanRest(API_URL);

			await expect(
				etherscanRest.transactions({
					address: mockEthAddress,
					contract: mockValidErc20Token
				})
			).rejects.toThrow(mockEtherscanErrorResponse.result);
		});

		it('should throw an error if the API call fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false
			} as unknown as Response);

			const etherscanRest = new EtherscanRest(API_URL);

			await expect(
				etherscanRest.transactions({
					address: mockEthAddress,
					contract: mockValidErc20Token
				})
			).rejects.toThrow('Fetching transactions with Etherscan API failed.');
		});
	});

	describe('etherscanRests', () => {
		it('should return the correct provider for Ethereum network', () => {
			expect(etherscanRests(ETHEREUM_NETWORK_ID)).toBeInstanceOf(EtherscanRest);
		});

		it('should return the correct provider for Sepolia network', () => {
			expect(etherscanRests(SEPOLIA_NETWORK_ID)).toBeInstanceOf(EtherscanRest);
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => etherscanRests(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_etherscan_rest_api, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
