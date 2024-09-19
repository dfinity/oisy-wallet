import type { BitcoinNetwork, SignRequest } from '$declarations/signer/signer.did';
import { getAgent } from '$lib/actors/agents.ic';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { SIGNER_CANISTER_ID } from '$lib/constants/app.constants';
import type { BtcAddress, EthAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: SignerCanister | undefined = undefined;

export const getBtcAddress = async ({
	identity,
	network
}: {
	identity: OptionIdentity;
	network: BitcoinNetwork;
}): Promise<BtcAddress> => {
	const { getBtcAddress } = await signerCanister({ identity });

	return getBtcAddress({ network });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const updateBtcBalance = async ({
	identity,
	network
}: {
	identity: OptionIdentity;
	network: BitcoinNetwork;
}): Promise<bigint> => {
	const { updateBtcBalance } = await signerCanister({ identity });

	return updateBtcBalance({ network });
};

export const getEthAddress = async (identity: OptionIdentity): Promise<EthAddress> => {
	const { getEthAddress } = await signerCanister({ identity });

	return getEthAddress({});
};

export const signTransaction = async ({
	transaction,
	identity
}: {
	transaction: SignRequest;
	identity: OptionIdentity;
}): Promise<string> => {
	const { signTransaction } = await signerCanister({ identity });

	return signTransaction({ transaction });
};

export const signMessage = async ({
	message,
	identity
}: {
	message: string;
	identity: OptionIdentity;
}): Promise<string> => {
	const { personalSign } = await signerCanister({ identity });

	return personalSign({ message });
};

export const signPrehash = async ({
	hash,
	identity
}: {
	hash: string;
	identity: OptionIdentity;
}): Promise<string> => {
	const { signPrehash } = await signerCanister({ identity });

	return signPrehash({ hash });
};

const signerCanister = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<SignerCanister> => {
	assertNonNullish(identity);

	if (isNullish(canister)) {
		const agent = await getAgent({ identity });

		canister = SignerCanister.create({
			agent,
			canisterId: Principal.fromText(SIGNER_CANISTER_ID)
		});
	}

	return canister;
};
