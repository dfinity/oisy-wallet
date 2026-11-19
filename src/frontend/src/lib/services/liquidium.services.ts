import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import { liquidiumClient } from '$lib/api/liquidium.api';
import { liquidiumWalletAdapter } from '$lib/services/liquidium-wallet-adapter.services';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleError } from '$lib/utils/console.utils';
import {
	isLiquidiumInflowSubaccount,
	mapLiquidiumMarketRails,
	mapLiquidiumPortfolio
} from '$lib/utils/liquidium.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { Chain, type AssetPrices, type Pool } from '@liquidium/client';

// Resolves the (single, ETH-owned) Liquidium profile, creating one if absent.
// Creation is signature-gated via the wallet adapter's `signMessage`.
export const getOrCreateLiquidiumProfile = async ({
	identity,
	ethAddress
}: {
	identity: Identity;
	ethAddress: EthAddress;
}): Promise<string> => {
	const { accounts } = liquidiumClient({ identity });

	const profileId = await accounts.getProfileId(ethAddress);

	if (nonNullish(profileId)) {
		return profileId;
	}

	return accounts.createProfile({
		account: ethAddress,
		chain: Chain.ETH,
		walletAdapter: liquidiumWalletAdapter({ identity })
	});
};

// Best-effort load of markets + portfolio into `liquidiumStore`; errors are
// logged so a transient SDK/RPC failure never breaks the dashboard. Read-only:
// the profile is only created on the first write action.
export const loadLiquidium = async ({
	identity,
	ethAddress
}: {
	identity: NullishIdentity;
	ethAddress: OptionEthAddress;
}): Promise<void> => {
	if (isNullish(identity)) {
		liquidiumStore.reset();
		return;
	}

	try {
		const { market, accounts, positions } = liquidiumClient({ identity });

		// Prices feed only the Borrow form's USD math; a price-fetch failure must not block the
		// markets/portfolio refresh the Supply dashboard relies on — default to empty and log.
		const [pools, assetPrices] = await Promise.all([
			market.listPools(),
			market.getAssetPrices().catch((err: unknown): AssetPrices => {
				consoleError(err);
				return {};
			})
		]);
		const markets = pools.flatMap(mapLiquidiumMarketRails);

		const profileId = nonNullish(ethAddress) ? await accounts.getProfileId(ethAddress) : null;

		const portfolio = nonNullish(profileId)
			? mapLiquidiumPortfolio({
					reserves: await positions.getUserReserves(profileId),
					summary: await positions.getUserPositionSummary(profileId)
				})
			: null;

		liquidiumStore.set({ markets, portfolio, assetPrices });
	} catch (err: unknown) {
		consoleError(err);
	} finally {
		liquidiumStore.setLoaded(true);
	}
};

/**
 * The Liquidium pool a deposit of a ck token to an account reaches, when the account is the one that
 * credits it to the user's own Liquidium profile.
 *
 * Read from Liquidium the way OISY's own supply reads the pool and the profile it supplies to: the
 * pools Liquidium lists and the profile linked to the user's Ethereum address. `undefined` when the
 * owner is not the Liquidium pool of that ck token's asset (a pool holds the ck token of its own
 * asset, as ckUSDT for USDT), the address has no profile, or the subaccount credits another.
 */
export const loadLiquidiumInflowPool = async ({
	identity,
	ethAddress,
	owner,
	subaccount,
	ckTokenSymbol
}: {
	identity: Identity;
	ethAddress: EthAddress;
	owner: Principal;
	subaccount: Uint8Array;
	ckTokenSymbol: string;
}): Promise<Pool | undefined> => {
	const { market, accounts } = liquidiumClient({ identity });

	const pool = (await market.listPools()).find(
		({ id, asset }) => id === owner.toText() && `ck${asset}` === ckTokenSymbol
	);

	if (isNullish(pool)) {
		return;
	}

	const profileId = await accounts.getProfileId(ethAddress);

	if (isNullish(profileId)) {
		return;
	}

	return isLiquidiumInflowSubaccount({ subaccount, profileId: Principal.fromText(profileId) })
		? pool
		: undefined;
};
