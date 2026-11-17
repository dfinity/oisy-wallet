import { ICRC_CK_TOKENS_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import * as tokensIcEnv from '$env/tokens/tokens.ic.env';
import {
	allKnownIcrcTokensLedgerCanisterIds,
	enabledIcrcLedgerCanisterIdsNoCk,
	enabledIcrcTokens
} from '$icp/derived/icrc.derived';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { allFungibleTokens, allIcrcTokens, allTokens } from '$lib/derived/all-tokens.derived';
import { allSwapUniverseTokens } from '$lib/derived/swap.derived';
import type { Token } from '$lib/types/token';
import {
	mockValidDip20Token,
	mockValidIcToken,
	mockValidIcrcToken
} from '$tests/mocks/ic-tokens.mock';
import { get } from 'svelte/store';

describe('icrc.derived', () => {
	const mockIcrcDefaultToken1: IcToken = {
		...mockValidIcToken,
		ledgerCanisterId: `${mockValidIcToken.ledgerCanisterId}-default-token-1`
	};

	const mockIcrcDefaultToken2: IcToken = {
		...mockValidIcToken,
		ledgerCanisterId: `${mockValidIcToken.ledgerCanisterId}-default-token-2`
	};

	const mockIcrcCustomToken1: IcrcCustomToken = {
		...mockValidIcToken,
		ledgerCanisterId: `${mockValidIcToken.ledgerCanisterId}-custom-token-1`,
		version: 1n,
		enabled: true
	};

	const mockIcrcCustomToken2: IcrcCustomToken = {
		...mockValidIcToken,
		ledgerCanisterId: `${mockValidIcToken.ledgerCanisterId}-custom-token-2`,
		version: 2n,
		enabled: false
	};

	const mockIcrcCustomToken3: IcrcCustomToken = {
		...mockIcrcDefaultToken2,
		version: 3n,
		enabled: true
	};

	beforeEach(() => {
		icrcDefaultTokensStore.resetAll();
		icrcCustomTokensStore.resetAll();

		icrcDefaultTokensStore.setAll([
			{ data: mockIcrcDefaultToken1, certified: false },
			{ data: mockIcrcDefaultToken2, certified: false }
		]);

		icrcCustomTokensStore.setAll([
			{ data: mockIcrcCustomToken1, certified: false },
			{ data: mockIcrcCustomToken2, certified: false },
			{ data: mockIcrcCustomToken3, certified: false }
		]);
	});

	it.each([
		{ name: 'allIcrcTokens', store: allIcrcTokens },
		{ name: 'allTokens', store: allTokens },
		{ name: 'allFungibleTokens', store: allFungibleTokens },
		{ name: 'allSwapUniverseTokens', store: allSwapUniverseTokens }
	])(
		'should propagate saved versions and loaded metadata through $name with stable IDs and order',
		({ store }) => {
			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();
			const builtin = mockIcrcDefaultToken1;
			const envTokens = vi
				.spyOn(tokensIcEnv, 'IC_BUILTIN_TOKENS', 'get')
				.mockReturnValue([builtin]);
			let latest: Token[] = [];
			const unsubscribe = store.subscribe((tokens) => {
				latest = tokens;
			});
			const ids = latest.map(({ id }) => id);

			try {
				expect(latest.find(({ id }) => id === builtin.id)).toMatchObject({ enabled: false });

				const saved = { ...builtin, enabled: false, version: 1n, name: 'Loaded metadata' };
				icrcCustomTokensStore.setAll([{ data: saved, certified: false }]);

				expect(latest.map(({ id }) => id)).toEqual(ids);
				expect(latest.find(({ id }) => id === builtin.id)).toMatchObject(saved);

				const updated = { ...saved, version: 2n, name: 'Updated metadata' };
				icrcCustomTokensStore.setAll([{ data: updated, certified: true }]);

				expect(latest.find(({ id }) => id === builtin.id)).toMatchObject(updated);

				icrcDefaultTokensStore.setAll([{ data: builtin, certified: false }]);
				const metadata = { ...builtin, name: 'Default metadata', fee: 123n };
				icrcDefaultTokensStore.setAll([{ data: metadata, certified: true }]);

				expect(latest.map(({ id }) => id)).toEqual(ids);
				expect(latest.find(({ id }) => id === builtin.id)).toMatchObject({
					...metadata,
					enabled: false,
					version: 2n
				});
			} finally {
				unsubscribe();
				envTokens.mockRestore();
			}
		}
	);

	describe('enabledIcrcTokens', () => {
		it('should return all enabled ICRC tokens', () => {
			const tokens = get(enabledIcrcTokens);

			expect(tokens).toStrictEqual([
				{
					...mockIcrcDefaultToken2,
					enabled: true,
					version: 3n,
					section: undefined,
					allowExternalContentSource: undefined,
					allowedExternalContentSourceUrls: undefined
				},
				mockIcrcCustomToken1,
				mockIcrcCustomToken3
			]);
		});

		it('should duplicate enabled tokens', () => {
			icrcCustomTokensStore.resetAll();
			icrcCustomTokensStore.setAll([
				{
					data: {
						...mockIcrcDefaultToken1,
						enabled: true,
						version: 1n,
						section: undefined,
						allowExternalContentSource: undefined,
						allowedExternalContentSourceUrls: undefined
					},
					certified: false
				}
			]);

			const tokens = get(enabledIcrcTokens);

			expect(tokens).toStrictEqual([
				{
					...mockIcrcDefaultToken1,
					enabled: true,
					version: 1n,
					section: undefined,
					allowExternalContentSource: undefined,
					allowedExternalContentSourceUrls: undefined
				},
				{
					...mockIcrcDefaultToken1,
					enabled: true,
					version: 1n,
					section: undefined,
					allowExternalContentSource: undefined,
					allowedExternalContentSourceUrls: undefined
				}
			]);
		});

		it('should handle empty token stores', () => {
			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();

			const tokens = get(enabledIcrcTokens);

			expect(tokens).toStrictEqual([]);
		});

		it('should handle no enabled tokens', () => {
			icrcCustomTokensStore.resetAll();
			icrcCustomTokensStore.setAll([
				{ data: { ...mockIcrcDefaultToken1, enabled: false }, certified: false }
			]);

			const tokens = get(enabledIcrcTokens);

			expect(tokens).toStrictEqual([]);
		});
	});

	describe('enabledIcrcLedgerCanisterIdsNoCk', () => {
		it('should return all enabled ICRC ledger canister IDs', () => {
			const tokens = get(enabledIcrcLedgerCanisterIdsNoCk);

			expect(tokens).toStrictEqual([
				mockIcrcDefaultToken2.ledgerCanisterId,
				mockIcrcCustomToken1.ledgerCanisterId
			]);
		});

		it('should not duplicate enabled ledger canister IDs', () => {
			icrcCustomTokensStore.resetAll();
			icrcCustomTokensStore.setAll([
				{
					data: { ...mockIcrcDefaultToken1, enabled: true, version: 1n },
					certified: false
				}
			]);

			const tokens = get(enabledIcrcLedgerCanisterIdsNoCk);

			expect(tokens).toStrictEqual([mockIcrcDefaultToken1.ledgerCanisterId]);
		});

		it('should handle empty token stores', () => {
			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();

			const tokens = get(enabledIcrcLedgerCanisterIdsNoCk);

			expect(tokens).toStrictEqual([]);
		});

		it('should handle no enabled token addresses', () => {
			icrcCustomTokensStore.resetAll();
			icrcCustomTokensStore.setAll([
				{ data: { ...mockIcrcDefaultToken1, enabled: false }, certified: false }
			]);

			const tokens = get(enabledIcrcLedgerCanisterIdsNoCk);

			expect(tokens).toStrictEqual([]);
		});

		it('should ignore CK tokens', () => {
			icrcCustomTokensStore.setAll([
				{
					data: {
						...mockIcrcCustomToken3,
						enabled: true,
						ledgerCanisterId: ICRC_CK_TOKENS_LEDGER_CANISTER_IDS[0]
					},
					certified: false
				}
			]);

			const tokens = get(enabledIcrcLedgerCanisterIdsNoCk);

			expect(tokens).toStrictEqual([
				mockIcrcDefaultToken2.ledgerCanisterId,
				mockIcrcCustomToken1.ledgerCanisterId
			]);
		});
	});

	describe('allKnownIcrcTokensLedgerCanisterIds', () => {
		beforeEach(() => {
			vi.spyOn(tokensIcEnv, 'IC_BUILTIN_TOKENS', 'get').mockImplementation(() => [
				mockValidIcrcToken,
				mockValidDip20Token
			]);
			icrcDefaultTokensStore.setAll([
				{ data: mockIcrcDefaultToken1, certified: false },
				{ data: mockIcrcDefaultToken2, certified: false }
			]);
		});

		it('should return correct array of ledger ids', () => {
			expect(get(allKnownIcrcTokensLedgerCanisterIds)).toEqual([
				mockIcrcDefaultToken1.ledgerCanisterId,
				mockIcrcDefaultToken2.ledgerCanisterId,
				mockValidIcrcToken.ledgerCanisterId,
				mockValidDip20Token.ledgerCanisterId
			]);
		});
	});
});
