import type { BtcAddress } from '$btc/types/address';
import type {
	BitcoinNetwork,
	EthSignTransactionRequest,
	SendBtcResponse,
	SignBtcResponse
} from '$declarations/signer/signer.did';
import type { EthAddress } from '$eth/types/address';
import { CanisterApi } from '$lib/api/canister.api';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { SIGNER_CANISTER_ID } from '$lib/constants/app.constants';
import { PLAUSIBLE_EVENT_SUBCONTEXT_CFS } from '$lib/enums/plausible';
import { withCfsSignTracking } from '$lib/services/analytics.services';
import type {
	GenericSignWithEcdsaParams,
	GetSchnorrPublicKeyParams,
	SendBtcParams,
	SignWithSchnorrParams
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish } from '@dfinity/utils';

const signerApi = new CanisterApi<SignerCanister>();

export const getBtcAddress = ({
	identity,
	network
}: CanisterApiFunctionParams<{
	network: BitcoinNetwork;
}>): Promise<BtcAddress> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.BTC_CALLER_ADDRESS,
		fn: async () => {
			const { getBtcAddress } = await signerCanister({ identity });

			return getBtcAddress({ network });
		}
	});

export const getEthAddress = ({ identity }: CanisterApiFunctionParams): Promise<EthAddress> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.ETH_ADDRESS,
		fn: async () => {
			const { getEthAddress } = await signerCanister({ identity });

			return getEthAddress();
		}
	});

export const getBtcBalance = ({
	identity,
	network,
	canisterId,
	minConfirmations
}: CanisterApiFunctionParams<{
	network: BitcoinNetwork;
	minConfirmations?: number;
}>): Promise<bigint> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.BTC_CALLER_BALANCE,
		fn: async () => {
			const { getBtcBalance } = await signerCanister({ identity, canisterId });

			return getBtcBalance({ network, minConfirmations });
		}
	});

export const signTransaction = ({
	transaction,
	identity
}: CanisterApiFunctionParams<{
	transaction: EthSignTransactionRequest;
}>): Promise<string> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.ETH_SIGN_TRANSACTION,
		fn: async () => {
			const { signTransaction } = await signerCanister({ identity });

			return signTransaction({ transaction });
		}
	});

export const signBtc = ({
	identity,
	...params
}: CanisterApiFunctionParams<SendBtcParams>): Promise<SignBtcResponse> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.BTC_CALLER_SIGN,
		fn: async () => {
			const { signBtc } = await signerCanister({ identity });

			return signBtc(params);
		}
	});

export const signMessage = ({
	message,
	identity
}: CanisterApiFunctionParams<{ message: string }>): Promise<string> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.ETH_PERSONAL_SIGN,
		fn: async () => {
			const { personalSign } = await signerCanister({ identity });

			return personalSign({ message });
		}
	});

export const signPrehash = ({
	hash,
	identity
}: CanisterApiFunctionParams<{
	hash: string;
}>): Promise<string> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.ETH_SIGN_PREHASH,
		fn: async () => {
			const { signPrehash } = await signerCanister({ identity });

			return signPrehash({ hash });
		}
	});

export const sendBtc = ({
	identity,
	...params
}: CanisterApiFunctionParams<SendBtcParams>): Promise<SendBtcResponse> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.BTC_CALLER_SEND,
		fn: async () => {
			const { sendBtc } = await signerCanister({ identity });

			return sendBtc(params);
		}
	});

export const getSchnorrPublicKey = ({
	identity,
	...rest
}: CanisterApiFunctionParams<GetSchnorrPublicKeyParams>): Promise<Uint8Array> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.SCHNORR_PUBLIC_KEY,
		fn: async () => {
			const { getSchnorrPublicKey } = await signerCanister({ identity });

			return await getSchnorrPublicKey(rest);
		}
	});

export const signWithSchnorr = ({
	identity,
	...rest
}: CanisterApiFunctionParams<SignWithSchnorrParams>): Promise<Uint8Array> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.SCHNORR_SIGN,
		fn: async () => {
			const { signWithSchnorr } = await signerCanister({ identity });

			return await signWithSchnorr(rest);
		}
	});

export const genericSignWithEcdsa = ({
	identity,
	...rest
}: CanisterApiFunctionParams<GenericSignWithEcdsaParams>): Promise<Uint8Array> =>
	withCfsSignTracking({
		method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS.GENERIC_SIGN_WITH_ECDSA,
		fn: async () => {
			const { genericSignWithEcdsa } = await signerCanister({ identity });

			return await genericSignWithEcdsa(rest);
		}
	});

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
