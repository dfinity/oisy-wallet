import type { BtcAddress } from '$btc/types/address';
import type {
	Network as BitcoinNetwork,
	EthSignTransactionRequest,
	SendBtcResponse,
	SignBtcResponse
} from '$declarations/signer/signer.did';
import type { EthAddress } from '$eth/types/address';
import { CanisterApi } from '$lib/api/canister.api';
import { SignerCanister } from '$lib/canisters/signer.canister';
import {
	insufficientAllowanceOf,
	SignerCanisterInsufficientAllowanceError
} from '$lib/canisters/signer.errors';
import { SIGNER_CANISTER_ID } from '$lib/constants/app.constants';
import { requestAllowance } from '$lib/services/allowance-request.services';
import type {
	GenericSignWithEcdsaParams,
	GetSchnorrPublicKeyParams,
	SendBtcParams,
	SignWithSchnorrParams
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish, isNullish } from '@dfinity/utils';

const signerApi = new CanisterApi<SignerCanister>();

export const getBtcAddress = async ({
	identity,
	network
}: CanisterApiFunctionParams<{
	network: BitcoinNetwork;
}>): Promise<BtcAddress> =>
	await callSigner({ identity, call: ({ getBtcAddress }) => getBtcAddress({ network }) });

export const getEthAddress = async ({ identity }: CanisterApiFunctionParams): Promise<EthAddress> =>
	await callSigner({ identity, call: ({ getEthAddress }) => getEthAddress() });

export const getBtcBalance = async ({
	identity,
	network,
	canisterId,
	minConfirmations
}: CanisterApiFunctionParams<{
	network: BitcoinNetwork;
	minConfirmations?: number;
}>): Promise<bigint> =>
	await callSigner({
		identity,
		canisterId,
		call: ({ getBtcBalance }) => getBtcBalance({ network, minConfirmations })
	});

export const signTransaction = async ({
	transaction,
	identity
}: CanisterApiFunctionParams<{
	transaction: EthSignTransactionRequest;
}>): Promise<string> =>
	await callSigner({ identity, call: ({ signTransaction }) => signTransaction({ transaction }) });

export const signBtc = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SendBtcParams>): Promise<SignBtcResponse> =>
	await callSigner({ identity, call: ({ signBtc }) => signBtc(params) });

export const signMessage = async ({
	message,
	identity
}: CanisterApiFunctionParams<{ message: string }>): Promise<string> =>
	await callSigner({ identity, call: ({ personalSign }) => personalSign({ message }) });

export const signPrehash = async ({
	hash,
	identity
}: CanisterApiFunctionParams<{
	hash: string;
}>): Promise<string> =>
	await callSigner({ identity, call: ({ signPrehash }) => signPrehash({ hash }) });

export const signBtcPrehash = async ({
	hash,
	identity
}: CanisterApiFunctionParams<{ hash: Uint8Array }>): Promise<Uint8Array> =>
	await callSigner({ identity, call: ({ signBtcPrehash }) => signBtcPrehash({ hash }) });

export const sendBtc = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SendBtcParams>): Promise<SendBtcResponse> =>
	await callSigner({ identity, call: ({ sendBtc }) => sendBtc(params) });

export const getSchnorrPublicKey = async ({
	identity,
	...rest
}: CanisterApiFunctionParams<GetSchnorrPublicKeyParams>): Promise<Uint8Array> =>
	await callSigner({ identity, call: ({ getSchnorrPublicKey }) => getSchnorrPublicKey(rest) });

export const signWithSchnorr = async ({
	identity,
	...rest
}: CanisterApiFunctionParams<SignWithSchnorrParams>): Promise<Uint8Array> =>
	await callSigner({ identity, call: ({ signWithSchnorr }) => signWithSchnorr(rest) });

export const genericSignWithEcdsa = async ({
	identity,
	...rest
}: CanisterApiFunctionParams<GenericSignWithEcdsaParams>): Promise<Uint8Array> =>
	await callSigner({ identity, call: ({ genericSignWithEcdsa }) => genericSignWithEcdsa(rest) });

// Every signer call is a charged call (CC), so this is the one place that catches an insufficient
// allowance for all of them: it sends the allowance request (AR) before the flow sees the error,
// and the error it throws then carries the AR's answer.
const callSigner = async <T>({
	identity,
	canisterId,
	call
}: CanisterApiFunctionParams<{ call: (signer: SignerCanister) => Promise<T> }>): Promise<T> => {
	const signer = await signerCanister({ identity, canisterId });

	try {
		return await call(signer);
	} catch (err: unknown) {
		const insufficientAllowance = insufficientAllowanceOf(err);

		if (isNullish(insufficientAllowance)) {
			throw err;
		}

		const allowanceRequest = await requestAllowance(identity);

		throw new SignerCanisterInsufficientAllowanceError({
			...insufficientAllowance,
			allowanceRequest
		});
	}
};

const signerCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = SIGNER_CANISTER_ID
}: CanisterApiFunctionParams): Promise<SignerCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await signerApi.getCanister({
		identity,
		canisterId,
		create: SignerCanister.create
	});
};
