import type { TokenId as OisyTradeTokenId } from '$declarations/oisy_trade/oisy_trade.did';
import {
	getBalances,
	getTradingPairs,
	listSupportedTokens,
	withdraw
} from '$lib/api/oisy-trade.api';
import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleError } from '$lib/utils/console.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

// Best-effort load of trading pairs, supported tokens and the caller's DEX
// balances into `oisyTradeStore`; errors are logged so a transient canister
// failure never breaks the Trading tab. Read-only.
export const loadOisyTrade = async ({ identity }: { identity: NullishIdentity }): Promise<void> => {
	if (isNullish(identity)) {
		oisyTradeStore.reset();
		return;
	}

	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	try {
		const [pairs, supportedTokens, balances] = await Promise.all([
			getTradingPairs({ identity, nullishIdentityErrorMessage }),
			listSupportedTokens({ identity, nullishIdentityErrorMessage }),
			getBalances({ identity, nullishIdentityErrorMessage })
		]);

		oisyTradeStore.set({ pairs, supportedTokens, balances });
	} catch (err: unknown) {
		consoleError(err);
	}
};

// Withdraws `amount` (the gross figure entered by the user) from the caller's
// free DEX balance back to their wallet. The ledger transfer fee is deducted by
// the canister, so the user receives `amount - ledger_fee`. On success the
// Trading-tab balances are reloaded so the new free balance is reflected.
export const withdrawFromOisyTrade = async ({
	identity,
	tokenId,
	amount,
	decimals,
	progress
}: {
	identity: NullishIdentity;
	tokenId: OisyTradeTokenId;
	amount: string;
	decimals: number;
	progress?: (step: ProgressStepsTradingWithdraw) => void;
}): Promise<void> => {
	progress?.(ProgressStepsTradingWithdraw.WITHDRAW);

	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	assertNonNullish(identity, nullishIdentityErrorMessage);

	await withdraw({
		identity,
		nullishIdentityErrorMessage,
		request: {
			token_id: tokenId,
			amount: parseToken({ value: amount, unitName: decimals })
		}
	});

	progress?.(ProgressStepsTradingWithdraw.UPDATE_UI);

	await loadOisyTrade({ identity });

	progress?.(ProgressStepsTradingWithdraw.DONE);
};
