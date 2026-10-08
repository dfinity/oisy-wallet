import { approve } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import { getTokenFee } from '$icp/utils/token.utils';
import { deposit as depositApi } from '$lib/api/oisy-trade.api';
import { NANO_SECONDS_IN_MINUTE, OISY_TRADE_CANISTER_ID } from '$lib/constants/app.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { ProgressStepsTradingDeposit } from '$lib/enums/progress-steps';
import { loadOisyTrade } from '$lib/services/oisy-trade.services';
import { trackDepositWithdraw } from '$lib/services/trading-analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { NullishIdentity } from '$lib/types/identity';
import { replaceIcErrorFields } from '$lib/utils/error.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import { assertNonNullish, nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { formatUnits } from 'ethers/utils';
import { get } from 'svelte/store';

const APPROVE_EXPIRATION_MINUTES = 5n;

/**
 * The two calls a deposit is made of, with none of the surrounding policy:
 * `icrc2_approve` on the token ledger for `amount + ledger_fee` (the
 * `icrc2_transfer_from` fee is charged against the allowance on top of the
 * amount), then `deposit` on the DEX, which pulls the funds and credits the
 * caller's free balance. Returns the ledger block index of the transfer.
 *
 * Extracted so the swap flow can run the same two calls under different
 * surroundings: it needs them to **throw** so the wizard's catch can present the
 * error, to drive `ProgressStepsSwap` rather than the Trading enum, and to skip
 * the Trading store reload. Bending `depositOisyTrade`'s contract to serve two
 * callers, or duplicating the calls, were the alternatives.
 */
export const approveAndDepositOisyTrade = async ({
	identity,
	token,
	amount,
	onApproved
}: {
	identity: NonNullable<NullishIdentity>;
	token: IcToken;
	// Amount to deposit, in the token's smallest units.
	amount: bigint;
	// Fired between the two calls, so each caller advances its own progress enum.
	onApproved?: () => void;
}): Promise<bigint> => {
	assertNonNullish(OISY_TRADE_CANISTER_ID);

	const { ledgerCanisterId } = token;
	const fee = getTokenFee(token);

	assertNonNullish(fee, get(i18n).trading.deposit.error.unknown_fee);

	await approve({
		identity,
		ledgerCanisterId,
		amount: amount + fee,
		spender: { owner: Principal.fromText(OISY_TRADE_CANISTER_ID) },
		expiresAt: nowInBigIntNanoSeconds() + APPROVE_EXPIRATION_MINUTES * NANO_SECONDS_IN_MINUTE
	});

	onApproved?.();

	const { block_index } = await depositApi({
		identity,
		request: { token_id: { ledger_id: Principal.fromText(ledgerCanisterId) }, amount }
	});

	return block_index;
};

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

	// Full-precision human amount (smallest units → token units) for volume analytics.
	const volume = formatUnits(amount, token.decimals);
	// USD reference price / value at deposit time, for analytics only (omitted when absent).
	const usdPrice = get(exchanges)?.[token.id]?.usd;
	const usdValue = nonNullish(usdPrice) ? usdPrice * Number(volume) : undefined;
	const analytics = { token: token.symbol, amount: volume, usdPrice, usdValue };

	try {
		assertNonNullish(identity, auth.error.no_internet_identity);
		// Pre-flight, kept here so an unknown fee still fails *before* the funnel
		// records an attempt. `approveAndDepositOisyTrade` asserts both again, since
		// it cannot assume a caller checked.
		assertNonNullish(OISY_TRADE_CANISTER_ID);
		assertNonNullish(getTokenFee(token), trading.deposit.error.unknown_fee);

		trackDepositWithdraw({
			direction: 'deposit',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
			...analytics
		});

		progress?.(ProgressStepsTradingDeposit.APPROVE);

		await approveAndDepositOisyTrade({
			identity,
			token,
			amount,
			onApproved: () => progress?.(ProgressStepsTradingDeposit.DEPOSIT)
		});

		progress?.(ProgressStepsTradingDeposit.UPDATE_UI);

		await loadOisyTrade({ identity });
		await waitAndTriggerWallet();

		progress?.(ProgressStepsTradingDeposit.DONE);

		trackDepositWithdraw({
			direction: 'deposit',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
			...analytics
		});

		return true;
	} catch (err: unknown) {
		trackDepositWithdraw({
			direction: 'deposit',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			...analytics,
			error: replaceIcErrorFields(err)
		});
		toastsError({ msg: { text: trading.deposit.error.deposit_failed }, err });

		return false;
	}
};
