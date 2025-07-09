import {
	loadBtcAddressMainnet,
	loadIdbBtcAddressMainnet
} from '$btc/services/btc-address.services';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
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
			const networkIds = [BTC_MAINNET_NETWORK_ID, ETHEREUM_NETWORK_ID, SOLANA_MAINNET_NETWORK_ID];

			const result = await loadAddresses(networkIds);

			expect(result).toEqual({ success: true });
			expect(loadBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadEthAddress).toHaveBeenCalledOnce();
			expect(loadSolAddressMainnet).toHaveBeenCalledOnce();
		});

		it('should load addresses only for provided token IDs', async () => {
			const networkIds = [BTC_MAINNET_NETWORK_ID];

			const result = await loadAddresses(networkIds);

			expect(result).toEqual({ success: true });
			expect(loadBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadEthAddress).not.toHaveBeenCalled();
			expect(loadSolAddressMainnet).not.toHaveBeenCalled();
		});

		it('should handle empty networkIds array', async () => {
			const result = await loadAddresses([]);

			expect(result).toEqual({ success: true });
			expect(loadBtcAddressMainnet).not.toHaveBeenCalled();
			expect(loadEthAddress).not.toHaveBeenCalled();
			expect(loadSolAddressMainnet).not.toHaveBeenCalled();
		});
	});

	describe('loadIdbAddresses', () => {
		it('should load IndexedDB addresses for all networks when Solana is enabled', async () => {
			const result = await loadIdbAddresses([
				BTC_MAINNET_NETWORK_ID,
				ETHEREUM_NETWORK_ID,
				SOLANA_MAINNET_NETWORK_ID
			]);

			expect(result).toEqual({ success: true });
			expect(loadIdbBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadIdbEthAddress).toHaveBeenCalledOnce();
			expect(loadIdbSolAddressMainnet).toHaveBeenCalledOnce();
		});

		it('should handle failure when one network fails during IndexedDB loading', async () => {
			const mockError = new LoadIdbAddressError(BTC_MAINNET_NETWORK_ID);
			vi.mocked(loadIdbBtcAddressMainnet).mockResolvedValue({
				success: false,
				err: mockError
			});

			const result = await loadIdbAddresses([
				BTC_MAINNET_NETWORK_ID,
				ETHEREUM_NETWORK_ID,
				SOLANA_MAINNET_NETWORK_ID
			]);

			expect(result).toEqual({
				success: false,
				err: [mockError]
			});
			expect(loadIdbBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadIdbEthAddress).toHaveBeenCalledOnce();
			expect(loadIdbSolAddressMainnet).toHaveBeenCalledOnce();
		});

		it('should not call load for disabled networks', async () => {
			const result = await loadIdbAddresses([BTC_MAINNET_NETWORK_ID, SOLANA_MAINNET_NETWORK_ID]);

			expect(result).toEqual({ success: true });
			expect(loadIdbBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadIdbEthAddress).not.toHaveBeenCalledOnce();
			expect(loadIdbSolAddressMainnet).toHaveBeenCalledOnce();
		});

		it('should not call any if all networks disabled', async () => {
			const result = await loadIdbAddresses([]);

			expect(result).toEqual({ success: true });
			expect(loadIdbBtcAddressMainnet).not.toHaveBeenCalledOnce();
			expect(loadIdbEthAddress).not.toHaveBeenCalledOnce();
			expect(loadIdbSolAddressMainnet).not.toHaveBeenCalledOnce();
		});
	});
});
