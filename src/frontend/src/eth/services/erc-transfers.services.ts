import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626Token } from '$eth/types/erc4626';
import { filterSpamErc20Transfers } from '$eth/utils/eth-transactions-spam.utils';
import { retryWithDelay } from '$lib/services/rest.services';
import type { Address } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Transaction } from '$lib/types/transaction';

/**
 * Fetches a window of a token's ERC20 `Transfer` events, without the ones that only look like the
 * user's activity.
 *
 * Shared by the two paths that pull transfers from Etherscan - the initial load and the fetch for
 * history older than the list - so that both filter spam the same way and neither has to know how.
 */
export const fetchErc20Transfers = async ({
	networkId,
	token,
	address,
	startBlock,
	endBlock
}: {
	networkId: NetworkId;
	token: Erc20Token | Erc4626Token;
	address: Address;
	startBlock?: number;
	endBlock?: number;
}): Promise<Transaction[]> => {
	const { erc20Transactions } = etherscanProviders(networkId);

	const transactions = await retryWithDelay({
		request: async () =>
			await erc20Transactions({ contract: token, address, startBlock: startBlock ?? 0, endBlock })
	});

	const { getTransaction } = alchemyProviders(networkId);

	return filterSpamErc20Transfers({
		transactions,
		userAddress: address,
		// The `transaction.from` is the `Transfer` event's _from (who tokens move from), not
		// the EOA that signed the tx. In address-poisoning scams the attacker emits
		// `Transfer(victim, attacker, 0)`, so `transaction.from == victim`. We need the
		// outer tx sender via RPC to tell whether the user actually initiated it.
		getTransactionSender: async (hash: string): Promise<EthAddress | undefined> => {
			const tx = await getTransaction(hash);
			return tx?.from;
		}
	});
};
