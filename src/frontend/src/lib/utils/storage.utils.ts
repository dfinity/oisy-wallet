import { browser } from '$app/environment';
import { consoleError } from '$lib/utils/console.utils';
import { nonNullish } from '@dfinity/utils';

export const set = <T>({ key, value }: { key: string; value: T }) => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		consoleError(err);
	}
};

export const del = ({ key }: { key: string }) => {
	try {
		localStorage.removeItem(key);
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		consoleError(err);
	}
};

export const get = <T>({ key }: { key: string }): T | undefined => {
	try {
		const { [key]: value } = browser ? localStorage : { [key]: undefined };
		return nonNullish(value) ? JSON.parse(value) : undefined;
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		consoleError(err);
	}
};
