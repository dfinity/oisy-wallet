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
	configMockResponse,
	dailyAnalyticsMockResponse,
	stakePositionMockResponse
} from '$tests/mocks/gldt_stake.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import type { Identity } from '@icp-sdk/core/agent';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('GldtStakeContext', () => {
	const mockContext = (store: GldtStakeStore) => new Map([[GLDT_STAKE_CONTEXT_KEY, { store }]]);
	const mockGetDailyAnalytics = () =>
		vi.spyOn(gldtStakeApi, 'getDailyAnalytics').mockResolvedValue(dailyAnalyticsMockResponse);
	const mockGetPosition = () =>
		vi.spyOn(gldtStakeApi, 'getPosition').mockResolvedValue(stakePositionMockResponse);
	const mockGetConfig = () =>
		vi.spyOn(gldtStakeApi, 'getConfig').mockResolvedValue(configMockResponse);
	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

	const props = {
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();

		icTokenFeeStore.reset();
	});

	it('should call analytics and position methods with proper params', async () => {
		const store = initGldtStakeStore();
		const setApySpy = vi.spyOn(store, 'setApy');
		const setPositionSpy = vi.spyOn(store, 'setPosition');
		const setConfigSpy = vi.spyOn(store, 'setConfig');
		const getDailyAnalyticsSpy = mockGetDailyAnalytics();
		const getPositionSpy = mockGetPosition();
		const getConfigSpy = mockGetConfig();

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
			expect(getConfigSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
			expect(setApySpy).toHaveBeenCalledExactlyOnceWith(dailyAnalyticsMockResponse.apy);
			expect(setPositionSpy).toHaveBeenCalledExactlyOnceWith(stakePositionMockResponse);
			expect(setConfigSpy).toHaveBeenCalledExactlyOnceWith(configMockResponse);
		});
	});

	it('should not call analytics and position methods if no authIdentity available', async () => {
		const store = initGldtStakeStore();
		const getDailyAnalyticsSpy = mockGetDailyAnalytics();
		const getPositionSpy = mockGetPosition();
		const getConfigSpy = mockGetConfig();

		mockAuthStore(null);

		render(GldtStakeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getDailyAnalyticsSpy).not.toHaveBeenCalled();
			expect(getPositionSpy).not.toHaveBeenCalled();
			expect(getConfigSpy).not.toHaveBeenCalled();
		});
	});
});
