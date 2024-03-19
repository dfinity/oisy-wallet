import { getAgent } from '$lib/actors/agents.ic';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork, bitcoin_get_utxos_query_result } from '@dfinity/ic-management';
import { ICManagementCanister } from '@dfinity/ic-management';
import { assertNonNullish } from '@dfinity/utils';

export const getUtxos = async ({
	identity,
	address,
	network
}: {
	identity: OptionIdentity;
	address: string;
	certified: false;
	network: BitcoinNetwork;
}): Promise<bitcoin_get_utxos_query_result> => {
	assertNonNullish(identity, 'No internet identity.');

	const { bitcoinGetUtxosQuery } = await mgmtCanister({ identity });

	return bitcoinGetUtxosQuery({
		address,
		network
	});
};

const mgmtCanister = async ({
	identity
}: {
	identity: Identity;
}): Promise<ICManagementCanister> => {
	const agent = await getAgent({ identity });

	return ICManagementCanister.create({
		agent
	});
};
