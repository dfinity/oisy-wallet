import {
	loadBtcAddressMainnet,
	loadBtcAddressRegtest,
	loadBtcAddressTestnet
} from '$btc/services/btc-address.services';
import { loadEthAddress } from '$eth/services/eth-address.services';
import { loadCkBtcDepositAddress } from '$icp/services/ckbtc.services';
import { isIcCkToken } from '$icp/validation/ic-token.validation';
import type { NullishIdentity } from '$lib/types/identity';
import type { ReceiveNetworkAddressSource, ReceiveRoute } from '$lib/types/receive';
import { getReceiveNetworkAddressSource } from '$lib/utils/receive.utils';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { saveAllCustomTokens } from '$lib/utils/tokens.utils';
import {
	loadSolAddressDevnet,
	loadSolAddressLocal,
	loadSolAddressMainnet
} from '$sol/services/sol-address.services';
import { loadXrpAddressMainnet } from '$xrp/services/xrp-address.services';
import { nonNullish } from '@dfinity/utils';

// Looked up when called, so each load runs the service as it is then.
const NETWORK_ADDRESS_LOADERS: Record<ReceiveNetworkAddressSource, () => Promise<unknown>> = {
	evm: () => loadEthAddress(),
	btcMainnet: () => loadBtcAddressMainnet(),
	btcTestnet: () => loadBtcAddressTestnet(),
	btcRegtest: () => loadBtcAddressRegtest(),
	solMainnet: () => loadSolAddressMainnet(),
	solDevnet: () => loadSolAddressDevnet(),
	solLocal: () => loadSolAddressLocal(),
	xrpMainnet: () => loadXrpAddressMainnet()
};

/**
 * Loads the destination of a route again, after it failed. The ICP formats need no load: they are
 * derived from the identity.
 */
export const retryReceiveAddress = async ({
	route,
	identity
}: {
	route: ReceiveRoute;
	identity: NullishIdentity;
}): Promise<void> => {
	const { addressKind, creditedToken } = route;

	if (addressKind === 'ckbtc-deposit') {
		if (isIcCkToken(creditedToken)) {
			await loadCkBtcDepositAddress({ ...creditedToken, identity });
		}
		return;
	}

	const source = getReceiveNetworkAddressSource(route);

	if (nonNullish(source)) {
		await NETWORK_ADDRESS_LOADERS[source]();
	}
};

/**
 * Enables only the token a route credits. Receive finds the route again by its key, so it resolves to
 * the token the reload brings in, even under a new `TokenId`.
 */
export const enableReceiveToken = async ({
	route: { creditedToken },
	identity,
	i18n
}: {
	route: ReceiveRoute;
	identity: NullishIdentity;
	i18n: I18n;
}): Promise<{ success: boolean }> => {
	if (!isTokenToggleable(creditedToken)) {
		return { success: true };
	}

	let success = true;

	const enabledToken = { ...creditedToken, enabled: true };

	await saveAllCustomTokens({
		tokens: [enabledToken],
		onError: () => (success = false),
		$authIdentity: identity,
		$i18n: i18n
	});

	return { success };
};
