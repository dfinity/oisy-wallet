import { syncCkEthMinterError } from '$icp/services/cketh-listener.services';
import { TRACK_COUNT_CKETH_LOADING_MINTER_INFO_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import type { TokenId } from '$lib/types/token';
import en from '$tests/mocks/i18n.mock';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('eth-transactions.services', () => {
	it('resets store, tracks event, and logs error', () => {
		const mockTokenId = Symbol('mock') as TokenId;
		const mockError = new Error('Failed to fetch minter info');
		const mockWarning = `${en.init.error.minter_cketh_loading_info}, ${mockError}`;

		syncCkEthMinterError({ tokenId: mockTokenId, error: mockError });

		expect(trackEvent).toHaveBeenCalledWith({
			name: TRACK_COUNT_CKETH_LOADING_MINTER_INFO_ERROR,
			metadata: {
				error: mockError.toString()
			},
			warning: mockWarning
		});
	});
});
