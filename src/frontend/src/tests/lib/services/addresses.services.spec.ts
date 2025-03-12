import {
	loadBtcAddressMainnet,
	loadIdbBtcAddressMainnet
} from '$btc/services/btc-address.services';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { loadEthAddress, loadIdbEthAddress } from '$eth/services/eth-address.services';
import { loadAddresses, loadIdbAddresses } from '$lib/services/addresses.services';
import { LoadIdbAddressError } from '$lib/types/errors';
import {
	loadIdbSolAddressMainnet,
	loadSolAddressMainnet
} from '$sol/services/sol-address.services';

vi.mock('$btc/services/btc-address.services');
vi.mock('$eth/services/eth-address.services');
vi.mock('$sol/services/sol-address.services');

describe('addresses.services', () => {
	const mockSuccess = { success: true };

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(loadBtcAddressMainnet).mockResolvedValue(mockSuccess);
		vi.mocked(loadEthAddress).mockResolvedValue(mockSuccess);
		vi.mocked(loadSolAddressMainnet).mockResolvedValue(mockSuccess);
		vi.mocked(loadIdbBtcAddressMainnet).mockResolvedValue(mockSuccess);
		vi.mocked(loadIdbEthAddress).mockResolvedValue(mockSuccess);
		vi.mocked(loadIdbSolAddressMainnet).mockResolvedValue(mockSuccess);
	});

	describe('loadAddresses', () => {
		it('should load addresses for all supported token IDs when Solana is enabled', async () => {
			const tokenIds = [BTC_MAINNET_TOKEN_ID, ETHEREUM_TOKEN_ID, SOLANA_TOKEN_ID];

			const result = await loadAddresses(tokenIds);

			expect(result).toEqual({ success: true });
			expect(loadBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadEthAddress).toHaveBeenCalledOnce();
			expect(loadSolAddressMainnet).toHaveBeenCalledOnce();
		});

		it('should load addresses only for provided token IDs', async () => {
			const tokenIds = [BTC_MAINNET_TOKEN_ID];

			const result = await loadAddresses(tokenIds);

			expect(result).toEqual({ success: true });
			expect(loadBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadEthAddress).not.toHaveBeenCalled();
			expect(loadSolAddressMainnet).not.toHaveBeenCalled();
		});
	});

	describe('loadIdbAddresses', () => {
		it('should load IndexedDB addresses for all networks when Solana is enabled', async () => {
			const result = await loadIdbAddresses();

			expect(result).toEqual({ success: true });
			expect(loadIdbBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadIdbEthAddress).toHaveBeenCalledOnce();
			expect(loadIdbSolAddressMainnet).toHaveBeenCalledOnce();
		});

		it('should handle failure when one network fails during IndexedDB loading', async () => {
			const mockError = new LoadIdbAddressError(BTC_MAINNET_TOKEN_ID);
			vi.mocked(loadIdbBtcAddressMainnet).mockResolvedValue({
				success: false,
				err: mockError
			});

			const result = await loadIdbAddresses();

			expect(result).toEqual({
				success: false,
				err: [mockError]
			});
			expect(loadIdbBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadIdbEthAddress).toHaveBeenCalledOnce();
			expect(loadIdbSolAddressMainnet).toHaveBeenCalledOnce();
		});
	});
});
