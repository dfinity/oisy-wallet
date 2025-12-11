import type { IndexCanisterIdText } from '$icp/types/canister';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { IcpIndexCanister, type IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';

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
} & QueryParams): Promise<IcpIndexDid.GetAccountIdentifierTransactionsResponse> => {
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
		accountIdentifier: getAccountIdentifier(owner).toHex()
	});
};
