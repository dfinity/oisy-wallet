import type { BitcoinNetwork, SignRequest } from '$declarations/signer/signer.did';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { SIGNER_CANISTER_ID } from '$lib/constants/app.constants';
import type { BtcAddress, EthAddress } from '$lib/types/address';
import type { CommonCanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: SignerCanister | undefined = undefined;

export const getBtcAddress = async ({
	identity,
	network
}: CommonCanisterApiFunctionParams<{
	network: BitcoinNetwork;
}>): Promise<BtcAddress> => {
	const { getBtcAddress } = await signerCanister({ identity });

	return getBtcAddress({ network });
};

export const getEthAddress = async ({
	identity
}: CommonCanisterApiFunctionParams): Promise<EthAddress> => {
	const { getEthAddress } = await signerCanister({ identity });

	return getEthAddress();
};

export const getBtcBalance = async ({
	identity,
	network,
	canisterId
}: CommonCanisterApiFunctionParams<{
	network: BitcoinNetwork;
}>): Promise<bigint> => {
	const { getBtcBalance } = await signerCanister({ identity, canisterId });

	return getBtcBalance({ network });
};

export const signTransaction = async ({
	transaction,
	identity
}: CommonCanisterApiFunctionParams<{
	transaction: SignRequest;
}>): Promise<string> => {
	const { signTransaction } = await signerCanister({ identity });

	return signTransaction({ transaction });
};

export const signMessage = async ({
	message,
	identity
}: CommonCanisterApiFunctionParams<{ message: string }>): Promise<string> => {
	const { personalSign } = await signerCanister({ identity });

	return personalSign({ message });
};

export const signPrehash = async ({
	hash,
	identity
}: CommonCanisterApiFunctionParams<{
	hash: string;
}>): Promise<string> => {
	const { signPrehash } = await signerCanister({ identity });

	return signPrehash({ hash });
};

const signerCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = SIGNER_CANISTER_ID
}: CommonCanisterApiFunctionParams): Promise<SignerCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await SignerCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
