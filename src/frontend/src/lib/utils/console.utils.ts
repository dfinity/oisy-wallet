import { formatIcCallError } from '$lib/utils/error.utils';

export const consoleError = (...args: unknown[]): void => {
	console.error(...args.map((arg) => formatIcCallError({ err: arg })));
};

export const consoleWarn = (...args: unknown[]): void => {
	console.warn(...args.map((arg) => formatIcCallError({ err: arg })));
};
