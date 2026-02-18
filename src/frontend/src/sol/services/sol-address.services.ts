import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_KEY_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { getSchnorrPublicKey } from '$lib/api/signer.api';
import { SIGNER_MASTER_PUB_KEY } from '$lib/constants/signer.constants';
import { deriveSolAddress } from '$lib/ic-pub-key/src/cli';
import {
	certifyAddress,
	loadTokenAddress,
	validateAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	type AddressStoreData
} from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { getAddressDecoder } from '@solana/kit';
import { get } from 'svelte/store';

const getSolanaPublicKey = async ({
	derivationPath,
	identity,
	...rest
}: CanisterApiFunctionParams<{ derivationPath: string[] }>): Promise<Uint8Array> => {
	if (FRONTEND_DERIVATION_ENABLED && nonNullish(SIGNER_MASTER_PUB_KEY)) {
		// We use the same logic of the canister method. The potential error will be handled in the consumer.
		assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

		// HACK: This is not working for Local environment for now, because the library is not aware of the `dfx_test_1` public key (used by Local deployment).
		const publicKey = deriveSolAddress({
			user: identity.getPrincipal().toString(),
			derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, ...derivationPath],
			pubkey: SIGNER_MASTER_PUB_KEY.schnorr.ed25519.pubkey
		});

		return Buffer.from(publicKey, 'hex');
	}

	return await getSchnorrPublicKey({
		...rest,
		identity,
		keyId: SOLANA_KEY_ID,
		derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, ...derivationPath]
	});
};

const getSolAddress = async ({
	identity,
	network
}: {
	identity: OptionIdentity;
	network: SolanaNetworkType;
}): Promise<SolAddress> => {
	const derivationPath: string[] = [network];
	const publicKey = await getSolanaPublicKey({ identity, derivationPath });
	const decoder = getAddressDecoder();
	return decoder.decode(Uint8Array.from(publicKey));
};

export const getSolAddressMainnet = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, network: SolanaNetworks.mainnet });

export const getSolAddressDevnet = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, network: SolanaNetworks.devnet });

export const getSolAddressLocal = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, network: SolanaNetworks.local });

const solanaMapper: Record<
	SolanaNetworkType,
	Pick<LoadTokenAddressParams<SolAddress>, 'addressStore' | 'getAddress'>
> = {
	mainnet: {
		addressStore: solAddressMainnetStore,
		getAddress: getSolAddressMainnet
	},
	devnet: {
		addressStore: solAddressDevnetStore,
		getAddress: getSolAddressDevnet
	},
	local: {
		addressStore: solAddressLocalnetStore,
		getAddress: getSolAddressLocal
	}
};

const loadSolAddress = ({
	networkId,
	network
}: {
	networkId: NetworkId;
	network: SolanaNetworkType;
}): Promise<ResultSuccess> =>
	loadTokenAddress<SolAddress>({
		networkId,
		...solanaMapper[network]
	});

export const loadSolAddressMainnet = (): Promise<ResultSuccess> =>
	loadSolAddress({
		networkId: SOLANA_MAINNET_NETWORK_ID,
		network: SolanaNetworks.mainnet
	});

export const loadSolAddressDevnet = (): Promise<ResultSuccess> =>
	loadSolAddress({
		networkId: SOLANA_DEVNET_NETWORK_ID,
		network: SolanaNetworks.devnet
	});

export const loadSolAddressLocal = (): Promise<ResultSuccess> =>
	loadSolAddress({
		networkId: SOLANA_LOCAL_NETWORK_ID,
		network: SolanaNetworks.local
	});

const certifySolAddressMainnet = (address: SolAddress): Promise<ResultSuccess<string>> =>
	certifyAddress<SolAddress>({
		networkId: SOLANA_MAINNET_NETWORK_ID,
		address,
		getAddress: (identity: OptionIdentity) => getSolAddressMainnet(identity),
		addressStore: solAddressMainnetStore
	});

export const validateSolAddressMainnet = async ($addressStore: AddressStoreData<SolAddress>) =>
	await validateAddress<SolAddress>({
		$addressStore,
		certifyAddress: certifySolAddressMainnet
	});
