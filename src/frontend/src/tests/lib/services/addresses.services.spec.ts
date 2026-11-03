import { loadBtcAddressMainnet } from '$btc/services/btc-address.services';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { XRP_MAINNET_NETWORK_ID } from '$env/networks/networks.xrp.env';
import { loadEthAddress } from '$eth/services/eth-address.services';
import { loadAddresses } from '$lib/services/addresses.services';
import { loadSolAddressMainnet } from '$sol/services/sol-address.services';
import { loadXrpAddressMainnet } from '$xrp/services/xrp-address.services';

vi.mock('$btc/services/btc-address.services');
vi.mock('$eth/services/eth-address.services');
vi.mock('$sol/services/sol-address.services');
vi.mock('$xrp/services/xrp-address.services');

describe('addresses.services', () => {
	const mockSuccess = { success: true };

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(loadBtcAddressMainnet).mockResolvedValue(mockSuccess);
		vi.mocked(loadEthAddress).mockResolvedValue(mockSuccess);
		vi.mocked(loadSolAddressMainnet).mockResolvedValue(mockSuccess);
		vi.mocked(loadXrpAddressMainnet).mockResolvedValue(mockSuccess);
	});

	describe('loadAddresses', () => {
		it('should load addresses for all supported token IDs when Solana and XRP are enabled', async () => {
			const networkIds = [
				BTC_MAINNET_NETWORK_ID,
				ETHEREUM_NETWORK_ID,
				SOLANA_MAINNET_NETWORK_ID,
				XRP_MAINNET_NETWORK_ID
			];

			const result = await loadAddresses(networkIds);

			expect(result).toEqual({ success: true });
			expect(loadBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadEthAddress).toHaveBeenCalledOnce();
			expect(loadSolAddressMainnet).toHaveBeenCalledOnce();
			expect(loadXrpAddressMainnet).toHaveBeenCalledOnce();
		});

		it('should load addresses only for provided token IDs', async () => {
			const networkIds = [BTC_MAINNET_NETWORK_ID];

			const result = await loadAddresses(networkIds);

			expect(result).toEqual({ success: true });
			expect(loadBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadEthAddress).not.toHaveBeenCalled();
			expect(loadSolAddressMainnet).not.toHaveBeenCalled();
			expect(loadXrpAddressMainnet).not.toHaveBeenCalled();
		});

		it('should handle empty networkIds array', async () => {
			const result = await loadAddresses([]);

			expect(result).toEqual({ success: true });
			expect(loadBtcAddressMainnet).not.toHaveBeenCalled();
			expect(loadEthAddress).not.toHaveBeenCalled();
			expect(loadSolAddressMainnet).not.toHaveBeenCalled();
			expect(loadXrpAddressMainnet).not.toHaveBeenCalled();
		});

		it('should report failure when the XRP loader fails', async () => {
			vi.mocked(loadXrpAddressMainnet).mockResolvedValue({ success: false });

			const result = await loadAddresses([XRP_MAINNET_NETWORK_ID]);

			expect(result).toEqual({ success: false });
		});
	});
});
