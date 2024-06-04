import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { BitcoinCanister, type BitcoinNetwork, type get_utxos_response } from '@dfinity/ckbtc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

export const getUtxos = async ({
	identity,
	address,
	network,
	certified,
	bitcoinCanisterId
}: {
	identity: OptionIdentity;
	address: string;
	certified: boolean;
	network: BitcoinNetwork;
	bitcoinCanisterId: CanisterIdText;
}): Promise<get_utxos_response> => {
	assertNonNullish(identity);

	const { getUtxos } = await bitcoinCanister({ identity, bitcoinCanisterId });

	return getUtxos({
		address,
		network,
		certified
	});
};

const bitcoinCanister = async ({
	identity,
	bitcoinCanisterId
}: {
	identity: Identity;
	bitcoinCanisterId: CanisterIdText;
}): Promise<BitcoinCanister> => {
	const agent = await getAgent({ identity });

	return BitcoinCanister.create({
		agent,
		canisterId: Principal.fromText(bitcoinCanisterId)
	});
};
