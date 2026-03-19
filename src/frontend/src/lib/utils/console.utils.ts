import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { formatIcCallError } from '$lib/utils/error.utils';

const VERBOSE = LOCAL || STAGING;

export const consoleError = (...args: unknown[]): void => {
	console.error(...args.map((arg) => formatIcCallError({ err: arg })));

	if (VERBOSE) {
		// eslint-disable-next-line no-console
		console.debug('[verbose]', ...args);
	}
};

export const consoleWarn = (...args: unknown[]): void => {
	console.warn(...args.map((arg) => formatIcCallError({ err: arg })));

	if (VERBOSE) {
		// eslint-disable-next-line no-console
		console.debug('[verbose]', ...args);
	}
};
