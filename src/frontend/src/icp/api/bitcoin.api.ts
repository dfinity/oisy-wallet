import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { BitcoinCanister, type BitcoinNetwork, type get_utxos_response } from '@dfinity/ckbtc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

interface BitcoinCanisterParams {
	identity: OptionIdentity;
	address: string;
	network: BitcoinNetwork;
	bitcoinCanisterId: CanisterIdText;
}

export const getUtxosQuery = async ({
	identity,
	address,
	network,
	bitcoinCanisterId
}: BitcoinCanisterParams): Promise<get_utxos_response> => {
	assertNonNullish(identity);

	const { getUtxosQuery } = await bitcoinCanister({ identity });

	return getUtxosQuery({
		address,
		network
	});
};

export const getBalanceQuery = async ({
	identity,
	address,
	network,
	bitcoinCanisterId,
	minConfirmations
}: BitcoinCanisterParams & {
	minConfirmations?: number;
}): Promise<bigint> => {
	assertNonNullish(identity);

	const { getBalanceQuery } = await bitcoinCanister({ identity, bitcoinCanisterId });
	// TODO: Directly call the endpoint on the bitcoin canister or update the ic-cdk library since calling it through the
	//  management interface is deprecated). See https://internetcomputer.org/docs/references/ic-interface-spec#ic-bitcoin_get_balance
	return getBalanceQuery({
		address,
		network,
		minConfirmations
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
