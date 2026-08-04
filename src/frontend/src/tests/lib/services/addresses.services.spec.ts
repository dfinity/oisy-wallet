import { loadBtcAddressMainnet } from '$btc/services/btc-address.services';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { loadEthAddress } from '$eth/services/eth-address.services';
import { loadAddresses } from '$lib/services/addresses.services';
import { loadSolAddressMainnet } from '$sol/services/sol-address.services';

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
	});

	describe('loadAddresses', () => {
		it('should load addresses for all supported token IDs when Solana is enabled', async () => {
			const networkIds = [BTC_MAINNET_NETWORK_ID, ETHEREUM_NETWORK_ID, SOLANA_MAINNET_NETWORK_ID];

			const result = await loadAddresses(networkIds);

			expect(result).toEqual({ sessionInvalid: false, failedNetworkIds: [] });
			expect(loadBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadEthAddress).toHaveBeenCalledOnce();
			expect(loadSolAddressMainnet).toHaveBeenCalledOnce();
		});

		it('should load addresses only for provided token IDs', async () => {
			const networkIds = [BTC_MAINNET_NETWORK_ID];

			const result = await loadAddresses(networkIds);

			expect(result).toEqual({ sessionInvalid: false, failedNetworkIds: [] });
			expect(loadBtcAddressMainnet).toHaveBeenCalledOnce();
			expect(loadEthAddress).not.toHaveBeenCalled();
			expect(loadSolAddressMainnet).not.toHaveBeenCalled();
		});

		// The point of the change: one chain failing must not be reported as a wholesale failure,
		// because the caller would previously have signed the user out for it.
		it('should report only the chain that failed and leave the others intact', async () => {
			vi.mocked(loadSolAddressMainnet).mockResolvedValue({
				success: false,
				err: 'derivation-failed'
			});

			const result = await loadAddresses([
				BTC_MAINNET_NETWORK_ID,
				ETHEREUM_NETWORK_ID,
				SOLANA_MAINNET_NETWORK_ID
			]);

			expect(result).toEqual({
				sessionInvalid: false,
				failedNetworkIds: [SOLANA_MAINNET_NETWORK_ID]
			});
		});

		// A lost session is not "every chain broke" — it is the one case that still ends the session.
		it('should flag a session failure separately from a derivation failure', async () => {
			vi.mocked(loadEthAddress).mockResolvedValue({ success: false, err: 'session-invalid' });

			const result = await loadAddresses([ETHEREUM_NETWORK_ID, SOLANA_MAINNET_NETWORK_ID]);

			expect(result).toEqual({ sessionInvalid: true, failedNetworkIds: [] });
		});

		it('should report every failed chain when all of them fail', async () => {
			vi.mocked(loadBtcAddressMainnet).mockResolvedValue({
				success: false,
				err: 'derivation-failed'
			});
			vi.mocked(loadEthAddress).mockResolvedValue({ success: false, err: 'derivation-failed' });
			vi.mocked(loadSolAddressMainnet).mockResolvedValue({
				success: false,
				err: 'derivation-failed'
			});

			const { failedNetworkIds } = await loadAddresses([
				BTC_MAINNET_NETWORK_ID,
				ETHEREUM_NETWORK_ID,
				SOLANA_MAINNET_NETWORK_ID
			]);

			expect(failedNetworkIds).toEqual([
				BTC_MAINNET_NETWORK_ID,
				ETHEREUM_NETWORK_ID,
				SOLANA_MAINNET_NETWORK_ID
			]);
		});

		it('should handle empty networkIds array', async () => {
			const result = await loadAddresses([]);

			expect(result).toEqual({ sessionInvalid: false, failedNetworkIds: [] });
			expect(loadBtcAddressMainnet).not.toHaveBeenCalled();
			expect(loadEthAddress).not.toHaveBeenCalled();
			expect(loadSolAddressMainnet).not.toHaveBeenCalled();
		});
	});
});
