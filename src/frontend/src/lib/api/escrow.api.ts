import type { Account, ClaimableDealView, DealView } from '$declarations/escrow/escrow.did';
import { EscrowCanister } from '$lib/canisters/escrow.canister';
import { ESCROW_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

let canister: EscrowCanister | undefined = undefined;

export const createDeal = async ({
	identity,
	amount,
	tokenLedger,
	expiresAtNs,
	title,
	note
}: CanisterApiFunctionParams<{
	amount: bigint;
	tokenLedger: Principal;
	expiresAtNs: bigint;
	title?: string;
	note?: string;
}>): Promise<DealView> => {
	const { createDeal } = await getEscrowCanister({ identity });

	return createDeal({ amount, tokenLedger, expiresAtNs, title, note });
};

export const fundDeal = async ({
	identity,
	dealId
}: CanisterApiFunctionParams<{ dealId: bigint }>): Promise<DealView> => {
	const { fundDeal } = await getEscrowCanister({ identity });

	return fundDeal({ dealId });
};

export const acceptDeal = async ({
	identity,
	dealId,
	claimCode
}: CanisterApiFunctionParams<{
	dealId: bigint;
	claimCode?: string;
}>): Promise<DealView> => {
	const { acceptDeal } = await getEscrowCanister({ identity });

	return acceptDeal({ dealId, claimCode });
};

export const getClaimableDeal = async ({
	identity,
	dealId
}: CanisterApiFunctionParams<{ dealId: bigint }>): Promise<ClaimableDealView> => {
	const { getClaimableDeal } = await getEscrowCanister({ identity });

	return getClaimableDeal({ dealId });
};

export const getDeal = async ({
	identity,
	dealId
}: CanisterApiFunctionParams<{ dealId: bigint }>): Promise<DealView> => {
	const { getDeal } = await getEscrowCanister({ identity });

	return getDeal({ dealId });
};

export const getEscrowAccount = async ({
	identity,
	dealId
}: CanisterApiFunctionParams<{ dealId: bigint }>): Promise<Account> => {
	const { getEscrowAccount } = await getEscrowCanister({ identity });

	return getEscrowAccount({ dealId });
};

export const cancelDeal = async ({
	identity,
	dealId
}: CanisterApiFunctionParams<{ dealId: bigint }>): Promise<DealView> => {
	const { cancelDeal } = await getEscrowCanister({ identity });

	return cancelDeal({ dealId });
};

const getEscrowCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = ESCROW_CANISTER_ID
}: CanisterApiFunctionParams): Promise<EscrowCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await EscrowCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
