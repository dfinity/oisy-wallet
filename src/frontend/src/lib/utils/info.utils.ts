import { browser } from '$app/environment';

export const saveHideInfo = <T extends string>(key: T) => {
	try {
		localStorage.setItem(key, 'true');
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		console.error(err);
	}
};

export const shouldHideInfo = <T extends string>(key: T): boolean => {
	try {
		const store: Storage = browser ? localStorage : ({ [key]: 'false' } as unknown as Storage);
		return store[key] === 'true';
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		console.error(err);
		return false;
	}
};
