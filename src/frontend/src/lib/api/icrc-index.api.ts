import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { getAgent } from '$lib/ic/agent.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { getIcrcAccount } from '$lib/utils/icrc-account.utils';
import { type Identity } from '@dfinity/agent';
import { IcrcIndexCanister, type IcrcGetTransactions } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

export const getTransactions = async ({
	owner,
	identity,
	start,
	maxResults = WALLET_PAGINATION,
	indexCanisterId
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
	indexCanisterId: CanisterIdText;
}): Promise<IcrcGetTransactions> => {
	assertNonNullish(identity, 'No internet identity.');

	const { getTransactions } = await indexCanister({ identity, indexCanisterId });

	return getTransactions({
		certified: false,
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
