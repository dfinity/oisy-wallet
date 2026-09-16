import { XRP_KEY_ID, XRP_MAINNET_NETWORK_ID } from '$env/networks/networks.xrp.env';
import { getSchnorrPublicKey } from '$lib/api/signer.api';
import { deriveXrpAddress } from '$lib/ic-pub-key/src/cli';
import {
	deriveTokenAddress,
	loadTokenAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { XRP_DERIVATION_PATH_PREFIX } from '$xrp/constants/xrp.constants';
import type { XrpAddress } from '$xrp/types/address';
import { XrpNetworks, type XrpNetworkType } from '$xrp/types/network';
import { mapEd25519PublicKeyToClassicAddress } from '$xrp/utils/xrp-address.utils';

const getXrpPublicKey = async ({
	derivationPath,
	identity,
	...rest
}: CanisterApiFunctionParams<{ derivationPath: string[] }>): Promise<Uint8Array> =>
	await deriveTokenAddress<Uint8Array>({
		identity,
		deriveAddress: ({ user, masterPubKey }) => {
			const publicKey = deriveXrpAddress({
				user,
				derivationPath: [XRP_DERIVATION_PATH_PREFIX, ...derivationPath],
				pubkey: masterPubKey.schnorr.ed25519.pubkey
			});

			return Buffer.from(publicKey, 'hex');
		},
		getSignerAddress: () =>
			getSchnorrPublicKey({
				...rest,
				identity,
				keyId: XRP_KEY_ID,
				derivationPath: [XRP_DERIVATION_PATH_PREFIX, ...derivationPath]
			})
	});

const getXrpAddress = async ({
	identity,
	network
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
}): Promise<XrpAddress> => {
	const derivationPath: string[] = [network];
	const publicKey = await getXrpPublicKey({ identity, derivationPath });

	return mapEd25519PublicKeyToClassicAddress(publicKey);
};

export const getXrpAddressMainnet = async (identity: NullishIdentity): Promise<XrpAddress> =>
	await getXrpAddress({ identity, network: XrpNetworks.mainnet });

const xrpMapper: Record<
	XrpNetworkType,
	Pick<LoadTokenAddressParams<XrpAddress>, 'addressStore' | 'getAddress'>
> = {
	mainnet: {
		addressStore: xrpAddressMainnetStore,
		getAddress: getXrpAddressMainnet
	}
};

const loadXrpAddress = ({
	networkId,
	network
}: {
	networkId: NetworkId;
	network: XrpNetworkType;
}): Promise<ResultSuccess> =>
	loadTokenAddress<XrpAddress>({
		networkId,
		...xrpMapper[network]
	});

export const loadXrpAddressMainnet = (): Promise<ResultSuccess> =>
	loadXrpAddress({
		networkId: XRP_MAINNET_NETWORK_ID,
		network: XrpNetworks.mainnet
	});
