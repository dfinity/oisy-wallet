import type {
	Address,
	DepositSolId,
	DepositSolStatus,
	Lamport,
	LedgerBurnIndex,
	MinterInfo,
	WithdrawSolOk,
	WithdrawSolStatus
} from '$declarations/cksol_minter/cksol_minter.did';
import { CkSolMinterCanister } from '$icp/canisters/cksol-minter.canister';
import type { MinterInfoParams } from '$icp/types/ck';
import type { CanisterIdText } from '$lib/types/canister';
import type { NullishIdentity } from '$lib/types/identity';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

export const minterInfo = async ({
	identity,
	minterCanisterId,
	certified
}: MinterInfoParams): Promise<MinterInfo> => {
	assertNonNullish(identity);

	const { getMinterInfo } = await minterCanister({ identity, minterCanisterId });

	return getMinterInfo({ certified });
};

export const getDepositAddress = async ({
	identity,
	minterCanisterId
}: {
	identity: NullishIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<Address> => {
	assertNonNullish(identity);

	const { getDepositAddress } = await minterCanister({ identity, minterCanisterId });

	return getDepositAddress({ owner: identity.getPrincipal() });
};

export const depositSolStatus = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: NullishIdentity;
	minterCanisterId: CanisterIdText;
	depositId: DepositSolId;
} & QueryParams): Promise<DepositSolStatus> => {
	assertNonNullish(identity);

	const { depositSolStatus } = await minterCanister({ identity, minterCanisterId });

	return depositSolStatus(params);
};

export const withdrawSol = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: NullishIdentity;
	minterCanisterId: CanisterIdText;
	address: Address;
	amount: Lamport;
}): Promise<WithdrawSolOk> => {
	assertNonNullish(identity);

	const { withdrawSol } = await minterCanister({ identity, minterCanisterId });

	return withdrawSol(params);
};

export const withdrawSolStatus = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: NullishIdentity;
	minterCanisterId: CanisterIdText;
	blockIndex: LedgerBurnIndex;
}): Promise<WithdrawSolStatus> => {
	assertNonNullish(identity);

	const { withdrawSolStatus } = await minterCanister({ identity, minterCanisterId });

	return withdrawSolStatus(params);
};

// Created per call rather than cached: the minter burns from the caller's own
// account, so a client kept across a sign-out would act as the previous identity.
const minterCanister = ({
	identity,
	minterCanisterId
}: {
	identity: Identity;
	minterCanisterId: CanisterIdText;
}): Promise<CkSolMinterCanister> =>
	CkSolMinterCanister.create({
		identity,
		canisterId: Principal.fromText(minterCanisterId)
	});
