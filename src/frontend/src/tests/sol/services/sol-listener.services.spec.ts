import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { syncWallet, syncWalletError } from '$sol/services/sol-listener.services';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

describe('sol-listener', () => {
	const tokenId: TokenId = parseTokenId('testTokenId');
	const mockBalance = 1000n;

	const mockPostMessage = ({
		balance = mockBalance
	}: {
		balance?: bigint | null;
	}): SolPostMessageDataResponseWallet => ({
		wallet: {
			balance: {
				certified: true,
				data: balance
			},
			newTransactions: ''
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();
		balancesStore.reset(tokenId);
	});

	describe('syncWallet', () => {
		it('should set the balance in balancesStore', () => {
			syncWallet({ data: mockPostMessage({}), tokenId });

			const balance = get(balancesStore);

			expect(balance?.[tokenId]).toEqual({
				data: BigNumber.from(mockBalance),
				certified: true
			});
		});

		it('should reset balanceStore if balance is empty', () => {
			syncWallet({ data: mockPostMessage({ balance: null }), tokenId });

			const balance = get(balancesStore);

			expect(balance?.[tokenId]).toBeNull();
		});
	});

	describe('syncWalletError', () => {
		it('should reset balanceStore on error', () => {
			syncWallet({ data: mockPostMessage({}), tokenId });

			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			const balance = get(balancesStore);

			expect(balance?.[tokenId]).toBeNull();
		});

		it('should log a warning if hideToast is true', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});
});
