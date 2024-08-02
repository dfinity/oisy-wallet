import { browser } from '$app/environment';
import { ckErc20Production, ckErc20Staging } from '$env/tokens.ckerc20.env';
import type { Token } from '$lib/types/token';

export type HideInfoKey =
	| 'oisy_ic_hide_bitcoin_info'
	| 'oisy_ic_hide_ethereum_info'
	| 'oisy_ic_hide_erc20_info';

export const saveHideInfo = (key: HideInfoKey) => {
	try {
		localStorage.setItem(key, 'true');
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		console.error(err);
	}
};

export const shouldHideInfo = (key: HideInfoKey): boolean => {
	try {
		const store: Storage = browser ? localStorage : ({ [key]: 'false' } as unknown as Storage);
		return store[key] === 'true';
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		console.error(err);
		return false;
	}
};

export const isCkErc20Token = ({ symbol }: Token): boolean =>
	[
		...Object.keys({ ...(ckErc20Production ?? {}), ...(ckErc20Staging ?? {}) }),
		'ckBTC',
		'ckETH'
	].includes(symbol);
