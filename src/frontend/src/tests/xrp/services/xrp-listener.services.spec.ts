import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { syncWallet, syncWalletError } from '$xrp/services/xrp-listener.services';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import { get } from 'svelte/store';

describe('xrp-listener.services', () => {
	const tokenId: TokenId = parseTokenId('testXrpTokenId');
	const mockBalance = 25_000_000n;

	const mockPostMessage = ({
		balance = mockBalance
	}: {
		balance?: XrpBalance | null;
	}): XrpPostMessageDataResponseWallet => ({
		wallet: {
			balance: {
				certified: true,
				data: balance
			}
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();
		balancesStore.reset(tokenId);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('syncWallet', () => {
		it('sets the balance in balancesStore', async () => {
			vi.useFakeTimers();

			syncWallet({ data: mockPostMessage({}), tokenId });

			await vi.runAllTimersAsync();

			expect(get(balancesStore)?.[tokenId]).toEqual({
				data: mockBalance,
				certified: true
			});
		});

		it('resets balancesStore when the balance is empty', () => {
			syncWallet({ data: mockPostMessage({ balance: null }), tokenId });

			expect(get(balancesStore)?.[tokenId]).toBeNull();
		});
	});

	describe('syncWalletError', () => {
		it('resets balancesStore on error', () => {
			syncWallet({ data: mockPostMessage({}), tokenId });

			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(get(balancesStore)?.[tokenId]).toBeNull();
		});

		it('logs a warning when hideToast is true', () => {
			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(console.warn).toHaveBeenCalled();
		});
	});
});
