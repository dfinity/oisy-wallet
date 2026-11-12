import { AppPath } from '$lib/constants/routes.constants';
import type { MobileRoot, MobileScreen } from '$lib/schema/mobile-host.schema';
import { mobileRouteAllowed } from '$lib/utils/mobile-navigation.utils';

export interface MobileHistoryState {
	readonly path: string;
	readonly root: MobileRoot;
	readonly backPath?: string;
	readonly requestId: number;
}

export interface MobileRootTransition {
	readonly path: string;
	readonly root: MobileRoot;
	readonly requestId: number;
	readonly replaceState: true;
}

const screenPaths: Record<Exclude<MobileScreen, 'contacts'>, string> = {
	wallet: AppPath.Tokens,
	activity: AppPath.Activity,
	search: '/?search=true',
	notes: '/notes/',
	earn: AppPath.Earn,
	borrow: AppPath.Borrow,
	preferences: AppPath.Settings
};

// Contacts is a presentation over the committed route, not a history entry.
export const mobileScreenPath = (screen: MobileScreen): string | undefined =>
	screen === 'contacts' ? undefined : screenPaths[screen];

const pathOf = (url: URL): string => `${url.pathname}${url.search}${url.hash}`;
const isWalletList = (url: URL): boolean =>
	url.pathname === AppPath.Tokens || url.pathname === '/index.html';
const rootOf = (url: URL): MobileRoot => {
	if (url.pathname === AppPath.Activity) {
		return 'activity';
	}
	if (url.pathname === AppPath.Earn) {
		return 'earn';
	}
	if (url.pathname === AppPath.Borrow) {
		return 'borrow';
	}
	if (url.pathname === '/notes/') {
		return 'notes';
	}
	return isWalletList(url) && url.searchParams.has('search') ? 'search' : 'wallet';
};

// One committed location and one approved list parent, scoped to this web runtime.
// Root selections replace history. No private feature state is copied or persisted.
export const createMobileHistory = (initialURL: URL) => {
	if (!mobileRouteAllowed(initialURL)) {
		throw new Error('Unsupported mobile location');
	}
	let location = new URL(initialURL);
	let state: MobileHistoryState = { path: pathOf(location), root: rootOf(location), requestId: 0 };
	let pending: MobileRootTransition | undefined;
	let lastRequestedId = -1;

	return {
		get state(): MobileHistoryState {
			return { ...state };
		},
		get pending(): MobileRootTransition | undefined {
			return pending;
		},
		prepareRoot: ({ screen, requestId }: { screen: MobileScreen; requestId: number }) => {
			const path = screen === 'contacts' ? state.path : mobileScreenPath(screen);
			if (
				!path ||
				!Number.isSafeInteger(requestId) ||
				requestId < 0 ||
				requestId <= lastRequestedId
			) {
				return undefined;
			}
			lastRequestedId = requestId;
			pending = {
				path,
				root: screen === 'preferences' ? 'wallet' : screen === 'contacts' ? state.root : screen,
				requestId,
				replaceState: true
			};
			return pending;
		},
		commit: ({ transition, url }: { transition: MobileRootTransition; url: URL }): boolean => {
			if (pending !== transition || !mobileRouteAllowed(url) || pathOf(url) !== transition.path) {
				return false;
			}
			location = new URL(url);
			state = { path: transition.path, root: transition.root, requestId: transition.requestId };
			pending = undefined;
			return true;
		},
		cancel: (transition: MobileRootTransition): boolean => {
			if (pending !== transition) {
				return false;
			}
			// Acknowledge the request without changing the committed screen or its parent.
			state = { ...state, requestId: transition.requestId };
			pending = undefined;
			return true;
		},
		commitRoute: (url: URL): boolean => {
			if (pending || !mobileRouteAllowed(url)) {
				return false;
			}
			const path = pathOf(url);
			if (path === state.path) {
				return true;
			}
			const fromList = isWalletList(location) && url.pathname === AppPath.Transactions;
			state = {
				path,
				root: fromList ? state.root : rootOf(url),
				...(fromList ? { backPath: state.path } : {}),
				requestId: state.requestId
			};
			location = new URL(url);
			return true;
		},
		canGoBack: (url: URL): boolean =>
			!pending && mobileRouteAllowed(url) && state.backPath === pathOf(url)
	};
};
