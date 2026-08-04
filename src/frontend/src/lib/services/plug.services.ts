import {
	BITCOIN_CANISTER_IDS,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { getBalanceQuery } from '$icp/api/bitcoin.api';
import { balance as icrcBalance } from '$icp/api/icrc-ledger.api';
import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
import type { NullishIdentity } from '$lib/types/identity';
import type { PlugAccount, PlugBalance } from '$lib/types/plug';
import type { Token } from '$lib/types/token';
import { consoleWarn } from '$lib/utils/console.utils';
import {
	isNetworkIdBitcoin,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
import { loadSplTokenBalance } from '$sol/services/spl-accounts.services';
import { SolanaNetworks } from '$sol/types/network';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { Principal } from '@icp-sdk/core/principal';

interface BalanceLookup {
	address: string;
	load: () => Promise<bigint>;
}

/**
 * Maps a token to the address it settles on for this account, plus how to read
 * its balance.
 *
 * Dispatch is by token standard first and only then by network, because an ERC20
 * and a native coin share a network but not a balance call.
 *
 * Returns `undefined` for anything the import cannot read, which is how a token
 * whose ledger does not implement `icrc1_balance_of` — DIP20, for instance — is
 * skipped outright instead of being reported as a failed lookup.
 */
const balanceLookup = ({
	token,
	account,
	identity
}: {
	token: Token;
	account: PlugAccount;
	identity: NullishIdentity;
}): BalanceLookup | undefined => {
	const {
		network: { id: networkId }
	} = token;

	if (isTokenIcp(token) || isTokenIcrc(token)) {
		const { ledgerCanisterId } = token;

		return {
			address: account.principal,
			load: async () =>
				await icrcBalance({
					owner: Principal.fromText(account.principal),
					identity,
					ledgerCanisterId,
					certified: false
				})
		};
	}

	if (isTokenErc20(token)) {
		const { address: contractAddress } = token;

		return {
			address: account.evmAddress,
			load: async () =>
				await infuraErc20Providers(networkId).balance({
					contract: { address: contractAddress },
					address: account.evmAddress
				})
		};
	}

	if (isTokenSpl(token)) {
		const { address: tokenAddress, owner: tokenOwnerAddress } = token;

		return {
			address: account.solAddress,
			load: async () =>
				await loadSplTokenBalance({
					address: account.solAddress,
					network: SolanaNetworks.mainnet,
					tokenAddress,
					tokenOwnerAddress
				})
		};
	}

	if (isNetworkIdBitcoin(networkId)) {
		return {
			address: account.btcAddress,
			load: async () =>
				await getBalanceQuery({
					identity,
					address: account.btcAddress,
					network: 'mainnet',
					bitcoinCanisterId: BITCOIN_CANISTER_IDS[IC_CKBTC_MINTER_CANISTER_ID]
				})
		};
	}

	if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
		return {
			address: account.evmAddress,
			load: async () => await infuraProviders(networkId).balance(account.evmAddress)
		};
	}

	if (isNetworkIdSolana(networkId)) {
		return {
			address: account.solAddress,
			load: async () =>
				await loadSolLamportsBalance({
					address: account.solAddress,
					network: SolanaNetworks.mainnet
				})
		};
	}

	return undefined;
};

/**
 * Balances for one imported account.
 *
 * Every lookup is independent and a failure degrades that single row to an
 * undefined balance rather than failing the page: these networks are reached
 * through several different providers, and one unreachable RPC — or one ledger
 * canister that no longer holds a Wasm module — must not hide the assets the
 * user came to look at.
 */
export const loadPlugBalances = async ({
	account,
	tokens,
	identity
}: {
	account: PlugAccount;
	tokens: Token[];
	identity: NullishIdentity;
}): Promise<PlugBalance[]> =>
	await Promise.all(
		tokens.reduce<Promise<PlugBalance>[]>((acc, token) => {
			const lookup = balanceLookup({ token, account, identity });

			if (lookup === undefined) {
				return acc;
			}

			const { address, load } = lookup;

			return [
				...acc,
				(async (): Promise<PlugBalance> => {
					try {
						return { token, address, balance: await load() };
					} catch (err: unknown) {
						consoleWarn(`Failed to load the imported balance of ${token.symbol}`, err);

						return { token, address, balance: undefined };
					}
				})()
			];
		}, [])
	);
