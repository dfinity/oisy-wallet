import { browser } from '$app/environment';
import { goto, pushState } from '$app/navigation';
import {
	AppPath,
	NETWORK_PARAM,
	ROUTE_ID_GROUP_APP,
	TOKEN_PARAM,
	URI_PARAM
} from '$lib/constants/routes.constants';
import type { NetworkId } from '$lib/types/network';
import type { OptionString } from '$lib/types/string';
import type { Token } from '$lib/types/token';
import type { Option } from '$lib/types/utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import type { LoadEvent, NavigationTarget, Page } from '@sveltejs/kit';

const normalizePath = (s: string | null) =>
	nonNullish(s) ? (s.endsWith('/') ? s : `${s}/`) : null;

export const isTransactionsPath = (path: string | null) =>
	normalizePath(path) === `${ROUTE_ID_GROUP_APP}${AppPath.Transactions}`;
export const isSettingsPath = (path: string | null) =>
	normalizePath(path) === `${ROUTE_ID_GROUP_APP}${AppPath.Settings}`;
export const isDappExplorerPath = (path: string | null) =>
	normalizePath(path) === `${ROUTE_ID_GROUP_APP}${AppPath.Explore}`;
export const isActivityPath = (path: string | null) =>
	normalizePath(path) === `${ROUTE_ID_GROUP_APP}${AppPath.Activity}`;
export const isTokensPath = (path: string | null) =>
	normalizePath(path) === `${ROUTE_ID_GROUP_APP}${AppPath.Tokens}` ||
	normalizePath(path) === `${ROUTE_ID_GROUP_APP}${AppPath.WalletConnect}`;
export const isNftsPath = (path: string | null) =>
	normalizePath(path)?.startsWith(`${ROUTE_ID_GROUP_APP}${AppPath.Nfts}`) ?? false;
export const isRewardsPath = (path: string | null) =>
	normalizePath(path) === `${ROUTE_ID_GROUP_APP}${AppPath.Rewards}`;
export const isEarningPath = (path: string | null) =>
	normalizePath(path)?.startsWith(`${ROUTE_ID_GROUP_APP}${AppPath.Earning}`) ?? false;

export const transactionsUrl = ({ token }: { token: Token }): string =>
	tokenUrl({ path: AppPath.Transactions, token });

export const isRouteTransactions = ({ route: { id } }: Page): boolean => isTransactionsPath(id);

export const isRouteSettings = ({ route: { id } }: Page): boolean => isSettingsPath(id);

export const isRouteDappExplorer = ({ route: { id } }: Page): boolean => isDappExplorerPath(id);

export const isRouteActivity = ({ route: { id } }: Page): boolean => isActivityPath(id);

// The page of the link for WalletConnect is the same as the page where we show the Tokens list
export const isRouteTokens = ({ route: { id } }: Page): boolean => isTokensPath(id);

export const isRouteNfts = ({ route: { id } }: Page): boolean => isNftsPath(id);

export const isRouteRewards = ({ route: { id } }: Page): boolean => isRewardsPath(id);

export const isRouteEarning = ({ route: { id } }: Page): boolean => isEarningPath(id);

const tokenUrl = ({
	token: {
		name,
		network: { id: networkId }
	},
	path
}: {
	token: Token;
	path: AppPath.Transactions | undefined;
}): string =>
	`${path ?? ''}?${TOKEN_PARAM}=${encodeURIComponent(
		name.replace(/\p{Emoji}/gu, (m, _idx) => `\\u${m.codePointAt(0)?.toString(16)}`)
	)}${nonNullish(networkId.description) ? `&${networkParam(networkId)}` : ''}`;

export const networkParam = (networkId: NetworkId | undefined): string =>
	isNullish(networkId) ? '' : `${NETWORK_PARAM}=${networkId.description ?? ''}`;

export const networkUrl = ({
	path,
	networkId,
	usePreviousRoute,
	fromRoute
}: {
	path: AppPath;
	networkId: Option<NetworkId>;
	usePreviousRoute: boolean;
	fromRoute: NavigationTarget | null;
}) =>
	usePreviousRoute
		? notEmptyString(fromRoute?.url.searchParams.get(NETWORK_PARAM))
			? `${path}?${NETWORK_PARAM}=${fromRoute?.url.searchParams.get(NETWORK_PARAM)}`
			: path
		: nonNullish(networkId)
			? `${path}?${networkParam(networkId)}`
			: path;

export const back = async ({ pop }: { pop: boolean }) => {
	if (pop) {
		history.back();
		return;
	}

	await goto('/');
};

export const gotoReplaceRoot = async () => {
	await goto('/', { replaceState: true });
};

export const removeSearchParam = ({ url, searchParam }: { url: URL; searchParam: string }) => {
	url.searchParams.delete(searchParam);
	pushState(url, {});
};

export interface RouteParams {
	[TOKEN_PARAM]: OptionString;
	[NETWORK_PARAM]: OptionString;
	// WalletConnect URI parameter
	[URI_PARAM]: OptionString;
}

export const loadRouteParams = ($event: LoadEvent): RouteParams => {
	if (!browser) {
		return {
			[TOKEN_PARAM]: undefined,
			[NETWORK_PARAM]: undefined,
			[URI_PARAM]: undefined
		};
	}

	const {
		url: { searchParams }
	} = $event;

	const token = searchParams?.get(TOKEN_PARAM);

	const replaceEmoji = (input: string | null): string | null => {
		if (input === null) {
			return null;
		}

		return input.replace(/\\u([\dA-Fa-f]+)/g, (_match, hex) =>
			String.fromCodePoint(Number(`0x${hex}`))
		);
	};

	const uri = searchParams?.get(URI_PARAM);

	return {
		[TOKEN_PARAM]: nonNullish(token) ? replaceEmoji(decodeURIComponent(token)) : null,
		[NETWORK_PARAM]: searchParams?.get(NETWORK_PARAM),
		[URI_PARAM]: nonNullish(uri) ? decodeURIComponent(uri) : null
	};
};

export const resetRouteParams = (): RouteParams => ({
	[TOKEN_PARAM]: null,
	[NETWORK_PARAM]: null,
	[URI_PARAM]: null
});

export const switchNetwork = async (networkId: Option<NetworkId>) => {
	const url = new URL(window.location.href);

	if (isNullish(networkId) || isNullish(networkId.description)) {
		url.searchParams.delete(NETWORK_PARAM);
	} else {
		url.searchParams.set(NETWORK_PARAM, networkId.description);
	}

	await goto(url, { replaceState: true, noScroll: true });
};
