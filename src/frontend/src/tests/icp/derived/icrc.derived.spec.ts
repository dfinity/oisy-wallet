import { ICRC_CK_TOKENS_LEDGER_CANISTER_IDS } from '$env/networks/networks.icrc.env';
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

	describe('enabledIcrcTokens', () => {
		it('should return all enabled ICRC tokens', () => {
			const tokens = get(enabledIcrcTokens);

			expect(tokens).toStrictEqual([
				{ ...mockIcrcDefaultToken2, enabled: true, version: 3n },
				mockIcrcCustomToken1,
				mockIcrcCustomToken3
			]);
		});

		it('should duplicate enabled tokens', () => {
			icrcCustomTokensStore.resetAll();
			icrcCustomTokensStore.setAll([
				{
					data: { ...mockIcrcDefaultToken1, enabled: true, version: 1n },
					certified: false
				}
			]);

			const tokens = get(enabledIcrcTokens);

			expect(tokens).toStrictEqual([
				{ ...mockIcrcDefaultToken1, enabled: true, version: 1n },
				{ ...mockIcrcDefaultToken1, enabled: true, version: 1n }
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
			icrcCustomTokensStore.set({
				data: {
					...mockIcrcCustomToken3,
					enabled: true,
					ledgerCanisterId: ICRC_CK_TOKENS_LEDGER_CANISTER_IDS[0]
				},
				certified: false
			});

			const tokens = get(enabledIcrcLedgerCanisterIdsNoCk);

			expect(tokens).toStrictEqual([
				mockIcrcDefaultToken2.ledgerCanisterId,
				mockIcrcCustomToken1.ledgerCanisterId
			]);
		});
	});

	describe('allKnownIcrcTokensLedgerCanisterIds', () => {
		vi.spyOn(tokensIcEnv, 'IC_BUILTIN_TOKENS', 'get').mockImplementation(() => [
			mockValidIcrcToken,
			mockValidDip20Token
		]);
		icrcDefaultTokensStore.setAll([
			{ data: mockIcrcDefaultToken1, certified: false },
			{ data: mockIcrcDefaultToken2, certified: false }
		]);

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
