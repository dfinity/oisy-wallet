import {
	loadBtcAddressMainnet,
	loadBtcAddressRegtest,
	loadBtcAddressTestnet
} from '$btc/services/btc-address.services';
import { loadEthAddress } from '$eth/services/eth-address.services';
import { loadCkBtcDepositAddress } from '$icp/services/ckbtc.services';
import { isIcCkToken } from '$icp/validation/ic-token.validation';
import type { NullishIdentity } from '$lib/types/identity';
import type { ReceiveRoute } from '$lib/types/receive';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdXRPMainnet
} from '$lib/utils/network.utils';
import {
	loadSolAddressDevnet,
	loadSolAddressLocal,
	loadSolAddressMainnet
} from '$sol/services/sol-address.services';
import { loadXrpAddressMainnet } from '$xrp/services/xrp-address.services';

/**
 * Loads the destination of a route again, after it failed. The ICP formats need no load: they are
 * derived from the identity.
 */
export const retryReceiveAddress = async ({
	route: { addressKind, sourceNetwork, creditedToken },
	identity
}: {
	route: ReceiveRoute;
	identity: NullishIdentity;
}): Promise<void> => {
	const { id: networkId } = sourceNetwork;

	if (addressKind === 'ckbtc-deposit') {
		if (isIcCkToken(creditedToken)) {
			await loadCkBtcDepositAddress({ ...creditedToken, identity });
		}
		return;
	}

	const load =
		addressKind === 'evm'
			? loadEthAddress
			: isNetworkIdBTCMainnet(networkId)
				? loadBtcAddressMainnet
				: isNetworkIdBTCTestnet(networkId)
					? loadBtcAddressTestnet
					: isNetworkIdBTCRegtest(networkId)
						? loadBtcAddressRegtest
						: isNetworkIdSOLMainnet(networkId)
							? loadSolAddressMainnet
							: isNetworkIdSOLDevnet(networkId)
								? loadSolAddressDevnet
								: isNetworkIdSOLLocal(networkId)
									? loadSolAddressLocal
									: isNetworkIdXRPMainnet(networkId)
										? loadXrpAddressMainnet
										: undefined;

	await load?.();
};
