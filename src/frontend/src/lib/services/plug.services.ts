import {
	BITCOIN_CANISTER_IDS,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { infuraProviders } from '$eth/providers/infura.providers';
import { getBalanceQuery } from '$icp/api/bitcoin.api';
import { balance as icrcBalance } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
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
import { SolanaNetworks } from '$sol/types/network';
import { Principal } from '@icp-sdk/core/principal';

/**
 * Resolves the Plug address that a given token's network is settled on.
 *
 * Returns `undefined` for a network the import does not cover, which is how a
 * token on an unsupported network drops out of the result rather than being
 * reported with a wrong address.
 */
const addressForToken = ({
	token: { network },
	account
}: {
	token: Token;
	account: PlugAccount;
}): string | undefined => {
	const { id: networkId } = network;

	if (isNetworkIdBitcoin(networkId)) {
		return account.btcAddress;
	}

	if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
		return account.evmAddress;
	}

	if (isNetworkIdSolana(networkId)) {
		return account.solAddress;
	}

	return undefined;
};

const loadNativeBalance = async ({
	token,
	account,
	identity
}: {
	token: Token;
	account: PlugAccount;
	identity: NullishIdentity;
}): Promise<bigint> => {
	const { network } = token;
	const { id: networkId } = network;

	if (isNetworkIdBitcoin(networkId)) {
		return await getBalanceQuery({
			identity,
			address: account.btcAddress,
			network: 'mainnet',
			bitcoinCanisterId: BITCOIN_CANISTER_IDS[IC_CKBTC_MINTER_CANISTER_ID]
		});
	}

	if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
		return await infuraProviders(networkId).balance(account.evmAddress);
	}

	if (isNetworkIdSolana(networkId)) {
		return await loadSolLamportsBalance({
			address: account.solAddress,
			network: SolanaNetworks.mainnet
		});
	}

	throw new Error(`No Plug balance loader for network ${networkId.toString()}`);
};

/**
 * Balances for one Plug account.
 *
 * Every lookup is independent and a failure degrades that single row to an
 * undefined balance rather than failing the page: the networks here are reached
 * through five different providers, and one unreachable RPC must not hide the
 * assets the user came to look at.
 */
export const loadPlugBalances = async ({
	account,
	icTokens,
	nativeTokens,
	identity
}: {
	account: PlugAccount;
	icTokens: IcToken[];
	nativeTokens: Token[];
	identity: NullishIdentity;
}): Promise<PlugBalance[]> => {
	const owner = Principal.fromText(account.principal);

	const icRows = icTokens.map(async (token: IcToken): Promise<PlugBalance> => {
		try {
			return {
				token,
				address: account.principal,
				balance: await icrcBalance({
					owner,
					identity,
					ledgerCanisterId: token.ledgerCanisterId,
					certified: false
				})
			};
		} catch (err: unknown) {
			consoleWarn(`Failed to load the Plug balance of ${token.symbol}`, err);

			return { token, address: account.principal, balance: undefined };
		}
	});

	const nativeRows = nativeTokens.reduce<Promise<PlugBalance>[]>((acc, token) => {
		const address = addressForToken({ token, account });

		if (address === undefined) {
			return acc;
		}

		return [
			...acc,
			(async (): Promise<PlugBalance> => {
				try {
					return { token, address, balance: await loadNativeBalance({ token, account, identity }) };
				} catch (err: unknown) {
					consoleWarn(`Failed to load the Plug balance of ${token.symbol}`, err);

					return { token, address, balance: undefined };
				}
			})()
		];
	}, []);

	return await Promise.all([...icRows, ...nativeRows]);
};
