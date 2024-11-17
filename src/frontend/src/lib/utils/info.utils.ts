import { browser } from '$app/environment';

export type HideInfoKey =
	| 'oisy_ic_hide_bitcoin_info'
	| 'oisy_ic_hide_ethereum_info'
	| 'oisy_ic_hide_erc20_info';

export const saveHideInfo = <T extends HideInfoKey>(key: T) => {
	try {
		localStorage.setItem(key, 'true');
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		console.error(err);
	}
};

export const shouldHideInfo = <T extends HideInfoKey>(key: T): boolean => {
	try {
		const store: Storage = browser ? localStorage : ({ [key]: 'false' } as unknown as Storage);
		return store[key] === 'true';
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		console.error(err);
		return false;
	}
};
