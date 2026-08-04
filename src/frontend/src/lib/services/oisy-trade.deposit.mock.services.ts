import { deposit as depositApi } from '$lib/api/oisy-trade.api';
import { ProgressStepsTradingDeposit } from '$lib/enums/progress-steps';
// Resolves to the real module, not back to this one: the dev-only resolver in
// `vite.config.ts` skips the redirect when the importer is the mock itself.
import type { DepositOisyTradeParams } from '$lib/services/oisy-trade.deposit.services';
import { loadOisyTrade } from '$lib/services/oisy-trade.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { assertNonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

// Dev-only stand-in for the deposit flow, activated by `VITE_TRADE_MOCK=true`
// (see the resolver in `vite.config.ts`). The real service opens with an
// `icrc2_approve` against the token ledger, which needs funds the mocked wallet
// balance doesn't actually have — so the whole wizard would fail at the first
// step. This walks the same progress steps and credits the in-memory DEX
// balance instead, leaving nothing on-chain.
//
// Analytics are deliberately dropped: a mocked deposit is not a deposit, and
// shouldn't show up in Plausible.
const MOCK_STEP_DELAY_MS = 600;

const pause = (): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, MOCK_STEP_DELAY_MS));

export const depositOisyTrade = async ({
	identity,
	token,
	amount,
	progress
}: DepositOisyTradeParams): Promise<boolean> => {
	const { auth, trading } = get(i18n);

	try {
		assertNonNullish(identity, auth.error.no_internet_identity);

		progress?.(ProgressStepsTradingDeposit.APPROVE);

		await pause();

		progress?.(ProgressStepsTradingDeposit.DEPOSIT);

		await depositApi({
			identity,
			request: {
				token_id: { ledger_id: Principal.fromText(token.ledgerCanisterId) },
				amount
			}
		});

		await pause();

		progress?.(ProgressStepsTradingDeposit.UPDATE_UI);

		await loadOisyTrade({ identity });

		progress?.(ProgressStepsTradingDeposit.DONE);

		return true;
	} catch (err: unknown) {
		toastsError({ msg: { text: trading.deposit.error.deposit_failed }, err });

		return false;
	}
};
