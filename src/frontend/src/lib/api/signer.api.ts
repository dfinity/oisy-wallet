import type { BitcoinNetwork, SignRequest } from '$declarations/signer/signer.did';
import { getSignerActor } from '$lib/actors/actors.ic';
import type { EthAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';

export const getBtcAddress = async ({
	identity,
	network
}: {
	identity: OptionIdentity;
	network: BitcoinNetwork;
}): Promise<EthAddress> => {
	const { caller_btc_address } = await getSignerActor({ identity });
	return caller_btc_address(network);
};

export const getEthAddress = async (identity: OptionIdentity): Promise<EthAddress> => {
	const { caller_eth_address } = await getSignerActor({ identity });
	return caller_eth_address();
};

export const signTransaction = async ({
	transaction,
	identity
}: {
	transaction: SignRequest;
	identity: OptionIdentity;
}): Promise<string> => {
	const { sign_transaction } = await getSignerActor({ identity });
	return sign_transaction(transaction);
};

export const signMessage = async ({
	message,
	identity
}: {
	message: string;
	identity: OptionIdentity;
}): Promise<string> => {
	const { personal_sign } = await getSignerActor({ identity });
	return personal_sign(message);
};

export const signPrehash = async ({
	hash,
	identity
}: {
	hash: string;
	identity: OptionIdentity;
}): Promise<string> => {
	const { sign_prehash } = await getSignerActor({ identity });
	return sign_prehash(hash);
};
