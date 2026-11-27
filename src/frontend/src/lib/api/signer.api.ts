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
import { insufficientAllowanceOf } from '$lib/canisters/signer.errors';
import { SIGNER_CANISTER_ID } from '$lib/constants/app.constants';
import { trackChargedCallInsufficientAllowance } from '$lib/services/allowance-analytics.services';
import { requestAllowanceAfterInsufficientAllowance } from '$lib/services/allowance-request.services';
import { allowanceToastStore } from '$lib/stores/allowance-toast.store';
import type {
	GenericSignWithEcdsaParams,
	GetSchnorrPublicKeyParams,
	SendBtcParams,
	SignWithSchnorrParams
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';

const signerApi = new CanisterApi<SignerCanister>();

export const getBtcAddress = async ({
	identity,
	network
}: CanisterApiFunctionParams<{
	network: BitcoinNetwork;
}>): Promise<BtcAddress> =>
	await callSigner({
		identity,
		method: 'btc_caller_address',
		call: ({ getBtcAddress }) => getBtcAddress({ network })
	});

export const getEthAddress = async ({ identity }: CanisterApiFunctionParams): Promise<EthAddress> =>
	await callSigner({
		identity,
		method: 'eth_address',
		call: ({ getEthAddress }) => getEthAddress()
	});

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
		method: 'btc_caller_balance',
		call: ({ getBtcBalance }) => getBtcBalance({ network, minConfirmations })
	});

export const signTransaction = async ({
	transaction,
	identity
}: CanisterApiFunctionParams<{
	transaction: EthSignTransactionRequest;
}>): Promise<string> =>
	await callSigner({
		identity,
		method: 'eth_sign_transaction',
		call: ({ signTransaction }) => signTransaction({ transaction })
	});

export const signBtc = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SendBtcParams>): Promise<SignBtcResponse> =>
	await callSigner({ identity, method: 'btc_caller_sign', call: ({ signBtc }) => signBtc(params) });

export const signMessage = async ({
	message,
	identity
}: CanisterApiFunctionParams<{ message: string }>): Promise<string> =>
	await callSigner({
		identity,
		method: 'eth_personal_sign',
		call: ({ personalSign }) => personalSign({ message })
	});

export const signPrehash = async ({
	hash,
	identity
}: CanisterApiFunctionParams<{
	hash: string;
}>): Promise<string> =>
	await callSigner({
		identity,
		method: 'eth_sign_prehash',
		call: ({ signPrehash }) => signPrehash({ hash })
	});

export const signBtcPrehash = async ({
	hash,
	identity
}: CanisterApiFunctionParams<{ hash: Uint8Array }>): Promise<Uint8Array> =>
	await callSigner({
		identity,
		method: 'btc_sign_prehash',
		call: ({ signBtcPrehash }) => signBtcPrehash({ hash })
	});

export const sendBtc = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SendBtcParams>): Promise<SendBtcResponse> =>
	await callSigner({ identity, method: 'btc_caller_send', call: ({ sendBtc }) => sendBtc(params) });

export const getSchnorrPublicKey = async ({
	identity,
	...rest
}: CanisterApiFunctionParams<GetSchnorrPublicKeyParams>): Promise<Uint8Array> =>
	await callSigner({
		identity,
		method: 'schnorr_public_key',
		call: ({ getSchnorrPublicKey }) => getSchnorrPublicKey(rest)
	});

export const signWithSchnorr = async ({
	identity,
	...rest
}: CanisterApiFunctionParams<SignWithSchnorrParams>): Promise<Uint8Array> =>
	await callSigner({
		identity,
		method: 'schnorr_sign',
		call: ({ signWithSchnorr }) => signWithSchnorr(rest)
	});

export const genericSignWithEcdsa = async ({
	identity,
	...rest
}: CanisterApiFunctionParams<GenericSignWithEcdsaParams>): Promise<Uint8Array> =>
	await callSigner({
		identity,
		method: 'generic_sign_with_ecdsa',
		call: ({ genericSignWithEcdsa }) => genericSignWithEcdsa(rest)
	});

// Every signer call is a charged call (CC), so this is the one place that handles an insufficient
// allowance for all of them, and no flow needs to know about it: it sends the allowance request (AR)
// before the flow sees the error and, when a new allowance came through, repeats the CC once. A CC
// refused for its allowance ran nothing, so the repeat is like the first try. Any other answer, or a
// repeat that fails, reaches the flow as the error it would have seen anyway.
const callSigner = async <T>({
	identity,
	canisterId,
	method,
	call
}: CanisterApiFunctionParams<{
	// The canister method `call` calls, as analytics counts it when the CC runs out.
	method: string;
	call: (signer: SignerCanister) => Promise<T>;
}>): Promise<T> => {
	const signer = await signerCanister({ identity, canisterId });

	try {
		return await call(signer);
	} catch (err: unknown) {
		const allowance = insufficientAllowanceOf(err);

		if (isNullish(allowance)) {
			throw err;
		}

		trackChargedCallInsufficientAllowance({ method });

		const { repeat } = await requestAllowanceAfterInsufficientAllowance({ identity, allowance });

		if (!repeat) {
			throw err;
		}

		try {
			return await call(signer);
		} catch (repeatErr: unknown) {
			// Refused again with a new allowance: the CC costs more than the OISY allowance covers.
			if (nonNullish(insufficientAllowanceOf(repeatErr))) {
				trackChargedCallInsufficientAllowance({ method });

				allowanceToastStore.set({ toast: 'exceeded' });
			}

			throw repeatErr;
		}
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
