import type { BtcAddress } from '$btc/types/address';
import type {
	BitcoinNetwork,
	EthAddressRequest,
	EthPersonalSignRequest,
	EthSignPrehashRequest,
	EthSignTransactionRequest,
	GetBalanceRequest,
	SendBtcResponse,
	SignBtcResponse,
	_SERVICE as SignerService
} from '$declarations/signer/signer.did';
import { idlFactory as idlCertifiedFactorySigner } from '$declarations/signer/signer.factory.certified.did';
import { idlFactory as idlFactorySigner } from '$declarations/signer/signer.factory.did';
import type { EthAddress } from '$eth/types/address';
import { getAgent } from '$lib/actors/agents.ic';
import { P2WPKH, SIGNER_PAYMENT_TYPE } from '$lib/canisters/signer.constants';
import {
	mapSignerCanisterBtcError,
	mapSignerCanisterGetEthAddressError,
	mapSignerCanisterSendBtcError
} from '$lib/canisters/signer.errors';
import type {
	GenericEcdsaPublicKeyParams,
	GenericSignWithEcdsaParams,
	GetSchnorrPublicKeyParams,
	SendBtcParams,
	SignWithSchnorrParams
} from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mapDerivationPath } from '$lib/utils/signer.utils';
import { Canister, createServices, fromDefinedNullable, toNullable } from '@dfinity/utils';

export class SignerCanister extends Canister<SignerService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<SignerService>): Promise<SignerCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<SignerService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactorySigner,
			certifiedIdlFactory: idlCertifiedFactorySigner
		});

		return new SignerCanister(canisterId, service, certifiedService);
	}

	getBtcAddress = async ({ network }: { network: BitcoinNetwork }): Promise<BtcAddress> => {
		const { btc_caller_address } = this.caller({
			certified: true
		});

		const response = await btc_caller_address({ network, address_type: P2WPKH }, [
			SIGNER_PAYMENT_TYPE
		]);

		if ('Ok' in response) {
			const {
				Ok: { address }
			} = response;
			return address;
		}

		throw mapSignerCanisterBtcError(response.Err);
	};

	getBtcBalance = async ({
		network,
		minConfirmations
	}: {
		network: BitcoinNetwork;
		minConfirmations?: number;
	}): Promise<bigint> => {
		const { btc_caller_balance } = this.caller({
			certified: true
		});

		const request: GetBalanceRequest = {
			network,
			address_type: P2WPKH,
			min_confirmations: toNullable(minConfirmations)
		};
		const response = await btc_caller_balance(request, [SIGNER_PAYMENT_TYPE]);

		if ('Ok' in response) {
			const {
				Ok: { balance }
			} = response;
			return balance;
		}

		throw mapSignerCanisterBtcError(response.Err);
	};

	getEthAddress = async (): Promise<EthAddress> => {
		const { eth_address } = this.caller({
			certified: true
		});

		/* Note: `eth_address` gets the Ethereum address of a given principal, defaulting to the caller if not provided. */
		/*       In OISY, we derive the ETH address from the caller. Therefore, we are not providing a principal as an argument. */
		const request: EthAddressRequest = { principal: [] };
		const response = await eth_address(request, [SIGNER_PAYMENT_TYPE]);

		if ('Ok' in response) {
			const {
				Ok: { address }
			} = response;
			return address;
		}

		throw mapSignerCanisterGetEthAddressError(response.Err);
	};

	signTransaction = async ({
		transaction
	}: {
		transaction: EthSignTransactionRequest;
	}): Promise<string> => {
		const { eth_sign_transaction } = this.caller({
			certified: true
		});

		const response = await eth_sign_transaction(transaction, [SIGNER_PAYMENT_TYPE]);

		// If the response does not match the type signature, so has neither `Ok` nor `Err`,
		// will typescript have thrown an error before this point?  Ditto for the other APIs.
		// It seems safer to check for `Ok` in response, and always throw an error if it's not there.

		if ('Ok' in response) {
			const {
				Ok: { signature }
			} = response;
			return signature;
		}

		throw mapSignerCanisterGetEthAddressError(response.Err);
	};

	personalSign = async ({ message }: { message: string }): Promise<string> => {
		const { eth_personal_sign } = this.caller({
			certified: true
		});

		const request: EthPersonalSignRequest = { message };
		const response = await eth_personal_sign(request, [SIGNER_PAYMENT_TYPE]);

		if ('Ok' in response) {
			const {
				Ok: { signature }
			} = response;
			return signature;
		}

		throw mapSignerCanisterGetEthAddressError(response.Err);
	};

	signPrehash = async ({ hash }: { hash: string }): Promise<string> => {
		const { eth_sign_prehash } = this.caller({
			certified: true
		});

		const request: EthSignPrehashRequest = { hash };
		const response = await eth_sign_prehash(request, [SIGNER_PAYMENT_TYPE]);

		if ('Ok' in response) {
			const {
				Ok: { signature }
			} = response;
			return signature;
		}

		throw mapSignerCanisterGetEthAddressError(response.Err);
	};

	sendBtc = async ({
		feeSatoshis,
		utxosToSpend,
		...rest
	}: SendBtcParams): Promise<SendBtcResponse> => {
		const { btc_caller_send } = this.caller({
			certified: true
		});

		const response = await btc_caller_send(
			{
				address_type: P2WPKH,
				utxos_to_spend: utxosToSpend,
				fee_satoshis: feeSatoshis,
				...rest
			},
			[SIGNER_PAYMENT_TYPE]
		);

		if ('Ok' in response) {
			const { Ok } = response;
			return Ok;
		}

		throw mapSignerCanisterSendBtcError(response.Err);
	};

	signBtc = async ({
		feeSatoshis,
		utxosToSpend,
		...rest
	}: SendBtcParams): Promise<SignBtcResponse> => {
		const { btc_caller_sign } = this.caller({
			certified: true
		});

		const response = await btc_caller_sign(
			{
				address_type: P2WPKH,
				utxos_to_spend: utxosToSpend,
				fee_satoshis: feeSatoshis,
				...rest
			},
			[SIGNER_PAYMENT_TYPE]
		);

		if ('Ok' in response) {
			const { Ok } = response;
			return Ok;
		}

		throw mapSignerCanisterSendBtcError(response.Err);
	};

	getSchnorrPublicKey = async ({
		derivationPath,
		keyId
	}: GetSchnorrPublicKeyParams): Promise<Uint8Array> => {
		const { schnorr_public_key } = this.caller({
			certified: true
		});

		const response = await schnorr_public_key(
			{
				key_id: keyId,
				canister_id: [],
				derivation_path: mapDerivationPath(derivationPath)
			},
			[SIGNER_PAYMENT_TYPE]
		);

		if ('Ok' in response) {
			const { public_key } = fromDefinedNullable(response.Ok);
			return public_key;
		}

		// TODO: map error like the other methods when SchnorrPublicKeyError is exposed in the Signer repo
		throw response.Err;
	};

	signWithSchnorr = async ({
		message,
		derivationPath,
		keyId
	}: SignWithSchnorrParams): Promise<Uint8Array> => {
		const { schnorr_sign } = this.caller({
			certified: true
		});

		const response = await schnorr_sign(
			{
				key_id: keyId,
				derivation_path: mapDerivationPath(derivationPath),
				message
			},
			[SIGNER_PAYMENT_TYPE]
		);

		if ('Ok' in response) {
			const { signature } = fromDefinedNullable(response.Ok);
			return signature;
		}

		// TODO: map error like the other methods when SchnorrSignError is exposed in the Signer repo
		throw response.Err;
	};

	/**
	 * Get a generic ECDSA public key with custom derivation path.
	 * Used for Kaspa and other chains that use secp256k1.
	 */
	getGenericEcdsaPublicKey = async ({
		derivationPath,
		keyId
	}: GenericEcdsaPublicKeyParams): Promise<{ publicKey: Uint8Array; chainCode: Uint8Array }> => {
		const { generic_caller_ecdsa_public_key } = this.caller({
			certified: true
		});

		const response = await generic_caller_ecdsa_public_key(
			{
				key_id: keyId,
				canister_id: [],
				derivation_path: mapDerivationPath(derivationPath)
			},
			[SIGNER_PAYMENT_TYPE]
		);

		if ('Ok' in response) {
			const { public_key, chain_code } = fromDefinedNullable(response.Ok);
			return { publicKey: public_key, chainCode: chain_code };
		}

		throw mapSignerCanisterGetEthAddressError(response.Err);
	};

	/**
	 * Sign a message hash with generic ECDSA.
	 * Used for Kaspa and other chains that use secp256k1.
	 */
	signWithGenericEcdsa = async ({
		messageHash,
		derivationPath,
		keyId
	}: GenericSignWithEcdsaParams): Promise<Uint8Array> => {
		const { generic_sign_with_ecdsa } = this.caller({
			certified: true
		});

		const response = await generic_sign_with_ecdsa([SIGNER_PAYMENT_TYPE], {
			key_id: keyId,
			derivation_path: mapDerivationPath(derivationPath),
			message_hash: messageHash
		});

		if ('Ok' in response) {
			const { signature } = fromDefinedNullable(response.Ok);
			return signature;
		}

		throw mapSignerCanisterGetEthAddressError(response.Err);
	};
}
