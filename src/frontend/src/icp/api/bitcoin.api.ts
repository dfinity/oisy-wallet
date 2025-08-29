import { getAgent } from '$lib/actors/agents.ic';
import { BitcoinDirectCanister } from '$lib/canisters/bitcoin.canister';
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
	minConfirmations?: number;
}

let directCanister: BitcoinDirectCanister | undefined = undefined;

export const getUtxosQuery = async ({
	identity,
	bitcoinCanisterId,
	address,
	network,
	minConfirmations
}: BitcoinCanisterParams): Promise<get_utxos_response> => {
	assertNonNullish(identity);

	const { getUtxosQuery } =
		network === 'regtest'
			? await bitcoinDirectCanister({ identity, bitcoinCanisterId })
			: await bitcoinCanister({ identity, bitcoinCanisterId });

	return getUtxosQuery({
		address,
		network,
		...(!isNullish(minConfirmations) && { filter: { minConfirmations } })
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

const bitcoinDirectCanister = async ({
	identity,
	bitcoinCanisterId
}: {
	identity: Identity;
	bitcoinCanisterId: CanisterIdText;
}): Promise<BitcoinDirectCanister> => {
	assertNonNullish(identity);

	if (isNullish(directCanister)) {
		directCanister = await BitcoinDirectCanister.create({
			identity,
			canisterId: Principal.fromText(bitcoinCanisterId)
		});
	}

	return directCanister;
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
