import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { infuraLifiProviders } from '$eth/providers/infura-lifi.providers';
import { assertLifiEvmCalldata } from '$lib/services/lifi-calldata.services';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import {
	mockLifiCalldataAcrossEvm,
	mockLifiCalldataSameChain
} from '$tests/mocks/lifi-calldata.mock';

vi.mock('$eth/providers/infura-lifi.providers', () => ({
	infuraLifiProviders: vi.fn()
}));

describe('lifi-calldata.services', () => {
	const diamond = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';

	const isContractSelectorWhitelisted = vi.fn();

	const assertFixture = ({
		fixture: { quote, request, toAmountMin },
		sourceNetworkId = BASE_NETWORK_ID
	}: {
		fixture: typeof mockLifiCalldataSameChain;
		sourceNetworkId?: NetworkId;
	}) =>
		assertLifiEvmCalldata({
			quote,
			request,
			sourceNetworkId,
			displayedToAmountMin: toAmountMin,
			userTokenAddresses: []
		});

	beforeEach(() => {
		vi.clearAllMocks();

		isContractSelectorWhitelisted.mockResolvedValue(true);

		vi.mocked(infuraLifiProviders).mockReturnValue({
			isContractSelectorWhitelisted
		} as unknown as ReturnType<typeof infuraLifiProviders>);
	});

	it("should accept calldata whose every swap call is on the Diamond's whitelist", async () => {
		await expect(assertFixture({ fixture: mockLifiCalldataSameChain })).resolves.toBeUndefined();

		expect(infuraLifiProviders).toHaveBeenCalledExactlyOnceWith(BASE_NETWORK_ID);
		expect(isContractSelectorWhitelisted).toHaveBeenCalledTimes(2);
		expect(isContractSelectorWhitelisted).toHaveBeenCalledWith({
			diamond,
			contract: '0xCE40449B773a3E6E5e769ADb4e567179d4828cbd',
			selector: '0x0e8ae67f'
		});
		expect(isContractSelectorWhitelisted).toHaveBeenCalledWith({
			diamond,
			contract: '0xC87De04e2EC1F4282dFF2933A2D58199f688fC3d',
			selector: '0x3f0bde25'
		});
	});

	it('should refuse calldata with a swap call off the whitelist', async () => {
		isContractSelectorWhitelisted.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

		await expect(assertFixture({ fixture: mockLifiCalldataSameChain })).rejects.toThrow(
			LifiQuoteRejectedError
		);
	});

	it('should refuse when the whitelist cannot be read', async () => {
		isContractSelectorWhitelisted.mockRejectedValue(new Error('rpc down'));

		await expect(assertFixture({ fixture: mockLifiCalldataAcrossEvm })).rejects.toThrow('rpc down');
	});

	it('should refuse calldata that fails the binding, before reading the whitelist', async () => {
		await expect(
			assertFixture({
				fixture: { ...mockLifiCalldataAcrossEvm, request: mockLifiCalldataSameChain.request }
			})
		).rejects.toThrow(LifiQuoteRejectedError);

		expect(isContractSelectorWhitelisted).not.toHaveBeenCalled();
	});

	it('should refuse a network without a pinned Diamond', async () => {
		await expect(
			assertFixture({ fixture: mockLifiCalldataSameChain, sourceNetworkId: SEPOLIA_NETWORK_ID })
		).rejects.toThrow(LifiQuoteRejectedError);

		expect(infuraLifiProviders).not.toHaveBeenCalled();
	});
});
