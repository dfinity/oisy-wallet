import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import * as ethBalanceServices from '$eth/services/eth-balance.services';
import { nativeTokenOf, reloadNativeBalanceOnMined } from '$eth/services/native-balance.services';
import { parseNetworkId } from '$lib/validation/network.validation';
import type { TransactionResponse } from 'ethers/providers';

describe('native-balance.services', () => {
	describe('nativeTokenOf', () => {
		it('finds the native token of an Ethereum network and of an EVM one', () => {
			expect(nativeTokenOf(ETHEREUM_NETWORK.id)).toBe(ETHEREUM_TOKEN);

			expect(nativeTokenOf(SEPOLIA_TOKEN.network.id)).toBe(SEPOLIA_TOKEN);
		});

		it('returns undefined for a network it does not know', () => {
			expect(nativeTokenOf(parseNetworkId('not a network of ours'))).toBeUndefined();
		});
	});

	describe('reloadNativeBalanceOnMined', () => {
		const mockTransaction = (wait: () => Promise<unknown>) =>
			({ wait }) as unknown as TransactionResponse;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(ethBalanceServices, 'reloadEthereumBalance').mockResolvedValue({ success: true });
		});

		it('waits for the transaction before reloading, the gas not being spent until then', async () => {
			const wait = vi.fn().mockResolvedValue(undefined);

			await reloadNativeBalanceOnMined({
				transaction: mockTransaction(wait),
				networkId: ETHEREUM_NETWORK.id
			});

			expect(wait).toHaveBeenCalledOnce();

			expect(ethBalanceServices.reloadEthereumBalance).toHaveBeenCalledExactlyOnceWith(
				ETHEREUM_TOKEN
			);
		});

		it('does nothing when no native token matches the network', async () => {
			const wait = vi.fn().mockResolvedValue(undefined);

			await reloadNativeBalanceOnMined({
				transaction: mockTransaction(wait),
				networkId: parseNetworkId('a network with no native token of ours')
			});

			expect(wait).not.toHaveBeenCalled();

			expect(ethBalanceServices.reloadEthereumBalance).not.toHaveBeenCalled();
		});

		it('swallows a failure, this being a best-effort refresh the poll also performs', async () => {
			const wait = vi.fn().mockRejectedValue(new Error('transaction dropped from the mempool'));

			await expect(
				reloadNativeBalanceOnMined({
					transaction: mockTransaction(wait),
					networkId: ETHEREUM_NETWORK.id
				})
			).resolves.not.toThrow();

			expect(ethBalanceServices.reloadEthereumBalance).not.toHaveBeenCalled();
		});
	});
});
