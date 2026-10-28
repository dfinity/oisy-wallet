import { CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { CyclesLedgerCanister } from '$icp/canisters/cycles-ledger.canister';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

export const withdrawCycles = async ({
	to,
	amount,
	createdAt,
	...rest
}: CanisterApiFunctionParams<{
	to: Principal;
	amount: bigint;
	createdAt: bigint;
}>): Promise<bigint> => {
	const { withdraw } = await cyclesLedgerCanister(rest);

	return await withdraw({ to, amount, createdAt });
};

// Created per call rather than cached: a withdrawal spends the caller's own balance, so a
// client kept across a sign-out would withdraw as the previous identity.
const cyclesLedgerCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = CYCLES_LEDGER_CANISTER_ID
}: CanisterApiFunctionParams): Promise<CyclesLedgerCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await CyclesLedgerCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};
