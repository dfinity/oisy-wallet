import type { IndexCanisterIdText } from '$icp/types/canister';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { NullishIdentity } from '$lib/types/identity';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { IcpIndexCanister, type IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';

interface GetTransactionsParams extends QueryParams {
	identity: NullishIdentity;
	start?: bigint;
	maxResults?: bigint;
	indexCanisterId: IndexCanisterIdText;
}

export const getTransactions = async ({
	owner,
	...rest
}: GetTransactionsParams & {
	owner: Principal;
}): Promise<IcpIndexDid.GetAccountIdentifierTransactionsResponse> =>
	await getAccountIdentifierTransactions({
		...rest,
		accountIdentifier: getAccountIdentifier(owner).toHex()
	});

// The history of any account identifier, including accounts the caller does not own, such
// as the CMC's deposit account for the caller.
export const getAccountIdentifierTransactions = async ({
	accountIdentifier,
	identity,
	start,
	maxResults = WALLET_PAGINATION,
	indexCanisterId,
	certified = true
}: GetTransactionsParams & {
	accountIdentifier: string;
}): Promise<IcpIndexDid.GetAccountIdentifierTransactionsResponse> => {
	assertNonNullish(identity);

	const agent = await getAgent({ identity });

	const { getTransactions } = IcpIndexCanister.create({
		agent,
		canisterId: Principal.fromText(indexCanisterId)
	});

	return getTransactions({
		certified,
		start,
		maxResults,
		accountIdentifier
	});
};
