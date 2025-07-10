import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { BitcoinCanister, type BitcoinNetwork, type get_utxos_response } from '@dfinity/ckbtc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

interface BitcoinCanisterParams {
	identity: OptionIdentity;
	bitcoinCanisterId: CanisterIdText;
	network: BitcoinNetwork;
	address: string;
}

interface BtcMinConfirmedCanisterParams extends BitcoinCanisterParams {
	// If not specified, the Bitcoin canister uses its default value (typically 6 confirmations).
	minConfirmations?: number;
}

interface BtcPagedCanisterParams extends BitcoinCanisterParams {
	// Use an empty Uint8Array for the first page, then use the value from
	page: Uint8Array;
}

export const getUtxosQuery = async ({
	identity,
	bitcoinCanisterId,
	address,
	network,
	minConfirmations
}: BtcMinConfirmedCanisterParams): Promise<get_utxos_response> => {
	assertNonNullish(identity);

	const { getUtxosQuery } = await bitcoinCanister({ identity, bitcoinCanisterId });

	return getUtxosQuery({
		address,
		network,
		...(!isNullish(minConfirmations) && { filter: { minConfirmations } })
	});
};

export const getUtxosQueryPaged = async ({
	identity,
	bitcoinCanisterId,
	address,
	network,
	page
}: BtcPagedCanisterParams): Promise<get_utxos_response> => {
	assertNonNullish(identity);

	const { getUtxosQuery } = await bitcoinCanister({ identity, bitcoinCanisterId });
	// filtering by minConfirmations and by page cannot be combined!
	return getUtxosQuery({
		address,
		network,
		filter: {
			page
		}
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
