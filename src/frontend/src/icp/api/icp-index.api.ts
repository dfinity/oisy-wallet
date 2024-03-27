import { ICP_INDEX_CANISTER_ID } from '$env/networks.icp.env';
import { WALLET_PAGINATION } from '$icp/constants/ic.constants';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import { IndexCanister, type GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { get } from 'svelte/store';

export const getTransactions = async ({
	owner,
	identity,
	start,
	maxResults = WALLET_PAGINATION,
	certified = true
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
} & QueryParams): Promise<GetAccountIdentifierTransactionsResponse> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const agent = await getAgent({ identity });

	const { getTransactions } = IndexCanister.create({
		agent,
		canisterId: Principal.fromText(ICP_INDEX_CANISTER_ID)
	});

	return getTransactions({
		certified,
		start,
		maxResults,
		accountIdentifier: getAccountIdentifier(owner).toHex()
	});
};
