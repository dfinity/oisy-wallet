import * as gldtStakeApi from '$icp/api/gldt_stake.api';
import GldtStakeContext from '$icp/components/stake/gldt/GldtStakeContext.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeStore
} from '$icp/stores/gldt-stake.store';
import { icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import * as authStore from '$lib/derived/auth.derived';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import type { Identity } from '@icp-sdk/core/agent';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('GldtStakeContext', () => {
	const mockApy = 10.1232131232121;
	const parsedMockApy = Math.round(mockApy * 100) / 100;

	const mockContext = (store: GldtStakeStore) => new Map([[GLDT_STAKE_CONTEXT_KEY, { store }]]);
	const mockGetApyOverall = () =>
		vi.spyOn(gldtStakeApi, 'getApyOverall').mockResolvedValue(mockApy);
	const mockAuthStore = (value: Identity | null = mockIdentity) =>
		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(value));

	const props = {
		children: mockSnippet
	};

	beforeEach(() => {
		icTokenFeeStore.reset();
	});

	it('should call getApyOverall with proper params', async () => {
		const store = initGldtStakeStore();
		const setApySpy = vi.spyOn(store, 'setApy');
		const getApyOverallSpy = mockGetApyOverall();

		mockAuthStore();

		render(GldtStakeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getApyOverallSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
			expect(setApySpy).toHaveBeenCalledExactlyOnceWith(parsedMockApy);
		});
	});

	it('should not call getApyOverall if no authIdentity available', async () => {
		const store = initGldtStakeStore();
		const getApyOverallSpy = mockGetApyOverall();

		mockAuthStore(null);

		render(GldtStakeContext, {
			props,
			context: mockContext(store)
		});

		await waitFor(() => {
			expect(getApyOverallSpy).not.toHaveBeenCalled();
		});
	});
});
