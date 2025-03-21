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
	isRouteActivity,
	isRouteDappExplorer,
	isRouteRewards,
	isRouteSettings,
	isRouteTokens,
	isRouteTransactions,
	loadRouteParams,
	networkParam,
	networkUrl,
	removeSearchParam,
	resetRouteParams,
	type RouteParams
} from '$lib/utils/nav.utils';
import type { LoadEvent, NavigationTarget, Page } from '@sveltejs/kit';

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
		it('should return undefined values if not in a browser', () => {
			const result = loadRouteParams({
				url: {
					searchParams: {
						get: vi.fn((_) => null)
					}
				}
			} as unknown as LoadEvent);
			expect(result).toEqual({
				[TOKEN_PARAM]: null,
				[NETWORK_PARAM]: null,
				[URI_PARAM]: null
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

				expect(isRouteTransactions(mockPage(mockPath))).toBe(true);
				expect(isRouteTransactions(mockPage(mockPath.slice(0, -1)))).toBe(true);
			});

			it('should return false when route id does not match Transactions path', () => {
				expect(isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

				expect(isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBe(
					false
				);

				expect(isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBe(false);

				expect(isRouteTransactions(mockPage(`/anotherGroup/${AppPath.Transactions}`))).toBe(false);
			});
		});

		describe('isRouteSettings', () => {
			const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Settings}`;

			expect(isRouteSettings(mockPage(mockPath))).toBe(true);
			expect(isRouteSettings(mockPage(mockPath.slice(0, -1)))).toBe(true);

			it('should return false when route id does not match Settings path', () => {
				expect(isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

				expect(isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Transactions}`))).toBe(
					false
				);

				expect(isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBe(false);

				expect(isRouteSettings(mockPage(`/anotherGroup/${AppPath.Settings}`))).toBe(false);
			});
		});

		describe('isRouteDappExplorer', () => {
			it('should return true when route id matches Explore path', () => {
				const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Explore}`;

				expect(isRouteDappExplorer(mockPage(mockPath))).toBe(true);
				expect(isRouteDappExplorer(mockPage(mockPath.slice(0, -1)))).toBe(true);
			});

			it('should return false when route id does not match Explore path', () => {
				expect(isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

				expect(isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBe(
					false
				);

				expect(isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBe(false);

				expect(isRouteDappExplorer(mockPage(`/anotherGroup/${AppPath.Explore}`))).toBe(false);
			});
		});

		describe('isRouteActivity', () => {
			it('should return true when route id matches Activity path', () => {
				const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Activity}`;

				expect(isRouteActivity(mockPage(mockPath))).toBe(true);
				expect(isRouteActivity(mockPage(mockPath.slice(0, -1)))).toBe(true);
			});

			it('should return false when route id does not match Activity path', () => {
				expect(isRouteActivity(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

				expect(isRouteActivity(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBe(false);

				expect(isRouteActivity(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBe(false);

				expect(isRouteActivity(mockPage(`/anotherGroup/${AppPath.Activity}`))).toBe(false);
			});
		});

		describe('isRouteTokens', () => {
			it('should return true when route id matches ROUTE_ID_GROUP_APP exactly', () => {
				expect(isRouteTokens(mockPage(ROUTE_ID_GROUP_APP))).toBe(true);
			});

			it('should return true when route id matches Wallet Connect path', () => {
				expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.WalletConnect}`))).toBe(true);
			});

			it('should return false when route id does not match ROUTE_ID_GROUP_APP exactly', () => {
				expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

				expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBe(false);

				expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Transactions}`))).toBe(false);

				expect(isRouteTokens(mockPage('/anotherGroup'))).toBe(false);
			});
		});

		describe('isRouteAirdrops', () => {
			it('should return true when route id matches Airdrops path', () => {
				const mockPath = `${ROUTE_ID_GROUP_APP}${AppPath.Rewards}`;

				expect(isRouteRewards(mockPage(mockPath))).toBe(true);
				expect(isRouteRewards(mockPage(mockPath.slice(0, -1)))).toBe(true);
			});

			it('should return false when route id does not match Airdrops path', () => {
				expect(isRouteRewards(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

				expect(isRouteRewards(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBe(false);

				expect(isRouteRewards(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBe(false);

				expect(isRouteRewards(mockPage(`/anotherGroup/${AppPath.Rewards}`))).toBe(false);
			});
		});
	});
});
