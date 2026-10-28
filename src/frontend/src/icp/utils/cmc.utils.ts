import { CMC_CANISTER_ID } from '$env/networks/networks.icp.env';
import { CmcNotifyError, CmcNotifyRefundedError } from '$icp/canisters/cmc.errors';
import type { CmcNotifyFailure } from '$icp/types/cmc';
import { fromNullable, nonNullish, principalToSubAccount } from '@dfinity/utils';
import { AccountIdentifier, SubAccount, type IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import type { IcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';

// The CMC looks for a deposit in its own account, under the subaccount derived from a
// principal: the caller's for a mint, the canister's for a top-up.
export const getCmcDepositAccount = (principal: Principal): IcrcAccount => ({
	owner: Principal.fromText(CMC_CANISTER_ID),
	subaccount: principalToSubAccount(principal)
});

// The same account as ICP history names it: the ICP index reports every
// transfer's destination as an account identifier.
export const getCmcDepositAccountIdentifier = (principal: Principal): string =>
	AccountIdentifier.fromPrincipal({
		principal: Principal.fromText(CMC_CANISTER_ID),
		subAccount: SubAccount.fromBytes(principalToSubAccount(principal))
	}).toHex();

const isMemo = ({ memo, expected }: { memo: Uint8Array | undefined; expected: Uint8Array }) =>
	nonNullish(memo) &&
	memo.length === expected.length &&
	memo.every((byte, index) => byte === expected[index]);

/**
 * Whether an ICP history entry is a given deposit to the CMC: a transfer of `amount` from
 * the caller's own account to the deposit account, with the deposit's `memo` and its own
 * `created_at_time`. Short of the fixed fee, these are the fields the ledger deduplicates a
 * transfer on. The timestamp is what makes it this deposit rather than another of the same
 * amount, and the sender what keeps a transfer someone else makes to that account from
 * passing for it.
 */
export const isCmcDeposit = ({
	transaction: { operation, icrc1_memo, created_at_time },
	depositAccountIdentifier,
	ownAccountIdentifier,
	memo,
	amount,
	transferCreatedAtNs
}: {
	transaction: IcpIndexDid.Transaction;
	depositAccountIdentifier: string;
	ownAccountIdentifier: string;
	memo: Uint8Array;
	// ICP e8s, without the ledger fee.
	amount: bigint;
	transferCreatedAtNs: bigint;
}): boolean => {
	if (!('Transfer' in operation)) {
		return false;
	}

	const { from, to, amount: transferred } = operation.Transfer;

	return (
		from.toLowerCase() === ownAccountIdentifier.toLowerCase() &&
		to.toLowerCase() === depositAccountIdentifier.toLowerCase() &&
		transferred.e8s === amount &&
		fromNullable(created_at_time)?.timestamp_nanos === transferCreatedAtNs &&
		isMemo({ memo: fromNullable(icrc1_memo), expected: memo })
	);
};

/**
 * What a notify that did not succeed means for its deposit. Only a refund and the CMC's
 * other final answers end it. `Processing`, a transient CMC error and a call that got no
 * answer all leave it `pending`: the ICP has left the wallet, so the deposit must not be
 * reported as failed while notifying again can still complete it.
 */
export const toCmcNotifyFailure = (err: unknown): CmcNotifyFailure => {
	if (err instanceof CmcNotifyRefundedError) {
		return {
			status: 'refunded',
			reason: err.message,
			...(nonNullish(err.refundBlockIndex) && { refundBlockIndex: err.refundBlockIndex })
		};
	}

	if (err instanceof CmcNotifyError && !err.retryable) {
		return { status: 'failed', reason: err.message };
	}

	return { status: 'pending' };
};
