import { browser } from '$app/environment';
import type { Principal } from '@dfinity/principal';
import { delMany, keys, type UseStore } from 'idb-keyval';

export const delMultiKeysByPrincipal = async ({
	principal,
	store
}: {
	principal: Principal;
	store: UseStore;
}) => {
	if (!browser) {
		return;
	}

	const allKeys = await keys(store);
	const principalText = principal.toText();
	const filteredKeys = allKeys.filter((key) => Array.isArray(key) && key[0] === principalText);

	if (filteredKeys.length === 0) {
		return;
	}

	await delMany(filteredKeys, store);
};
