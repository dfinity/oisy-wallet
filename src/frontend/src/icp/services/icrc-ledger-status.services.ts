import { getCanisterExistence } from '$icp/api/canister-state.api';
import { metadata } from '$icp/api/icrc-ledger.api';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcrcLedgerStatus } from '$icp/types/icrc-custom-token';
import { nonNullish } from '@dfinity/utils';
import {
	CertifiedRejectErrorCode,
	RejectError,
	ReplicaRejectCode,
	UncertifiedRejectErrorCode,
	UncertifiedRejectUpdateErrorCode,
	type Identity
} from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

// IC error codes of a rejected call, as numbered in the `ErrorCode` enum of the IC (`ic-error-types`).
// No ledger runs there: the canister does not exist (IC0301), or it has no code installed (IC0537).
const NO_LEDGER_ERROR_CODES = ['IC0301', 'IC0537'];
// The canister cannot answer for now: it is out of cycles (IC0207), or stopped (IC0508) or stopping (IC0509).
const NOT_RESPONDING_ERROR_CODES = ['IC0207', 'IC0508', 'IC0509'];

const toRejectStatus = ({
	rejectCode,
	rejectErrorCode
}: {
	rejectCode: ReplicaRejectCode;
	rejectErrorCode: string | undefined;
}): IcrcLedgerStatus => {
	if (nonNullish(rejectErrorCode) && NO_LEDGER_ERROR_CODES.includes(rejectErrorCode)) {
		return { status: 'no_ledger' };
	}

	if (
		rejectCode === ReplicaRejectCode.SysTransient ||
		(nonNullish(rejectErrorCode) && NOT_RESPONDING_ERROR_CODES.includes(rejectErrorCode))
	) {
		return { status: 'not_responding' };
	}

	return { status: 'error', ...(nonNullish(rejectErrorCode) && { errorCode: rejectErrorCode }) };
};

/**
 * Asks the ledger canister of a token OISY could not load for its metadata, as loading the token does,
 * and tells from the outcome whether a ledger runs there and whether it answers.
 */
export const checkIcrcLedgerStatus = async ({
	identity,
	ledgerCanisterId
}: {
	identity: Identity;
	ledgerCanisterId: LedgerCanisterIdText;
}): Promise<IcrcLedgerStatus> => {
	try {
		await metadata({ identity, ledgerCanisterId, certified: false });

		return { status: 'responding' };
	} catch (err: unknown) {
		if (err instanceof RejectError) {
			const { code } = err;

			if (
				code instanceof CertifiedRejectErrorCode ||
				code instanceof UncertifiedRejectErrorCode ||
				code instanceof UncertifiedRejectUpdateErrorCode
			) {
				return toRejectStatus(code);
			}
		}

		// No replica answered. A canister that no subnet hosts ends up here too, because the
		// agent cannot verify the signature of a query to it, so its existence tells the two apart.
		const existence = await getCanisterExistence({
			identity,
			canisterId: Principal.fromText(ledgerCanisterId)
		});

		return { status: existence === 'not_found' ? 'no_ledger' : 'not_responding' };
	}
};
