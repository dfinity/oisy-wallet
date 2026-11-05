import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import {
	infuraErc20Providers,
	type InfuraErc20Provider
} from '$eth/providers/infura-erc20.providers';
import { loadUnlistedErc20TokenData } from '$eth/services/erc20-unlisted.services';

vi.mock('$eth/providers/infura-erc20.providers', () => ({
	InfuraErc20Provider: vi.fn(class {}),
	infuraErc20Providers: vi.fn()
}));

describe('erc20-unlisted.services', () => {
	describe('loadUnlistedErc20TokenData', () => {
		const address = '0x45804880De22913dAFE09f4980848ECE6EcbAf78';
		const owner = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';

		const mockDecimals = vi.fn();
		const mockSymbol = vi.fn();
		const mockBalance = vi.fn();

		const params = { address, networkId: ETHEREUM_NETWORK_ID, owner };

		beforeEach(() => {
			vi.clearAllMocks();

			mockDecimals.mockResolvedValue(18);
			mockSymbol.mockResolvedValue('PAXG');
			mockBalance.mockResolvedValue(2_500_000_000_000_000_000n);

			vi.mocked(infuraErc20Providers).mockReturnValue({
				decimals: mockDecimals,
				symbol: mockSymbol,
				balance: mockBalance
			} as unknown as InfuraErc20Provider);
		});

		it('should read the decimals, the symbol and the balance of the owner from the contract', async () => {
			await expect(loadUnlistedErc20TokenData(params)).resolves.toStrictEqual({
				decimals: 18,
				symbol: 'PAXG',
				balance: 2_500_000_000_000_000_000n
			});

			expect(infuraErc20Providers).toHaveBeenCalledExactlyOnceWith(ETHEREUM_NETWORK_ID);
			expect(mockDecimals).toHaveBeenCalledExactlyOnceWith({ address });
			expect(mockSymbol).toHaveBeenCalledExactlyOnceWith({ address });
			expect(mockBalance).toHaveBeenCalledExactlyOnceWith({
				contract: { address },
				address: owner
			});
		});

		it('should state the token without a symbol when the contract reports none', async () => {
			mockSymbol.mockRejectedValue(new Error('no symbol'));

			await expect(loadUnlistedErc20TokenData(params)).resolves.toStrictEqual({
				decimals: 18,
				balance: 2_500_000_000_000_000_000n
			});
		});

		it('should state the token without a balance when the contract does not report it', async () => {
			mockBalance.mockRejectedValue(new Error('no balance'));

			await expect(loadUnlistedErc20TokenData(params)).resolves.toStrictEqual({
				decimals: 18,
				symbol: 'PAXG'
			});
		});

		it('should not ask for a balance without an address to read it for', async () => {
			await expect(
				loadUnlistedErc20TokenData({ ...params, owner: undefined })
			).resolves.toStrictEqual({ decimals: 18, symbol: 'PAXG' });

			expect(mockBalance).not.toHaveBeenCalled();
		});

		// An ERC-721 contract shares the `approve` selector and has no `decimals`.
		it('should read nothing when the contract does not answer for its decimals', async () => {
			mockDecimals.mockRejectedValue(new Error('no decimals'));

			await expect(loadUnlistedErc20TokenData(params)).resolves.toBeUndefined();
		});

		it.each([81, 255])(
			'should read nothing for %s decimals, more than an amount can be formatted in',
			async (decimals) => {
				mockDecimals.mockResolvedValue(decimals);

				await expect(loadUnlistedErc20TokenData(params)).resolves.toBeUndefined();
			}
		);

		it('should keep a symbol that is not a string out of the result', async () => {
			mockSymbol.mockResolvedValue(42);

			await expect(loadUnlistedErc20TokenData(params)).resolves.toStrictEqual({
				decimals: 18,
				balance: 2_500_000_000_000_000_000n
			});
		});

		it('should not throw when the network has no provider', async () => {
			vi.mocked(infuraErc20Providers).mockImplementation(() => {
				throw new Error('no provider');
			});

			await expect(loadUnlistedErc20TokenData(params)).resolves.toBeUndefined();
		});
	});
});
