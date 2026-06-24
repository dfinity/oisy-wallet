import { approve } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import { getTokenFee } from '$icp/utils/token.utils';
import { deposit as depositApi } from '$lib/api/oisy-trade.api';
import { NANO_SECONDS_IN_MINUTE, OISY_TRADE_CANISTER_ID } from '$lib/constants/app.constants';
import { ProgressStepsTradingDeposit } from '$lib/enums/progress-steps';
import { loadOisyTrade } from '$lib/services/oisy-trade.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { NullishIdentity } from '$lib/types/identity';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import { assertNonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

const APPROVE_EXPIRATION_MINUTES = 5n;

export interface DepositOisyTradeParams {
	identity: NullishIdentity;
	token: IcToken;
	// Amount to deposit, in the token's smallest units.
	amount: bigint;
	progress?: (step: ProgressStepsTradingDeposit) => void;
}

/**
 * Deposits a token to the OISY TRADE DEX using the ICRC-2 approve flow:
 * 1. `icrc2_approve` on the token ledger, authorizing the DEX for `amount + ledger_fee`
 *    (the `icrc2_transfer_from` fee is charged against the allowance on top of the amount).
 * 2. `deposit` on the DEX, which pulls the funds and credits the caller's free balance.
 *
 * Returns `true` on success, `false` when the flow failed (a toast was shown).
 */
export const depositOisyTrade = async ({
	identity,
	token,
	amount,
	progress
}: DepositOisyTradeParams): Promise<boolean> => {
	const { auth, trading } = get(i18n);

	try {
		assertNonNullish(identity, auth.error.no_internet_identity);
		assertNonNullish(OISY_TRADE_CANISTER_ID);

		const { ledgerCanisterId } = token;
		const fee = getTokenFee(token);

		assertNonNullish(fee, trading.deposit.error.unknown_fee);

		progress?.(ProgressStepsTradingDeposit.APPROVE);

		await approve({
			identity,
			ledgerCanisterId,
			amount: amount + fee,
			spender: { owner: Principal.fromText(OISY_TRADE_CANISTER_ID) },
			expiresAt: nowInBigIntNanoSeconds() + APPROVE_EXPIRATION_MINUTES * NANO_SECONDS_IN_MINUTE
		});

		progress?.(ProgressStepsTradingDeposit.DEPOSIT);

		await depositApi({
			identity,
			request: { token_id: { ledger_id: Principal.fromText(ledgerCanisterId) }, amount }
		});

		progress?.(ProgressStepsTradingDeposit.UPDATE_UI);

		await loadOisyTrade({ identity });
		await waitAndTriggerWallet();

		progress?.(ProgressStepsTradingDeposit.DONE);

		return true;
	} catch (err: unknown) {
		toastsError({ msg: { text: trading.deposit.error.deposit_failed }, err });

		return false;
	}
};
