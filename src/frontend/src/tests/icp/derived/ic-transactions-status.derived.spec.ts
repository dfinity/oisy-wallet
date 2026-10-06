import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import {
	tokensWithRecoveredIndexCanister,
	tokensWithUnavailableIndexCanister
} from '$icp/derived/ic-transactions-status.derived';
import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD } from '$lib/constants/app.constants';
import type { TokenId } from '$lib/types/token';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('ic-transactions-status.derived', () => {
	describe('tokensWithUnavailableIndexCanister', () => {
		const enabledToken: IcrcCustomToken = {
			...mockValidIcToken,
			symbol: 'UTC',
			indexCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai',
			version: 1n,
			enabled: true
		};

		const setUpToken = (): TokenId => {
			icrcCustomTokensStore.setAll([{ data: enabledToken, certified: true }]);

			const tokenId = get(icrcCustomTokensStore)?.at(0)?.data.id;
			assertNonNullish(tokenId);

			return tokenId;
		};

		const fail = ({ tokenId, times }: { tokenId: TokenId; times: number }) =>
			Array.from({ length: times }).forEach(() => icTransactionsStatusStore.fail(tokenId));

		beforeEach(() => {
			icrcCustomTokensStore.resetAll();
			icTransactionsStatusStore.reset();
		});

		it('should be empty when nothing failed', () => {
			setUpToken();

			expect(get(tokensWithUnavailableIndexCanister)).toStrictEqual([]);
		});

		it('should be empty below the threshold', () => {
			const tokenId = setUpToken();

			fail({ tokenId, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD - 1 });

			expect(get(tokensWithUnavailableIndexCanister)).toStrictEqual([]);
		});

		it('should contain the token at the threshold', () => {
			const tokenId = setUpToken();

			fail({ tokenId, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });

			expect(get(tokensWithUnavailableIndexCanister).map(({ id }) => id)).toStrictEqual([tokenId]);
		});

		it('should contain the token above the threshold', () => {
			const tokenId = setUpToken();

			fail({ tokenId, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD + 5 });

			expect(get(tokensWithUnavailableIndexCanister).map(({ id }) => id)).toStrictEqual([tokenId]);
		});

		it('should drop the token after a successful sync', () => {
			const tokenId = setUpToken();

			fail({ tokenId, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });
			icTransactionsStatusStore.succeed(tokenId);

			expect(get(tokensWithUnavailableIndexCanister)).toStrictEqual([]);
		});

		it('should ignore a token of another chain', () => {
			// Only IC tokens are identified by a Ledger canister ID, so a non-IC token must never reach
			// a consumer of this store — even if something did record a failure against it.
			setUpToken();

			fail({ tokenId: ETHEREUM_TOKEN_ID, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });

			expect(get(tokensWithUnavailableIndexCanister)).toStrictEqual([]);
		});

		it('should ignore a token that is not enabled', () => {
			const tokenId = setUpToken();

			fail({ tokenId, times: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD });

			icrcCustomTokensStore.setAll([
				{ data: { ...enabledToken, enabled: false, version: 2n }, certified: true }
			]);

			expect(get(tokensWithUnavailableIndexCanister)).toStrictEqual([]);
		});
	});

	describe('tokensWithRecoveredIndexCanister', () => {
		const recoveredToken: IcrcCustomToken = {
			...mockValidIcToken,
			symbol: 'RTC',
			indexCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai',
			version: 1n,
			enabled: true
		};

		const setUpToken = (): TokenId => {
			icrcCustomTokensStore.setAll([{ data: recoveredToken, certified: true }]);

			const tokenId = get(icrcCustomTokensStore)?.at(0)?.data.id;
			assertNonNullish(tokenId);

			return tokenId;
		};

		beforeEach(() => {
			icrcCustomTokensStore.resetAll();
			icTransactionsStatusStore.reset();
		});

		it('should be empty for a token that has never been checked', () => {
			setUpToken();

			expect(get(tokensWithRecoveredIndexCanister)).toStrictEqual([]);
		});

		it('should be empty for a token that is currently failing', () => {
			const tokenId = setUpToken();

			icTransactionsStatusStore.fail(tokenId);

			expect(get(tokensWithRecoveredIndexCanister)).toStrictEqual([]);
		});

		it('should contain a token that succeeded after failing', () => {
			const tokenId = setUpToken();

			icTransactionsStatusStore.fail(tokenId);
			icTransactionsStatusStore.succeed(tokenId);

			expect(get(tokensWithRecoveredIndexCanister).map(({ id }) => id)).toStrictEqual([tokenId]);
		});

		it('should contain a token that succeeded without ever failing', () => {
			const tokenId = setUpToken();

			icTransactionsStatusStore.succeed(tokenId);

			expect(get(tokensWithRecoveredIndexCanister).map(({ id }) => id)).toStrictEqual([tokenId]);
		});
	});
});
