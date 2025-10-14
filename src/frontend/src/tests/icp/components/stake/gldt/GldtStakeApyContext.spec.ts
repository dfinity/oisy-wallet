import GldtStakeApyContext from '$icp/components/stake/gldt/GldtStakeApyContext.svelte';
import {
	GLDT_STAKE_APY_CONTEXT_KEY,
	initGldtStakeApyStore,
	type GldtStakeApyStore
} from '$icp/stores/gldt-stake-apy.store';
import { icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import * as gldtStakeApi from '$lib/api/gldt_stake.api';
import * as authStore from '$lib/derived/auth.derived';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Identity } from '@dfinity/agent';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('GldtStakeApyContext', () => {
	const mockApy = 10;
	const mockContext = (store: GldtStakeApyStore) =>
		new Map([[GLDT_STAKE_APY_CONTEXT_KEY, { store }]]);
	const mockGetApyOverall = () =>
		vi.spyOn(gldtStakeApi, 'getApyOverall').mockResolvedValue(mockApy);
	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

	beforeEach(() => {
		icTokenFeeStore.reset();
	});

	it('should call getApyOverall with proper params', async () => {
		const store = initGldtStakeApyStore();
		const setApySpy = vi.spyOn(store, 'setApy');
		const getApyOverallSpy = mockGetApyOverall();

		mockAuthStore();

		render(GldtStakeApyContext, {
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getApyOverallSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
			expect(setApySpy).toHaveBeenCalledExactlyOnceWith(mockApy);
		});
	});

	it('should not call getApyOverall if no authIdentity available', async () => {
		const store = initGldtStakeApyStore();
		const getApyOverallSpy = mockGetApyOverall();

		mockAuthStore(null);

		render(GldtStakeApyContext, {
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getApyOverallSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call getApyOverall if value is already known', async () => {
		const store = initGldtStakeApyStore();
		const getApyOverallSpy = mockGetApyOverall();

		mockAuthStore();

		store.setApy(mockApy);

		render(GldtStakeApyContext, {
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getApyOverallSpy).not.toHaveBeenCalled();
		});
	});
});
