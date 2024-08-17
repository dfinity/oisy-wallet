import { BTC_MAINNET_TOKEN_ID } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';
import { getEthAddress } from '$lib/api/backend.api';
import {
	getIdbBtcAddressMainnet,
	getIdbEthAddress,
	setIdbEthAddress,
	updateIdbBtcAddressMainnetLastUsage,
	updateIdbEthAddressLastUsage
} from '$lib/api/idb.api';
import { addressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Address, BtcAddress, EthAddress } from '$lib/types/address';
import type { IdbAddress } from '$lib/types/idb';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenId } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadAddress = async (): Promise<{ success: boolean }> => {
	const tokenId = ETHEREUM_TOKEN_ID;

	try {
		const { identity } = get(authStore);

		const address = await getEthAddress(identity);
		addressStore.set({ tokenId, data: { data: address, certified: true } });

		await saveEthAddressForFutureSignIn({ address, identity });
	} catch (err: unknown) {
		addressStore.reset(tokenId);

		toastsError({
			msg: {
				text: replacePlaceholders(get(i18n).init.error.loading_address, {
					$symbol: tokenId.description ?? ''
				})
			},
			err
		});

		return { success: false };
	}

	return { success: true };
};

const saveEthAddressForFutureSignIn = async ({
	identity,
	address
}: {
	identity: OptionIdentity;
	address: EthAddress;
}) => {
	// Should not happen given the current layout and guards. Moreover, the backend throws an error if the caller is anonymous.
	assertNonNullish(identity, 'Cannot continue without an identity.');

	const now = Date.now();

	await setIdbEthAddress({
		address: {
			address,
			createdAtTimestamp: now,
			lastUsedTimestamp: now
		},
		principal: identity.getPrincipal()
	});
};

const loadIdbTokenAddress = async <T extends Address>({
	identity,
	tokenId,
	getIdbAddress,
	updateIdbAddressLastUsage
}: {
	identity: Identity;
	tokenId: TokenId;
	getIdbAddress: (principal: Principal) => Promise<IdbAddress<T> | undefined>;
	updateIdbAddressLastUsage: (principal: Principal) => Promise<void>;
}): Promise<{ success: boolean }> => {
	try {
		const idbAddress = await getIdbAddress(identity.getPrincipal());

		if (isNullish(idbAddress)) {
			return { success: false };
		}

		const { address } = idbAddress;
		addressStore.set({ tokenId, data: { data: address, certified: false } });

		await updateIdbAddressLastUsage(identity.getPrincipal());
	} catch (err: unknown) {
		// We silence the error as the dapp will proceed with a standard lookup of the address.
		console.error(
			`Error encountered while searching for locally stored ${tokenId.description} public address in the browser.`
		);

		return { success: false };
	}

	return { success: true };
};

const loadIdbBtcAddressMainnet = async (identity: Identity): Promise<{ success: boolean }> =>
	loadIdbTokenAddress<BtcAddress>({
		identity,
		tokenId: BTC_MAINNET_TOKEN_ID,
		getIdbAddress: getIdbBtcAddressMainnet,
		updateIdbAddressLastUsage: updateIdbBtcAddressMainnetLastUsage
	});

const loadIdbEthAddress = async (identity: Identity): Promise<{ success: boolean }> =>
	loadIdbTokenAddress<EthAddress>({
		identity,
		tokenId: ETHEREUM_TOKEN_ID,
		getIdbAddress: getIdbEthAddress,
		updateIdbAddressLastUsage: updateIdbEthAddressLastUsage
	});

export const loadIdbAddress = async (): Promise<{ success: boolean }> => {
	try {
		const { identity } = get(authStore);

		// Should not happen given the current layout and guards.
		assertNonNullish(identity, 'Cannot continue without an identity.');

		if (identity.getPrincipal().isAnonymous()) {
			return { success: false };
		}

		return await loadIdbEthAddress(identity);
	} catch (err: unknown) {
		// We silence the error as the dapp will proceed with a standard lookup of the address.
		console.error(
			'Error encountered while searching for a locally stored public address in the browser.'
		);

		return { success: false };
	}
};

export const certifyAddress = async (
	address: string
): Promise<{ success: boolean; err?: string }> => {
	const tokenId = ETHEREUM_TOKEN_ID;

	try {
		const { identity } = get(authStore);

		assertNonNullish(identity, 'Cannot continue without an identity.');

		if (identity.getPrincipal().isAnonymous()) {
			return { success: false, err: 'Using the dapp with an anonymous user if not supported.' };
		}

		const certifiedAddress = await getEthAddress(identity);

		if (address.toLowerCase() !== certifiedAddress.toLowerCase()) {
			return {
				success: false,
				err: 'The address used to load the data did not match your actual wallet address, which is why your session was ended. Please sign in again to reload your own data.'
			};
		}

		addressStore.set({ tokenId, data: { data: address, certified: true } });

		await updateIdbEthAddressLastUsage(identity.getPrincipal());
	} catch (err: unknown) {
		addressStore.reset(tokenId);

		return { success: false, err: 'Error while loading the ETH address.' };
	}

	return { success: true };
};
