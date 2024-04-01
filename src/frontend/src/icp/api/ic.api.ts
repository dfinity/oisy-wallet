import { createAgent } from '$lib/actors/agents.ic';
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
	assertNonNullish(identity);

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
	// We are intentionally creating a new agent because the agent-js library's current implementation is incompatible with querying bitcoin_get_utxos_query when verifyQuerySignatures is set to true.
	// This is why we must explicitly disable the verification of the queries' signatures.
	// TODO: The issue with agent-js was communicated to the SDK team on March 19, 2024.
	const agent = await createAgent({ identity, verifyQuerySignatures: false });

	return ICManagementCanister.create({
		agent
	});
};
