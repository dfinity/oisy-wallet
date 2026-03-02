import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	allBalancesZero,
	anyBalanceNonZero,
	balance,
	balanceZero,
	noPositiveBalanceAndNotAllBalancesZero
} from '$lib/derived/balances.derived';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { token } from '$lib/stores/token.store';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import { bn1Bi } from '$tests/mocks/balances.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('balances.derived', () => {
	describe('balance', () => {
		beforeEach(() => {
			balancesStore.reinitialize();

			token.set(null);
		});

		it('should return undefined when token is nullish', () => {
			expect(get(balance)).toBeUndefined();
		});

		it('should return the balance data for the current token', () => {
			token.set(ICP_TOKEN);

			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: bn1Bi, certified: false }
			});

			expect(get(balance)).toBe(bn1Bi);
		});

		it('should return undefined when balance for token is not loaded', () => {
			token.set(ICP_TOKEN);

			expect(get(balance)).toBeUndefined();
		});
	});

	describe('balanceZero', () => {
		beforeEach(() => {
			balancesStore.reinitialize();

			token.set(null);
		});

		it('should return false when token is nullish', () => {
			// Make the balances store non-nullish so that the token-nullish branch is exercised.
			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: ZERO, certified: false }
			});
			expect(get(balanceZero)).toBeFalsy();
		});

		it('should return true when balance is zero', () => {
			token.set(ICP_TOKEN);
			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: ZERO, certified: false }
			});

			expect(get(balanceZero)).toBeTruthy();
		});

		it('should return false when balance is non-zero', () => {
			token.set(ICP_TOKEN);
			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: bn1Bi, certified: false }
			});

			expect(get(balanceZero)).toBeFalsy();
		});

		it('should return false when balance is not yet loaded', () => {
			token.set(ICP_TOKEN);

			expect(get(balanceZero)).toBeFalsy();
		});
	});

	describe('anyBalanceNonZero', () => {
		const mockTokenId1 = parseTokenId('mock-token-1');
		const mockTokenId2 = parseTokenId('mock-token-2');

		beforeEach(() => {
			vi.clearAllMocks();

			balancesStore.reinitialize();
		});

		it('should return false if balances data are nullish', () => {
			expect(get(anyBalanceNonZero)).toBeFalsy();
		});

		it('should return false if balances data are empty', () => {
			balancesStore.reset(mockTokenId1);

			expect(get(anyBalanceNonZero)).toBeFalsy();
		});

		it('should return true if there is at least one non-zero balance', () => {
			balancesStore.set({
				id: mockTokenId1,
				data: { data: bn1Bi, certified: false }
			});

			expect(get(anyBalanceNonZero)).toBeTruthy();

			balancesStore.reset(mockTokenId2);

			expect(get(anyBalanceNonZero)).toBeTruthy();
		});

		it('should return false if all balances are zero', () => {
			balancesStore.set({
				id: mockTokenId1,
				data: { data: ZERO, certified: false }
			});

			expect(get(anyBalanceNonZero)).toBeFalsy();

			balancesStore.reset(mockTokenId2);

			expect(get(anyBalanceNonZero)).toBeFalsy();
		});
	});

	describe('allBalancesZero', () => {
		let tokens: Token[];

		beforeEach(() => {
			vi.clearAllMocks();

			setupUserNetworksStore('allEnabled');

			tokens = get(enabledFungibleNetworkTokens);

			balancesStore.reinitialize();

			splDefaultTokensStore.reset();
			splCustomTokensStore.resetAll();
		});

		it('should return false if balances data are nullish', () => {
			expect(get(allBalancesZero)).toBeFalsy();
		});

		it('should return false if balances data are empty', () => {
			balancesStore.reset(tokens[0].id);

			expect(get(allBalancesZero)).toBeFalsy();
		});

		it('should return true if all balances are nullish', () => {
			tokens.forEach(({ id }) => {
				balancesStore.reset(id);
			});

			expect(get(allBalancesZero)).toBeTruthy();
		});

		it('should return false if there is at least one non-zero balance', () => {
			balancesStore.set({
				id: tokens[0].id,
				data: { data: bn1Bi, certified: false }
			});

			expect(get(allBalancesZero)).toBeFalsy();

			balancesStore.reset(tokens[1].id);

			expect(get(allBalancesZero)).toBeFalsy();
		});

		it('should return false if there is at least one zero balance but the rest is not yet filled', () => {
			balancesStore.set({
				id: tokens[0].id,
				data: { data: ZERO, certified: false }
			});

			expect(get(allBalancesZero)).toBeFalsy();

			balancesStore.reset(tokens[1].id);

			expect(get(allBalancesZero)).toBeFalsy();
		});

		it('should return false if there is at least one non-zero balance and the rest is all zero', () => {
			tokens.forEach(({ id }) => {
				balancesStore.set({
					id,
					data: { data: ZERO, certified: false }
				});
			});

			balancesStore.set({
				id: tokens[0].id,
				data: { data: bn1Bi, certified: false }
			});

			expect(get(allBalancesZero)).toBeFalsy();
		});

		it('should return true if all balances are zero', () => {
			tokens.forEach(({ id }) => {
				balancesStore.set({
					id,
					data: { data: ZERO, certified: false }
				});
			});

			expect(get(allBalancesZero)).toBeTruthy();
		});

		it('should return true if there is at least one zero balance but the rest is nullish', () => {
			tokens.forEach(({ id }) => {
				balancesStore.reset(id);
			});

			balancesStore.set({
				id: tokens[0].id,
				data: { data: ZERO, certified: false }
			});

			expect(get(allBalancesZero)).toBeTruthy();
		});

		it('should change value to false when a non-zero balance is added after all were zero', () => {
			tokens.forEach(({ id }) => {
				balancesStore.set({
					id,
					data: { data: ZERO, certified: false }
				});
			});

			expect(get(allBalancesZero)).toBeTruthy();

			splDefaultTokensStore.add(BONK_TOKEN);
			splCustomTokensStore.setAll([
				{ data: { ...BONK_TOKEN, version: undefined, enabled: true }, certified: false }
			]);

			const newTokens = get(enabledFungibleNetworkTokens);

			expect(newTokens).toHaveLength(tokens.length + 1);

			expect(get(allBalancesZero)).toBeFalsy();
		});
	});

	describe('noPositiveBalanceAndNotAllBalancesZero', () => {
		let tokens: Token[];

		beforeEach(() => {
			vi.clearAllMocks();

			setupUserNetworksStore('allEnabled');

			tokens = get(enabledFungibleNetworkTokens);

			balancesStore.reinitialize();

			splDefaultTokensStore.reset();
			splCustomTokensStore.resetAll();
		});

		it('should return true if balances data are nullish', () => {
			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeTruthy();
		});

		it('should return true if balances data are empty', () => {
			balancesStore.reset(tokens[0].id);

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeTruthy();
		});

		it('should return true if all balances are nullish except for one that is not loaded', () => {
			tokens.slice(1).forEach(({ id }) => {
				balancesStore.reset(id);
			});

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeTruthy();
		});

		it('should return true if all balances are zero except for one that is not loaded', () => {
			tokens.slice(1).forEach(({ id }) => {
				balancesStore.set({
					id,
					data: { data: ZERO, certified: false }
				});
			});

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeTruthy();
		});

		it('should return false if all balances are positive except for one that is not loaded', () => {
			tokens.slice(1).forEach(({ id }) => {
				balancesStore.set({
					id,
					data: { data: bn1Bi, certified: false }
				});
			});

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeFalsy();
		});

		it('should return false if all balances are nullish but loaded', () => {
			tokens.forEach(({ id }) => {
				balancesStore.reset(id);
			});

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeFalsy();
		});

		it('should return false if all balances are zero', () => {
			tokens.forEach(({ id }) => {
				balancesStore.set({
					id,
					data: { data: ZERO, certified: false }
				});
			});

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeFalsy();
		});

		it('should return false if all balances are positive', () => {
			tokens.forEach(({ id }) => {
				balancesStore.set({
					id,
					data: { data: bn1Bi, certified: false }
				});
			});

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeFalsy();
		});

		it('should return false if all balances are either zero or positive', () => {
			tokens.forEach(({ id }, index) => {
				balancesStore.set({
					id,
					data: { data: index % 2 === 0 ? ZERO : bn1Bi, certified: false }
				});
			});

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeFalsy();
		});

		it('should return false if there is at least one positive balance', () => {
			balancesStore.set({
				id: tokens[0].id,
				data: { data: bn1Bi, certified: false }
			});

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeFalsy();

			balancesStore.reset(tokens[1].id);

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeFalsy();
		});

		it('should return true if there is at least one zero balance', () => {
			balancesStore.set({
				id: tokens[0].id,
				data: { data: ZERO, certified: false }
			});

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeTruthy();

			balancesStore.reset(tokens[1].id);

			expect(get(noPositiveBalanceAndNotAllBalancesZero)).toBeTruthy();
		});
	});
});
