import * as appEnvironment from '$app/environment';
import * as appNavigation from '$app/navigation';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	AppPath,
	NETWORK_PARAM,
	ROUTE_ID_GROUP_APP,
	TOKEN_PARAM,
	URI_PARAM
} from '$lib/constants/routes.constants';
import {
	back,
	gotoReplaceRoot,
	isActivityPath,
	isDappExplorerPath,
	isEarningPath,
	isNftsPath,
	isRewardsPath,
	isRouteActivity,
	isRouteDappExplorer,
	isRouteEarning,
	isRouteNfts,
	isRouteRewards,
	isRouteSettings,
	isRouteTokens,
	isRouteTransactions,
	isSettingsPath,
	isTokensPath,
	isTransactionsPath,
	loadRouteParams,
	networkParam,
	networkUrl,
	removeSearchParam,
	resetRouteParams,
	type RouteParams
} from '$lib/utils/nav.utils';
import type { LoadEvent, NavigationTarget, Page } from '@sveltejs/kit';
import type { MockInstance } from 'vitest';

describe('nav.utils', () => {
	const mockGoTo = vi.fn();

	beforeAll(() => {
		vi.resetAllMocks();

		vi.spyOn(appNavigation, 'goto').mockImplementation(mockGoTo);
	});

	describe('networkParam', () => {
		it('should return an empty string when networkId is undefined', () => {
			expect(networkParam(undefined)).toBe('');
		});

		it('should return the formatted network parameter when networkId is provided', () => {
			expect(networkParam(ICP_NETWORK_ID)).toBe(`${NETWORK_PARAM}=${ICP_NETWORK_ID.description}`);
		});
	});

	describe('networkUrl', () => {
		const mockPath = AppPath.Activity;
		const mockNetworkId = ETHEREUM_NETWORK_ID;
		const mockQueryParam = `${NETWORK_PARAM}=${mockNetworkId.description}`;
		const mockFromRoute: NavigationTarget = {
			url: new URL(`https://example.com/?${NETWORK_PARAM}=test-network`)
		} as unknown as NavigationTarget;

		it('should return the path without query params when networkId and fromRoute are undefined', () => {
			expect(
				networkUrl({
					path: mockPath,
					networkId: undefined,
					usePreviousRoute: false,
					fromRoute: null
				})
			).toBe(mockPath);
		});

		it('should return the path with query params when networkId is defined and usePreviousRoute is false', () => {
			expect(
				networkUrl({
					path: mockPath,
					networkId: mockNetworkId,
					usePreviousRoute: false,
					fromRoute: null
				})
			).toBe(`${mockPath}?${mockQueryParam}`);
		});

		it('should return the path without query params when usePreviousRoute is true but fromRoute is null', () => {
			expect(
				networkUrl({
					path: mockPath,
					networkId: mockNetworkId,
					usePreviousRoute: true,
					fromRoute: null
				})
			).toBe(mockPath);
		});

		it('should return the path with query params from fromRoute when usePreviousRoute is true and fromRoute is non-null', () => {
			expect(
				networkUrl({
					path: mockPath,
					networkId: undefined,
					usePreviousRoute: true,
					fromRoute: mockFromRoute
				})
			).toBe(`${mockPath}?${NETWORK_PARAM}=test-network`);
		});

		it('should prioritize fromRoute query params when usePreviousRoute is true and both networkId and fromRoute are provided', () => {
			expect(
				networkUrl({
					path: mockPath,
					networkId: mockNetworkId,
					usePreviousRoute: true,
					fromRoute: mockFromRoute
				})
			).toBe(`${mockPath}?${NETWORK_PARAM}=test-network`);
		});

		it('should return the path without query params from fromRoute when usePreviousRoute is true and ther is no network selected', () => {
			expect(
				networkUrl({
					path: mockPath,
					networkId: mockNetworkId,
					usePreviousRoute: true,
					fromRoute: { url: new URL(`https://example.com/`) } as unknown as NavigationTarget
				})
			).toBe(mockPath);
		});
	});

	describe('back', () => {
		it('should call history.back when pop is true', async () => {
			const historyBackMock = vi.spyOn(history, 'back');
			await back({ pop: true });

			expect(historyBackMock).toHaveBeenCalled();
		});

		it('should navigate to "/" when pop is false', async () => {
			await back({ pop: false });

			expect(mockGoTo).toHaveBeenCalledWith('/');
		});
	});

	describe('gotoReplaceRoot', () => {
		it('should navigate to "/" with replaceState', async () => {
			await gotoReplaceRoot();

			expect(mockGoTo).toHaveBeenCalledWith('/', { replaceState: true });
		});
	});

	describe('removeSearchParam', () => {
		it('should remove search param from URL', () => {
			const pushStateMock = vi.spyOn(appNavigation, 'pushState').mockImplementation(vi.fn());
			const urlString = 'https://example.com/';
			const url = new URL(urlString);
			const searchParams = new URLSearchParams({
				code: '123'
			});
			url.search = searchParams.toString();

			expect(url.toString()).toBe(`${urlString}?code=123`);

			removeSearchParam({ url, searchParam: 'code' });

			expect(pushStateMock).toHaveBeenCalledWith(url, {});
			expect(url.toString()).toBe(urlString);
		});
	});

	describe('loadRouteParams', () => {
		let spyBrowser: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyBrowser = vi.spyOn(appEnvironment, 'browser', 'get');

			spyBrowser.mockReturnValue(true);
		});

		it('should return undefined values if not in a browser', () => {
			spyBrowser.mockReturnValueOnce(false);

			const result = loadRouteParams({
				url: {
					searchParams: {
						get: vi.fn((key) => (key === TOKEN_PARAM ? 'testToken' : null))
					}
				}
			} as unknown as LoadEvent);

			expect(result).toEqual({
				[TOKEN_PARAM]: undefined,
				[NETWORK_PARAM]: undefined,
				[URI_PARAM]: undefined
			});
		});

		it('should parse route parameters correctly', () => {
			expect(
				loadRouteParams({
					url: {
						searchParams: {
							get: vi.fn((key) => (key === TOKEN_PARAM ? 'testToken' : null))
						}
					}
				} as unknown as LoadEvent)
			).toEqual({
				[TOKEN_PARAM]: 'testToken',
				[NETWORK_PARAM]: null,
				[URI_PARAM]: null
			});

			expect(
				loadRouteParams({
					url: {
						searchParams: {
							get: vi.fn((key) => (key === NETWORK_PARAM ? 'testNetwork' : null))
						}
					}
				} as unknown as LoadEvent)
			).toEqual({
				[TOKEN_PARAM]: null,
				[NETWORK_PARAM]: 'testNetwork',
				[URI_PARAM]: null
			});

			expect(
				loadRouteParams({
					url: {
						searchParams: {
							get: vi.fn((key) => (key === URI_PARAM ? 'testURI' : null))
						}
					}
				} as unknown as LoadEvent)
			).toEqual({
				[TOKEN_PARAM]: null,
				[NETWORK_PARAM]: null,
				[URI_PARAM]: 'testURI'
			});
		});

		it('should handle emoji in search params', () => {
			expect(
				loadRouteParams({
					url: {
						searchParams: {
							get: vi.fn((key) => (key === TOKEN_PARAM ? '💰' : null))
						}
					}
				} as unknown as LoadEvent)
			).toEqual({
				[TOKEN_PARAM]: '💰',
				[NETWORK_PARAM]: null,
				[URI_PARAM]: null
			});
		});

		it('should handle correctly one missing parameter', () => {
			expect(
				loadRouteParams({
					url: {
						searchParams: {
							get: vi.fn((key) => (key === TOKEN_PARAM ? null : 'mock-params'))
						}
					}
				} as unknown as LoadEvent)
			).toEqual({
				[TOKEN_PARAM]: null,
				[NETWORK_PARAM]: 'mock-params',
				[URI_PARAM]: 'mock-params'
			});
		});

		it('should return all parameters as null if none are present', () => {
			expect(
				loadRouteParams({
					url: {
						searchParams: {
							get: vi.fn(() => null)
						}
					}
				} as unknown as LoadEvent)
			).toEqual({
				[TOKEN_PARAM]: null,
				[NETWORK_PARAM]: null,
				[URI_PARAM]: null
			});
		});

		it('should handle null decoded values', () => {
			vi.stubGlobal('decodeURIComponent', () => null);

			const result = loadRouteParams({
				url: {
					searchParams: {
						get: vi.fn((key) =>
							key === TOKEN_PARAM
								? 'testToken'
								: key === URI_PARAM
									? 'testURI'
									: key === NETWORK_PARAM
										? 'testNetwork'
										: null
						)
					}
				}
			} as unknown as LoadEvent);

			expect(result).toEqual({
				[TOKEN_PARAM]: null,
				[NETWORK_PARAM]: 'testNetwork',
				[URI_PARAM]: null
			});

			vi.unstubAllGlobals();
		});
	});

	describe('resetRouteParams', () => {
		it('should return an object with all values set to null', () => {
			const result = resetRouteParams();

			Object.keys(result).forEach((key) => {
				expect(result[key as keyof RouteParams]).toBeNull();
			});
		});
	});

	describe('Route Check Functions', () => {
		const mockPage = (id: string): Page => ({
			params: {},
			route: { id },
			status: 200,
			error: null,
			data: {},
			url: URL.prototype,
			state: {},
			form: null
		});

		describe('isRouteTransactions', () => {
			it('should return true when route id matches Transactions path', () => {
				const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Transactions}`;

				expect(isRouteTransactions(mockPage(mockPath))).toBeTruthy();
				expect(isRouteTransactions(mockPage(mockPath.slice(0, -1)))).toBeTruthy();
			});

			it('should return false when route id does not match Transactions path', () => {
				expect(isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBeFalsy();

				expect(
					isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))
				).toBeFalsy();

				expect(isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBeFalsy();

				expect(isRouteTransactions(mockPage(`/anotherGroup/${AppPath.Transactions}`))).toBeFalsy();
			});
		});

		describe('isRouteSettings', () => {
			const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Settings}`;

			expect(isRouteSettings(mockPage(mockPath))).toBeTruthy();
			expect(isRouteSettings(mockPage(mockPath.slice(0, -1)))).toBeTruthy();

			it('should return false when route id does not match Settings path', () => {
				expect(isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBeFalsy();

				expect(
					isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Transactions}`))
				).toBeFalsy();

				expect(isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBeFalsy();

				expect(isRouteSettings(mockPage(`/anotherGroup/${AppPath.Settings}`))).toBeFalsy();
			});
		});

		describe('isRouteDappExplorer', () => {
			it('should return true when route id matches Explore path', () => {
				const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Explore}`;

				expect(isRouteDappExplorer(mockPage(mockPath))).toBeTruthy();
				expect(isRouteDappExplorer(mockPage(mockPath.slice(0, -1)))).toBeTruthy();
			});

			it('should return false when route id does not match Explore path', () => {
				expect(isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBeFalsy();

				expect(
					isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))
				).toBeFalsy();

				expect(isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBeFalsy();

				expect(isRouteDappExplorer(mockPage(`/anotherGroup/${AppPath.Explore}`))).toBeFalsy();
			});
		});

		describe('isRouteActivity', () => {
			it('should return true when route id matches Activity path', () => {
				const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Activity}`;

				expect(isRouteActivity(mockPage(mockPath))).toBeTruthy();
				expect(isRouteActivity(mockPage(mockPath.slice(0, -1)))).toBeTruthy();
			});

			it('should return false when route id does not match Activity path', () => {
				expect(isRouteActivity(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBeFalsy();

				expect(isRouteActivity(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBeFalsy();

				expect(isRouteActivity(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBeFalsy();

				expect(isRouteActivity(mockPage(`/anotherGroup/${AppPath.Activity}`))).toBeFalsy();
			});
		});

		describe('isRouteTokens', () => {
			it('should return true when route id matches ROUTE_ID_GROUP_APP exactly', () => {
				expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Tokens}`))).toBeTruthy();
			});

			it('should return true when route id matches Wallet Connect path', () => {
				expect(
					isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.WalletConnect}`))
				).toBeTruthy();
			});

			it('should return false when route id does not match ROUTE_ID_GROUP_APP exactly', () => {
				expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBeFalsy();

				expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBeFalsy();

				expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Transactions}`))).toBeFalsy();

				expect(isRouteTokens(mockPage('/anotherGroup'))).toBeFalsy();
			});
		});

		describe('isRouteAirdrops', () => {
			it('should return true when route id matches Airdrops path', () => {
				const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Rewards}`;

				expect(isRouteRewards(mockPage(mockPath))).toBeTruthy();
				expect(isRouteRewards(mockPage(mockPath.slice(0, -1)))).toBeTruthy();
			});

			it('should return false when route id does not match Airdrops path', () => {
				expect(isRouteRewards(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBeFalsy();

				expect(isRouteRewards(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBeFalsy();

				expect(isRouteRewards(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBeFalsy();

				expect(isRouteRewards(mockPage(`/anotherGroup/${AppPath.Rewards}`))).toBeFalsy();
			});
		});

		describe('isRouteEarning', () => {
			it('should return true when route id matches Earning path', () => {
				const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Earning}`;

				expect(isRouteEarning(mockPage(mockPath))).toBeTruthy();
				expect(isRouteEarning(mockPage(mockPath.slice(0, -1)))).toBeTruthy();
			});

			it('should return true when route id is any subroute of the Earning path', () => {
				expect(
					isRouteEarning(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.EarningRewards}`))
				).toBeTruthy();
				expect(
					isRouteEarning(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Earning}/subroute`))
				).toBeTruthy();
			});

			it('should return false when route id does not match Earning path', () => {
				expect(isRouteEarning(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBeFalsy();

				expect(isRouteEarning(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBeFalsy();

				expect(isRouteEarning(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBeFalsy();

				expect(isRouteEarning(mockPage(`/anotherGroup/${AppPath.Rewards}`))).toBeFalsy();
			});
		});

		describe('isRouteNfts', () => {
			it('should return true when route id matches Nfts path', () => {
				expect(isRouteNfts(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Nfts}`))).toBeTruthy();
			});

			it('should return true when route id is any subroute of the Nfts path', () => {
				expect(isRouteNfts(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Nfts}/subroute`))).toBeTruthy();
			});

			it('should return false when route id does not match Nfts path', () => {
				expect(isRouteNfts(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBeFalsy();

				expect(isRouteNfts(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBeFalsy();

				expect(isRouteNfts(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBeFalsy();

				expect(isRouteNfts(mockPage(`/anotherGroup/${AppPath.Rewards}`))).toBeFalsy();
			});
		});
	});

	describe('Path Matching Functions', () => {
		const withAppPrefix = (path: string) => `${ROUTE_ID_GROUP_APP}${path}`;

		it('isTransactionsPath', () => {
			expect(isTransactionsPath(withAppPrefix(AppPath.Transactions))).toBeTruthy();
			expect(isTransactionsPath('/(app)/transactions')).toBeTruthy(); // without trailing slash
			expect(isTransactionsPath('/wrong')).toBeFalsy();
			expect(isTransactionsPath(null)).toBeFalsy();
		});

		it('isSettingsPath', () => {
			expect(isSettingsPath(withAppPrefix(AppPath.Settings))).toBeTruthy();
			expect(isSettingsPath('/(app)/settings')).toBeTruthy();
			expect(isSettingsPath('/(app)/settings/wrong')).toBeFalsy();
			expect(isSettingsPath(null)).toBeFalsy();
		});

		it('isDappExplorerPath', () => {
			expect(isDappExplorerPath(withAppPrefix(AppPath.Explore))).toBeTruthy();
			expect(isDappExplorerPath('/(app)/explore')).toBeTruthy();
			expect(isDappExplorerPath('/(app)/explore/wrong')).toBeFalsy();
			expect(isDappExplorerPath(null)).toBeFalsy();
		});

		it('isActivityPath', () => {
			expect(isActivityPath(withAppPrefix(AppPath.Activity))).toBeTruthy();
			expect(isActivityPath('/(app)/activity')).toBeTruthy();
			expect(isActivityPath('/(app)/activity/wrong')).toBeFalsy();
			expect(isActivityPath(null)).toBeFalsy();
		});

		it('isTokensPath', () => {
			expect(isTokensPath(withAppPrefix(AppPath.Tokens))).toBeTruthy();
			expect(isTokensPath(withAppPrefix(AppPath.WalletConnect))).toBeTruthy();
			expect(isTokensPath('/(app)/wc')).toBeTruthy();
			expect(isTokensPath('/(app)/wrong')).toBeFalsy();
			expect(isTokensPath(null)).toBeFalsy();
		});

		it('isNftsPath', () => {
			expect(isNftsPath(withAppPrefix(AppPath.Nfts))).toBeTruthy();
			expect(isNftsPath('/(app)/assets/nfts/subpath')).toBeFalsy();
			expect(isNftsPath('/(app)/wrong')).toBeFalsy();
			expect(isNftsPath(null)).toBeFalsy();
		});

		it('isRewardsPath', () => {
			expect(isRewardsPath(withAppPrefix(AppPath.Rewards))).toBeTruthy();
			expect(isRewardsPath('/(app)/rewards')).toBeTruthy();
			expect(isRewardsPath('/(app)/rewards/bonus')).toBeFalsy();
			expect(isRewardsPath(null)).toBeFalsy();
		});

		it('isEarningPath', () => {
			expect(isEarningPath(withAppPrefix(AppPath.Earning))).toBeTruthy();
			expect(isEarningPath(withAppPrefix(AppPath.EarningRewards))).toBeTruthy();
			expect(isEarningPath('/(app)/earning/whatever')).toBeTruthy();
			expect(isEarningPath(null)).toBeFalsy();
		});
	});
});
