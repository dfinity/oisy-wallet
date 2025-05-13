import { XtcLedgerCanister } from '$icp/canisters/xtc-ledger.canister';
import type { Dip20TransactionWithId } from '$icp/types/api';
import type { XtcLedgerTransferParams } from '$icp/types/xtc-ledger';
import { XTC_LEDGER_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';

let canister: XtcLedgerCanister | undefined = undefined;

export const transfer = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage,
	...rest
}: CanisterApiFunctionParams<XtcLedgerTransferParams>): Promise<bigint> => {
	const { transfer } = await xtcLedgerCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return await transfer(rest);
};

export const balance = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage,
	owner
}: CanisterApiFunctionParams<{ owner: Principal }>): Promise<bigint> => {
	const { balance } = await xtcLedgerCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return await balance(owner);
};

// TODO: add query for transactions - for now we mock with empty transactions
export const transactions = async ({
	identity,
	certified,
	canisterId,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams<QueryParams>): Promise<{
	transactions: Dip20TransactionWithId[];
	oldest_tx_id: [] | [bigint];
}> => {
	const { transactions } = await xtcLedgerCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return await transactions({ certified });
};

const xtcLedgerCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = XTC_LEDGER_CANISTER_ID
}: CanisterApiFunctionParams): Promise<XtcLedgerCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await XtcLedgerCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
