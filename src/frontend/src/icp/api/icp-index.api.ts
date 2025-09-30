import type { IndexCanisterIdText } from '$icp/types/canister';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { OptionIdentity } from '$lib/types/identity';
import { IndexCanister, type GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
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
	indexCanisterId: IndexCanisterIdText;
} & QueryParams): Promise<GetAccountIdentifierTransactionsResponse> => {
	assertNonNullish(identity);

	const agent = await getAgent({ identity });

	const { getTransactions } = IndexCanister.create({
		agent,
		canisterId: Principal.fromText(indexCanisterId)
	});

	return getTransactions({
		certified,
		start,
		maxResults,
		accountIdentifier: getAccountIdentifier(owner).toHex()
	});
};
