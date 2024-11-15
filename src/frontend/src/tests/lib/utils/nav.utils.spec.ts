import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import {
	isRouteActivity,
	isRouteDappExplorer,
	isRouteSettings,
	isRouteTokens,
	isRouteTransactions,
	resetRouteParams,
	type RouteParams
} from '$lib/utils/nav.utils';
import type { Page } from '@sveltejs/kit';
import { describe, expect } from 'vitest';

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
			expect(isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Transactions}`))).toBe(
				true
			);
		});

		it('should return false when route id does not match Transactions path', () => {
			expect(isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

			expect(isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBe(false);

			expect(isRouteTransactions(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBe(false);

			expect(isRouteTransactions(mockPage(`/anotherGroup/${AppPath.Transactions}`))).toBe(false);
		});
	});

	describe('isRouteSettings', () => {
		it('should return true when route id matches Settings path', () => {
			expect(isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBe(true);
		});

		it('should return false when route id does not match Settings path', () => {
			expect(isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

			expect(isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Transactions}`))).toBe(false);

			expect(isRouteSettings(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBe(false);

			expect(isRouteSettings(mockPage(`/anotherGroup/${AppPath.Settings}`))).toBe(false);
		});
	});

	describe('isRouteDappExplorer', () => {
		it('should return true when route id matches Explore path', () => {
			expect(isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Explore}`))).toBe(true);
		});

		it('should return false when route id does not match Explore path', () => {
			expect(isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

			expect(isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBe(false);

			expect(isRouteDappExplorer(mockPage(`${ROUTE_ID_GROUP_APP}`))).toBe(false);

			expect(isRouteDappExplorer(mockPage(`/anotherGroup/${AppPath.Explore}`))).toBe(false);
		});
	});

	describe('isRouteActivity', () => {
		it('should return true when route id matches Activity path', () => {
			expect(isRouteActivity(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Activity}`))).toBe(true);
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

		it('should return false when route id does not match ROUTE_ID_GROUP_APP exactly', () => {
			expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}/wrongPath`))).toBe(false);

			expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Settings}`))).toBe(false);

			expect(isRouteTokens(mockPage(`${ROUTE_ID_GROUP_APP}${AppPath.Transactions}`))).toBe(false);

			expect(isRouteTokens(mockPage('/anotherGroup'))).toBe(false);
		});
	});
});
