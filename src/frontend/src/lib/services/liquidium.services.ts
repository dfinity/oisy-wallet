import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import { liquidiumClient } from '$lib/api/liquidium.api';
import { liquidiumWalletAdapter } from '$lib/services/liquidium-wallet-adapter.services';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleError } from '$lib/utils/console.utils';
import { mapLiquidiumMarket, mapLiquidiumPortfolio } from '$lib/utils/liquidium.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Chain, type AssetPrices } from '@liquidium/client';

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
		const markets = pools.map(mapLiquidiumMarket);

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
	}
};
