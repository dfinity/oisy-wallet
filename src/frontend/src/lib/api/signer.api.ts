import type {
	BitcoinNetwork,
	EthSignTransactionRequest,
	SchnorrKeyId,
	SendBtcResponse
} from '$declarations/signer/signer.did';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { SIGNER_CANISTER_ID } from '$lib/constants/app.constants';
import type { BtcAddress, EthAddress } from '$lib/types/address';
import type { SendBtcParams } from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: SignerCanister | undefined = undefined;

export const getBtcAddress = async ({
	identity,
	network
}: CanisterApiFunctionParams<{
	network: BitcoinNetwork;
}>): Promise<BtcAddress> => {
	const { getBtcAddress } = await signerCanister({ identity });

	return getBtcAddress({ network });
};

export const getEthAddress = async ({
	identity
}: CanisterApiFunctionParams): Promise<EthAddress> => {
	const { getEthAddress } = await signerCanister({ identity });

	return getEthAddress();
};

export const getBtcBalance = async ({
	identity,
	network,
	canisterId,
	minConfirmations
}: CanisterApiFunctionParams<{
	network: BitcoinNetwork;
	minConfirmations?: number;
}>): Promise<bigint> => {
	const { getBtcBalance } = await signerCanister({ identity, canisterId });

	return getBtcBalance({ network, minConfirmations });
};

export const signTransaction = async ({
	transaction,
	identity
}: CanisterApiFunctionParams<{
	transaction: EthSignTransactionRequest;
}>): Promise<string> => {
	const { signTransaction } = await signerCanister({ identity });

	return signTransaction({ transaction });
};

export const signMessage = async ({
	message,
	identity
}: CanisterApiFunctionParams<{ message: string }>): Promise<string> => {
	const { personalSign } = await signerCanister({ identity });

	return personalSign({ message });
};

export const signPrehash = async ({
	hash,
	identity
}: CanisterApiFunctionParams<{
	hash: string;
}>): Promise<string> => {
	const { signPrehash } = await signerCanister({ identity });

	return signPrehash({ hash });
};

export const sendBtc = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SendBtcParams>): Promise<SendBtcResponse> => {
	const { sendBtc } = await signerCanister({ identity });

	return sendBtc(params);
};

export const getSchnorrPublicKey = async ({
	identity,
	...rest
}: CanisterApiFunctionParams<{ derivationPath: string[]; keyId: SchnorrKeyId }>): Promise<
	Uint8Array | number[]
> => {
	const { getSchnorrPublicKey } = await signerCanister({ identity });

	return await getSchnorrPublicKey(rest);
};

const signerCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = SIGNER_CANISTER_ID
}: CanisterApiFunctionParams): Promise<SignerCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await SignerCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
