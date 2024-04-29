import { WALLET_PAGINATION } from '$icp/constants/ic.constants';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { type Identity } from '@dfinity/agent';
import { IcrcIndexNgCanister, type IcrcIndexNgGetTransactions } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';

export const getTransactions = async ({
	owner,
	identity,
	start,
	maxResults = WALLET_PAGINATION,
	indexCanisterId,
	certified = true
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
	indexCanisterId: CanisterIdText;
} & QueryParams): Promise<IcrcIndexNgGetTransactions> => {
	assertNonNullish(identity);

	const { getTransactions } = await indexNgCanister({ identity, indexCanisterId });

	return getTransactions({
		certified,
		start,
		max_results: maxResults,
		account: getIcrcAccount(owner)
	});
};

export const getLedgerId = async ({
	identity,
	indexCanisterId,
	certified = true
}: {
	identity: OptionIdentity;
	indexCanisterId: CanisterIdText;
} & QueryParams): Promise<Principal> => {
	assertNonNullish(identity);

	const { ledgerId } = await indexNgCanister({ identity, indexCanisterId });

	return ledgerId({ certified });
};

const indexNgCanister = async ({
	identity,
	indexCanisterId
}: {
	identity: Identity;
	indexCanisterId: CanisterIdText;
}): Promise<IcrcIndexNgCanister> => {
	const agent = await getAgent({ identity });

	return IcrcIndexNgCanister.create({
		agent,
		canisterId: Principal.fromText(indexCanisterId)
	});
};
