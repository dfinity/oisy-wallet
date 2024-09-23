import type { BitcoinNetwork, SignRequest } from '$declarations/signer/signer.did';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { SIGNER_CANISTER_ID } from '$lib/constants/app.constants';
import type { BtcAddress, EthAddress } from '$lib/types/address';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: SignerCanister | undefined = undefined;

type CommonParams<T = unknown> = T & {
	identity: OptionIdentity;
	nullishIdentityErrorMessage?: string;
	signerCanisterId?: CanisterIdText;
};

export const getBtcAddress = async ({
	identity,
	network
}: CommonParams<{
	network: BitcoinNetwork;
}>): Promise<BtcAddress> => {
	const { getBtcAddress } = await signerCanister({ identity });

	return getBtcAddress({ network });
};

export const getEthAddress = async ({ identity }: CommonParams): Promise<EthAddress> => {
	const { getEthAddress } = await signerCanister({ identity });

	return getEthAddress();
};

export const getBtcBalance = async ({
	identity,
	network,
	signerCanisterId
}: CommonParams<{
	network: BitcoinNetwork;
}>): Promise<bigint> => {
	const { getBtcBalance } = await signerCanister({ identity, signerCanisterId });

	return getBtcBalance({ network });
};

export const signTransaction = async ({
	transaction,
	identity
}: CommonParams<{
	transaction: SignRequest;
}>): Promise<string> => {
	const { signTransaction } = await signerCanister({ identity });

	return signTransaction({ transaction });
};

export const signMessage = async ({
	message,
	identity
}: CommonParams<{ message: string }>): Promise<string> => {
	const { personalSign } = await signerCanister({ identity });

	return personalSign({ message });
};

export const signPrehash = async ({
	hash,
	identity
}: CommonParams<{
	hash: string;
}>): Promise<string> => {
	const { signPrehash } = await signerCanister({ identity });

	return signPrehash({ hash });
};

const signerCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	signerCanisterId = SIGNER_CANISTER_ID
}: CommonParams): Promise<SignerCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await SignerCanister.create({
			identity,
			canisterId: Principal.fromText(signerCanisterId)
		});
	}

	return canister;
};
