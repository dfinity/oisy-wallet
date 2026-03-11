import type { AddressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Address } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { get } from 'svelte/store';

export interface LoadTokenAddressParams<T extends Address> {
	networkId: NetworkId;
	getAddress: (identity: OptionIdentity) => Promise<T>;
	addressStore: AddressStore<T>;
}

export const loadTokenAddress = async <T extends Address>({
	networkId,
	getAddress,
	addressStore
}: LoadTokenAddressParams<T>): Promise<ResultSuccess> => {
	try {
		const { identity } = get(authStore);

		const address = await getAddress(identity);
		addressStore.set({ data: address, certified: true });
	} catch (err: unknown) {
		addressStore.reset();

		toastsError({
			msg: {
				text: replacePlaceholders(get(i18n).init.error.loading_address, {
					$symbol: `${networkId.description}`
				})
			},
			err
		});

		return { success: false };
	}

	return { success: true };
};
