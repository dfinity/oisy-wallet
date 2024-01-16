import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { type Identity } from '@dfinity/agent';
import { IcrcIndexCanister, type IcrcGetTransactions } from '@dfinity/ledger-icrc';
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
} & QueryParams): Promise<IcrcGetTransactions> => {
	assertNonNullish(identity, 'No internet identity.');

	const { getTransactions } = await indexCanister({ identity, indexCanisterId });

	return getTransactions({
		certified,
		start,
		max_results: maxResults,
		account: getIcrcAccount(owner)
	});
};

const indexCanister = async ({
	identity,
	indexCanisterId
}: {
	identity: Identity;
	indexCanisterId: CanisterIdText;
}): Promise<IcrcIndexCanister> => {
	const agent = await getAgent({ identity });

	return IcrcIndexCanister.create({
		agent,
		canisterId: Principal.fromText(indexCanisterId)
	});
};
