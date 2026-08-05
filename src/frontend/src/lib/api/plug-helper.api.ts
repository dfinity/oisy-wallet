import type { BtcNetwork, Utxo } from '$declarations/plug_helper/plug_helper.did';
import { PlugHelperCanister } from '$lib/canisters/plug-helper.canister';
import { PLUG_HELPER_CANISTER_ID } from '$lib/constants/plug.constants';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

/**
 * Deliberately not routed through `CanisterApi`.
 *
 * That cache keeps one canister instance per principal in a module-level map that
 * is never evicted, which would pin the imported identity — and the key derived
 * from the seed phrase — for the lifetime of the page, outliving both the reset
 * button and the sweep itself. Sends are rare enough that building the actor per
 * call costs nothing worth keeping a secret around for.
 */
const plugHelperCanister = async (identity: Identity): Promise<PlugHelperCanister> =>
	await PlugHelperCanister.create({
		identity,
		canisterId: Principal.fromText(PLUG_HELPER_CANISTER_ID)
	});

export const signPlugEthTransaction = async ({
	identity,
	...rest
}: {
	identity: Identity;
	to: string;
	amount: bigint;
	gasLimit: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	nonce: bigint;
	chainId: bigint;
}): Promise<string> => {
	const { signEthTransaction } = await plugHelperCanister(identity);

	return await signEthTransaction(rest);
};

export const signPlugErc20Transaction = async ({
	identity,
	...rest
}: {
	identity: Identity;
	amount: bigint;
	gasLimit: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	nonce: bigint;
	chainId: bigint;
	contractAddress: string;
	to: string;
}): Promise<string> => {
	const { signErc20Transaction } = await plugHelperCanister(identity);

	return await signErc20Transaction(rest);
};

export const signPlugBtcTransaction = async ({
	identity,
	...rest
}: {
	identity: Identity;
	to: string;
	amount: bigint;
	fee: bigint;
	network: BtcNetwork;
	utxos: Utxo[];
}): Promise<string> => {
	const { signBtcTransaction } = await plugHelperCanister(identity);

	return await signBtcTransaction(rest);
};

export const signPlugSolMessage = async ({
	identity,
	message
}: {
	identity: Identity;
	message: Uint8Array;
}): Promise<Uint8Array> => {
	const { signSolMessage } = await plugHelperCanister(identity);

	return await signSolMessage(message);
};
