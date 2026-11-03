import { BASE_NETWORK, BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { ERC20_ABI } from '$eth/constants/erc20.constants';
import { LIFI_WHITELIST_MANAGER_ABI } from '$eth/constants/lifi.constants';
import { InfuraLifiProvider, infuraLifiProviders } from '$eth/providers/infura-lifi.providers';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { Contract } from 'ethers/contract';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

describe('infura-lifi.providers', () => {
	const diamond = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
	const contract = '0xCE40449B773a3E6E5e769ADb4e567179d4828cbd';
	const selector = '0x332d746b';

	const mockContract = vi.mocked(Contract);
	const isContractSelectorWhitelisted = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		mockContract.prototype.isContractSelectorWhitelisted =
			isContractSelectorWhitelisted as unknown as typeof mockContract.prototype.isContractSelectorWhitelisted;
	});

	describe('isContractSelectorWhitelisted', () => {
		it("should ask the Diamond's whitelist about the call", async () => {
			isContractSelectorWhitelisted.mockResolvedValue(true);

			const provider = new InfuraLifiProvider(BASE_NETWORK);

			await expect(
				provider.isContractSelectorWhitelisted({ diamond, contract, selector })
			).resolves.toBeTruthy();

			expect(mockContract).toHaveBeenCalledExactlyOnceWith(
				diamond,
				LIFI_WHITELIST_MANAGER_ABI,
				new (vi.mocked(InfuraProviderLib))()
			);
			expect(isContractSelectorWhitelisted).toHaveBeenCalledExactlyOnceWith(contract, selector);
		});

		it('should report a call off the whitelist', async () => {
			isContractSelectorWhitelisted.mockResolvedValue(false);

			await expect(
				new InfuraLifiProvider(BASE_NETWORK).isContractSelectorWhitelisted({
					diamond,
					contract,
					selector
				})
			).resolves.toBeFalsy();
		});
	});

	describe('allowance', () => {
		it('should read the allowance from the token contract', async () => {
			const tokenAllowance = vi.fn().mockResolvedValue(5n);
			const token = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
			const owner = '0x000000000000000000000000000000000000dEaD';

			mockContract.prototype.allowance =
				tokenAllowance as unknown as typeof mockContract.prototype.allowance;

			await expect(
				new InfuraLifiProvider(BASE_NETWORK).allowance({ token, owner, spender: diamond })
			).resolves.toBe(5n);

			expect(mockContract).toHaveBeenCalledExactlyOnceWith(
				token,
				ERC20_ABI,
				new (vi.mocked(InfuraProviderLib))()
			);
			expect(tokenAllowance).toHaveBeenCalledExactlyOnceWith(owner, diamond);
		});
	});

	describe('infuraLifiProviders', () => {
		it('should return the provider of a supported network', () => {
			expect(infuraLifiProviders(BASE_NETWORK_ID)).toBeInstanceOf(InfuraLifiProvider);
		});

		it('should throw for a network without one', () => {
			expect(() => infuraLifiProviders(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_infura_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
