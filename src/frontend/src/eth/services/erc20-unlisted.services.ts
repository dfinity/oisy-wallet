import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import type { EthAddress } from '$eth/types/address';
import { isDisplayableErc20Decimals } from '$eth/utils/erc20-unlisted.utils';
import type { NetworkId } from '$lib/types/network';
import { isNullish } from '@dfinity/utils';

export interface UnlistedErc20TokenData {
	decimals: number;
	symbol?: string;
	balance?: bigint;
}

/**
 * Reads, from the contract itself, what a review needs to state an amount of a token OISY does not
 * list: its decimals, and the symbol and the user's balance when the contract answers for them.
 *
 * The decimals are the one thing it cannot do without, since an amount scaled by anything else
 * would describe a different amount than the contract moves. Without them, or with more than an
 * amount can be formatted in, there is nothing to state, and the result is `undefined`.
 *
 * Never throws: a contract that does not answer is a token the review cannot state.
 */
export const loadUnlistedErc20TokenData = async ({
	address,
	networkId,
	owner
}: {
	address: EthAddress;
	networkId: NetworkId;
	owner: EthAddress | undefined;
}): Promise<UnlistedErc20TokenData | undefined> => {
	try {
		const provider = infuraErc20Providers(networkId);

		const [decimals, symbol, balance] = await Promise.allSettled([
			provider.decimals({ address }),
			provider.symbol({ address }),
			isNullish(owner)
				? Promise.reject(new Error('No address to read the balance of'))
				: provider.balance({ contract: { address }, address: owner })
		]);

		if (decimals.status === 'rejected' || !isDisplayableErc20Decimals(decimals.value)) {
			return undefined;
		}

		return {
			decimals: decimals.value,
			...(symbol.status === 'fulfilled' && typeof symbol.value === 'string'
				? { symbol: symbol.value }
				: {}),
			...(balance.status === 'fulfilled' && typeof balance.value === 'bigint'
				? { balance: balance.value }
				: {})
		};
	} catch (_: unknown) {
		return undefined;
	}
};
