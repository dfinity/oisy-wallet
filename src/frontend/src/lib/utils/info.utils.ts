import { browser } from '$app/environment';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish } from '@dfinity/utils';

export type HideInfoKey =
	| 'oisy_ic_hide_bitcoin_info'
	| 'oisy_ic_hide_ethereum_info'
	| 'oisy_ic_hide_erc20_info'
	| 'oisy_ic_hide_transaction_unavailable_canister';

export const saveHideInfo = (key: HideInfoKey) => {
	try {
		if (!browser) {
			return;
		}

		sessionStorage.setItem(key, 'true');
	} catch (err: unknown) {
		// We use the session storage for the operational part of the app but, not crucial
		consoleError(err);
	}
};

/**
 * The qualified variant of the flags above: instead of "this box is hidden", it records *what* the
 * user dismissed - e.g. the tokens named in the box at the time. A box that can name a different
 * subject later needs this, otherwise dismissing it once silences every future subject too.
 */
export const saveHideInfoQualifiers = ({
	key,
	qualifiers
}: {
	key: HideInfoKey;
	qualifiers: string[];
}) => {
	try {
		if (!browser) {
			return;
		}

		sessionStorage.setItem(key, JSON.stringify(qualifiers));
	} catch (err: unknown) {
		// We use the session storage for the operational part of the app but, not crucial
		consoleError(err);
	}
};

export const hiddenInfoQualifiers = (key: HideInfoKey): string[] => {
	try {
		if (!browser) {
			return [];
		}

		const stored = sessionStorage.getItem(key);

		if (isNullish(stored)) {
			return [];
		}

		const qualifiers: unknown = JSON.parse(stored);

		return Array.isArray(qualifiers) ? qualifiers.map((qualifier) => `${qualifier}`) : [];
	} catch (err: unknown) {
		// We use the session storage for the operational part of the app but, not crucial
		consoleError(err);
		return [];
	}
};

export const shouldHideInfo = (key: HideInfoKey): boolean => {
	try {
		const store: Storage = browser ? sessionStorage : ({ [key]: 'false' } as unknown as Storage);
		return store[key] === 'true';
	} catch (err: unknown) {
		// We use the session storage for the operational part of the app but, not crucial
		consoleError(err);
		return false;
	}
};
