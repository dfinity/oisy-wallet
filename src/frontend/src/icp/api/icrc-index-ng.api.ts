import { WALLET_PAGINATION } from '$icp/constants/ic.constants';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { getAgent } from '$lib/actors/agents.ic';
import { i18n } from '$lib/stores/i18n.store';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { type Identity } from '@dfinity/agent';
import { IcrcIndexNgCanister, type IcrcIndexNgGetTransactions } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { get } from 'svelte/store';

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
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { getTransactions } = await indexNgCanister({ identity, indexCanisterId });

	return getTransactions({
		certified,
		start,
		max_results: maxResults,
		account: getIcrcAccount(owner)
	});
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
