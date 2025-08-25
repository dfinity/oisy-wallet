import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { Erc165Identifier } from '$eth/constants/erc.constants';
import { ERC165_ABI } from '$eth/constants/erc165.constants';
import { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
import { Contract } from 'ethers/contract';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

describe('infura-erc165.providers', () => {
	const INFURA_API_KEY = 'test-api-key';

	describe('InfuraErc165Provider', () => {
		const {
			providers: { infura }
		} = ETHEREUM_NETWORK;
		const { address: contractAddress } = PEPE_TOKEN;

		const mockProvider = vi.mocked(InfuraProviderLib);
		const expectedContractParams = [contractAddress, ERC165_ABI];

		const mockContract = vi.mocked(Contract);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialise the provider with the correct network and API key', () => {
			const provider = new InfuraErc165Provider(infura);

			expect(provider).toBeDefined();
			expect(InfuraProviderLib).toHaveBeenCalledWith(infura, INFURA_API_KEY);
		});

		describe('isSupportedInterface', () => {
			const mockSupportedInterface = vi.fn();

			const mockParams = {
				contract: { address: contractAddress },
				interfaceId: Erc165Identifier.ERC165
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockSupportedInterface.mockResolvedValue(true);

				mockContract.prototype.supportsInterface =
					mockSupportedInterface as unknown as typeof mockContract.prototype.supportsInterface;
			});

			it.each(Object.entries(Erc165Identifier))(
				`should return true for supported interface %s`,
				// eslint-disable-next-line local-rules/prefer-object-params
				async (_, interfaceId) => {
					const provider = new InfuraErc165Provider(infura);

					await expect(
						provider.isSupportedInterface({
							contract: { address: contractAddress },
							interfaceId
						})
					).resolves.toBeTruthy();
				}
			);

			it('should return false if the method is not supported', async () => {
				const errorMessage = 'Mock error message';
				mockSupportedInterface.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc165Provider(infura);

				await expect(provider.isSupportedInterface(mockParams)).resolves.toBeFalsy();
			});

			it('should call the supportsInterface method of the contract', async () => {
				const provider = new InfuraErc165Provider(infura);

				await provider.isSupportedInterface(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledExactlyOnceWith(
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockSupportedInterface).toHaveBeenCalledExactlyOnceWith(mockParams.interfaceId);
			});
		});
	});
});
