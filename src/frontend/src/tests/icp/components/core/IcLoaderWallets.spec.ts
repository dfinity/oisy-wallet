import IcLoaderWallets from '$icp/components/core/IcLoaderWallets.svelte';
import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import { icTransactionsWarningStore } from '$icp/stores/ic-transactions-warning.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD } from '$lib/constants/app.constants';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// The forget-on-recovery rule lives here rather than in either page that raises the warning: a
// token can recover while neither is mounted.
describe('IcLoaderWallets', () => {
	const LEDGER_CANISTER_ID = 'mxzaz-hqaaa-aaaar-qaada-cai';

	const token: IcrcCustomToken = {
		...mockValidIcToken,
		id: parseTokenId('UTC'),
		symbol: 'UTC',
		ledgerCanisterId: LEDGER_CANISTER_ID,
		indexCanisterId: 'n5wcd-faaaa-aaaar-qaaea-cai',
		version: 1n,
		enabled: true
	};

	const setUpToken = (): TokenId => {
		icrcCustomTokensStore.setAll([{ data: token, certified: true }]);

		const tokenId = get(icrcCustomTokensStore)?.at(0)?.data.id;
		assertNonNullish(tokenId);

		return tokenId;
	};

	beforeEach(() => {
		icrcCustomTokensStore.resetAll();
		icTransactionsStatusStore.reset();
		icTransactionsWarningStore.reset();
	});

	it('should forget the dismissal of a token whose Index canister recovers', async () => {
		const tokenId = setUpToken();

		Array.from({ length: IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD }).forEach(() =>
			icTransactionsStatusStore.fail(tokenId)
		);
		icTransactionsWarningStore.dismiss([token]);

		const { unmount } = render(IcLoaderWallets);

		expect(get(icTransactionsWarningStore)).toStrictEqual([LEDGER_CANISTER_ID]);

		icTransactionsStatusStore.succeed(tokenId);

		await waitFor(() => expect(get(icTransactionsWarningStore)).toStrictEqual([]));

		unmount();
	});

	it('should keep the dismissal while nothing has been checked yet', async () => {
		setUpToken();

		icTransactionsWarningStore.dismiss([token]);

		// A reload restores the dismissal while the counters — in memory only — start empty. "Nothing
		// is failing" must not be read as "everything recovered".
		const { unmount } = render(IcLoaderWallets);

		await waitFor(() =>
			expect(get(icTransactionsWarningStore)).toStrictEqual([LEDGER_CANISTER_ID])
		);

		unmount();
	});
});
