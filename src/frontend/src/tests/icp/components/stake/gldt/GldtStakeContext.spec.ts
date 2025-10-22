import * as gldtStakeApi from '$icp/api/gldt_stake.api';
import GldtStakeContext from '$icp/components/stake/gldt/GldtStakeContext.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeStore
} from '$icp/stores/gldt-stake.store';
import { icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import * as authStore from '$lib/derived/auth.derived';
import {
	dailyAnalyticsMockResponse,
	stakePositionMockResponse
} from '$tests/mocks/gldt_stake.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import type { Identity } from '@dfinity/agent';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('GldtStakeContext', () => {
	const parsedMockApy = Math.round(dailyAnalyticsMockResponse.apy * 100) / 100;

	const mockContext = (store: GldtStakeStore) => new Map([[GLDT_STAKE_CONTEXT_KEY, { store }]]);
	const mockGetDailyAnalytics = () =>
		vi.spyOn(gldtStakeApi, 'getDailyAnalytics').mockResolvedValue(dailyAnalyticsMockResponse);
	const mockGetPosition = () =>
		vi.spyOn(gldtStakeApi, 'getPosition').mockResolvedValue(stakePositionMockResponse);
	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

	const props = {
		children: mockSnippet
	};

	beforeEach(() => {
		icTokenFeeStore.reset();
	});

	it('should call analytics and position methods with proper params', async () => {
		const store = initGldtStakeStore();
		const setApySpy = vi.spyOn(store, 'setApy');
		const setPositionSpy = vi.spyOn(store, 'setPosition');
		const getDailyAnalyticsSpy = mockGetDailyAnalytics();
		const getPositionSpy = mockGetPosition();

		mockAuthStore();

		render(GldtStakeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getDailyAnalyticsSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
			expect(getPositionSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
			expect(setApySpy).toHaveBeenCalledExactlyOnceWith(parsedMockApy);
			expect(setPositionSpy).toHaveBeenCalledExactlyOnceWith(stakePositionMockResponse);
		});
	});

	it('should not call analytics and position methods if no authIdentity available', async () => {
		const store = initGldtStakeStore();
		const getDailyAnalyticsSpy = mockGetDailyAnalytics();
		const getPositionSpy = mockGetPosition();

		mockAuthStore(null);

		render(GldtStakeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getDailyAnalyticsSpy).not.toHaveBeenCalled();
			expect(getPositionSpy).not.toHaveBeenCalled();
		});
	});
});
