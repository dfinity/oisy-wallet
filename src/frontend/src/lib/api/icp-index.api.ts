import { ICP_INDEX_CANISTER_ID } from '$lib/constants/app.constants';
import { ICP_WALLET_PAGINATION } from '$lib/constants/icp.constants';
import { getAgent } from '$lib/ic/agent.ic';
import type { Identity } from '@dfinity/agent';
import {
	AccountIdentifier,
	IndexCanister,
	type GetAccountIdentifierTransactionsResponse
} from '@dfinity/ledger-icp';
import { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';

export const getAccountIdentifier = (principal: Principal): AccountIdentifier =>
	AccountIdentifier.fromPrincipal({ principal, subAccount: undefined });

export const getTransactions = async ({
	owner,
	identity,
	start,
	maxResults = ICP_WALLET_PAGINATION
}: {
	owner: Principal;
	identity: Identity | undefined | null;
	start?: bigint;
	maxResults?: bigint;
}): Promise<GetAccountIdentifierTransactionsResponse> => {
	if (isNullish(identity)) {
		throw new Error('No internet identity.');
	}

	const agent = await getAgent({ identity });

	const { getTransactions } = IndexCanister.create({
		agent,
		canisterId: Principal.fromText(ICP_INDEX_CANISTER_ID)
	});

	return getTransactions({
		certified: false,
		start,
		maxResults,
		accountIdentifier: getAccountIdentifier(owner).toHex()
	});
};
