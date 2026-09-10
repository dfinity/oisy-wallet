import { ZERO } from '$lib/constants/app.constants';
import { getMultipleAccountsInfo } from '$sol/api/solana.api';
import { SOLANA_MAX_MULTIPLE_ACCOUNTS } from '$sol/constants/sol.constants';
import { calculateAssociatedTokenAddress } from '$sol/services/spl-accounts.services';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolNetworkBalances } from '$sol/types/sol-balance';
import type { SolanaParsedAccountsInfo } from '$sol/types/sol-rpc';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import { parseTokenAccountState } from '$sol/utils/sol-simulation.utils';
import { isNullish } from '@dfinity/utils';

const loadAccountsInfo = async ({
	addresses,
	network
}: {
	addresses: SolAddress[];
	network: SolanaNetworkType;
}): Promise<SolanaParsedAccountsInfo> => {
	const chunks: SolAddress[][] = [];

	for (let i = 0; i < addresses.length; i += SOLANA_MAX_MULTIPLE_ACCOUNTS) {
		chunks.push(addresses.slice(i, i + SOLANA_MAX_MULTIPLE_ACCOUNTS));
	}

	const results = await Promise.all(
		chunks.map((chunk) => getMultipleAccountsInfo({ addresses: chunk, network }))
	);

	return results.flat();
};

/**
 * Loads the SOL balance of a wallet and the balance of each given SPL token in one
 * `getMultipleAccounts` round (one call per 100 accounts), instead of one `getBalance` plus up to
 * three calls per token.
 *
 * Each token's associated token account is derived with the token's own program, so Token-2022
 * accounts are found and parse like legacy ones.
 */
export const loadSolNetworkBalances = async ({
	address,
	network,
	tokens
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	tokens: Pick<SplToken, 'address' | 'owner'>[];
}): Promise<SolNetworkBalances> => {
	const ataAddresses = await Promise.all(
		tokens.map(({ address: tokenAddress, owner: tokenOwnerAddress }) =>
			calculateAssociatedTokenAddress({ owner: address, tokenAddress, tokenOwnerAddress })
		)
	);

	const [wallet, ...ataAccounts] = await loadAccountsInfo({
		addresses: [address, ...ataAddresses],
		network
	});

	const spl = tokens.reduce<Record<SplTokenAddress, bigint>>(
		(acc, { address: tokenAddress }, index) => {
			const account = ataAccounts[index];

			// A null account is the RPC saying the ATA was never created (or was closed): the user
			// holds none of the token.
			if (account === null) {
				acc[tokenAddress] = ZERO;
				return acc;
			}

			const tokenAccount = isNullish(account) ? undefined : parseTokenAccountState(account);

			// An account that exists but is not a token account of this mint has no balance we can
			// read. Reporting zero would erase a balance the user may well hold, so the token is left
			// out and the caller keeps whatever it last knew.
			if (isNullish(tokenAccount) || tokenAccount.tokenAddress !== tokenAddress) {
				return acc;
			}

			acc[tokenAddress] = tokenAccount.amount;
			return acc;
		},
		{}
	);

	// A wallet that never received anything has no account on chain.
	return { sol: isNullish(wallet) ? ZERO : BigInt(wallet.lamports), spl };
};
