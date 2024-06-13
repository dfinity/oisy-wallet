import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { LoadEvent, Page } from '@sveltejs/kit';

export const transactionsUrl = ({ token }: { token: Token }): string =>
	tokenUrl({ path: '/transactions/', token });

export const isRouteTransactions = ({ route: { id } }: Page): boolean =>
	id === '/(app)/transactions';

export const isRouteSettings = ({ route: { id } }: Page): boolean => id === '/(app)/settings';

export const isRouteTokens = ({ route: { id } }: Page): boolean => id === '/(app)';

export const isSubRoute = (page: Page): boolean =>
	isRouteTransactions(page) || isRouteSettings(page);

const tokenUrl = ({
	token: {
		name,
		network: { id: networkId }
	},
	path
}: {
	token: Token;
	path: '/transactions/' | '/';
}): string =>
	`${path}?token=${encodeURIComponent(
		name.replace(/\p{Emoji}/gu, (m, _idx) => `\\u${m.codePointAt(0)?.toString(16)}`)
	)}${nonNullish(networkId.description) ? `&${networkParam(networkId)}` : ''}`;

export const networkParam = (networkId: NetworkId): string =>
	`network=${networkId.description ?? ''}`;

export const back = async ({
	pop,
	networkId,
	fromUrl
}: {
	pop: boolean;
	networkId: NetworkId;
	fromUrl?: URL;
}) => {
	const rootUrl = fromUrl?.toString() ?? `/?${networkParam(networkId)}`;

	if (!pop) {
		await goto(rootUrl);
		return;
	}

	await goto(rootUrl, { replaceState: true });
};

export type RouteParams = {
	token: string | null | undefined;
	network: string | null | undefined;
	// WalletConnect URI parameter
	uri: string | null | undefined;
};

export const loadRouteParams = ($event: LoadEvent): RouteParams => {
	if (!browser) {
		return {
			token: undefined,
			network: undefined,
			uri: undefined
		};
	}

	const {
		url: { searchParams }
	} = $event;

	const token = searchParams?.get('token');

	const replaceEmoji = (input: string | null): string | null => {
		if (input === null) {
			return null;
		}

		return input.replace(/\\u([\dA-Fa-f]+)/g, (_match, hex) =>
			String.fromCodePoint(Number(`0x${hex}`))
		);
	};

	const uri = searchParams?.get('uri');

	return {
		token: nonNullish(token) ? replaceEmoji(decodeURIComponent(token)) : null,
		network: searchParams?.get('network'),
		uri: nonNullish(uri) ? decodeURIComponent(uri) : null
	};
};

export const switchNetwork = async (networkId: NetworkId | undefined | null) => {
	const url = new URL(window.location.href);

	if (isNullish(networkId) || isNullish(networkId.description)) {
		url.searchParams.delete('network');
	} else {
		url.searchParams.set('network', networkId.description);
	}

	await goto(url, { replaceState: true, noScroll: true });
};
