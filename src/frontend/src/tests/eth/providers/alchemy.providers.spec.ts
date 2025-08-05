import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { AlchemyProvider, alchemyProviders } from '$eth/providers/alchemy.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { Alchemy } from 'alchemy-sdk';
import { assertIsInstructionWithAccounts } from '@solana/kit';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { Network } from 'ethers/providers';

vi.mock(import('alchemy-sdk'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		Alchemy: vi.fn()
	};
});

vi.mock('$env/rest/alchemy.env', () => ({
	ALCHEMY_API_KEY: 'test-api-key'
}));

describe('alchemy.providers', () => {
	const ALCHEMY_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	// it('should create the correct map of providers', () => {
	// 	expect(Alchemy).toHaveBeenCalledTimes(networks.length);
	//
	// 	networks.forEach(({ providers: { alchemy } }, index) => {
	// 		expect(Alchemy).toHaveBeenNthCalledWith(index + 1, {
	// 			apiKey: ALCHEMY_API_KEY,
	// 			network: alchemy
	// 		});
	// 	});
	// });

	describe('getNftIdsForOwner', () => {
		const mockApiResponse = [
			{
				ownedNfts: [
					{ tokenId: '1' },
					{ tokenId: '2' }
				]
			}
		]

		beforeEach(() => {
			vi.clearAllMocks();

			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftsForOwner: vi.fn().mockResolvedValue(mockApiResponse)
				},
				configurable: true
			});
		});

		it('Wusch', async () => {
			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const tokenIds = await provider.getNftIdsForOwner({
				address: mockEthAddress,
				contractAddress: mockValidErc1155Token.address
			});
		});
	});

	// describe('alchemyProviders', () => {
	// 	networks.forEach(({ id, name }) => {
	// 		it(`should return the correct provider for ${name} network`, () => {
	// 			const provider = alchemyProviders(id);
	//
	// 			expect(provider).toBeInstanceOf(AlchemyProvider);
	//
	// 			expect(provider).toHaveProperty('provider');
	// 		});
	// 	});
	//
	// 	it('should throw an error for an unsupported network ID', () => {
	// 		expect(() => alchemyProviders(ICP_NETWORK_ID)).toThrow(
	// 			replacePlaceholders(en.init.error.no_alchemy_provider, {
	// 				$network: ICP_NETWORK_ID.toString()
	// 			})
	// 		);
	// 	});
	// });
});
