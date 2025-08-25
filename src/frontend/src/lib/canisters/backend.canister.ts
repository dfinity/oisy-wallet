import type {
	_SERVICE as BackendService,
	CustomToken,
	PendingTransaction,
	SelectedUtxosFeeResponse,
	UserProfile,
	UserToken
} from '$declarations/backend/backend.did';
import { idlFactory as idlCertifiedFactoryBackend } from '$declarations/backend/backend.factory.certified.did';
import { idlFactory as idlFactoryBackend } from '$declarations/backend/backend.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import {
	mapAllowSigningError,
	mapBtcPendingTransactionError,
	mapBtcSelectUserUtxosFeeError
} from '$lib/canisters/backend.errors';
import type {
	AddUserCredentialParams,
	AddUserCredentialResponse,
	BtcAddPendingTransactionParams,
	BtcGetPendingTransactionParams,
	BtcSelectUserUtxosFeeParams,
	GetUserProfileResponse
} from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, toNullable, type QueryParams } from '@dfinity/utils';

export class BackendCanister extends Canister<BackendService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<BackendService>): Promise<BackendCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<BackendService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryBackend,
			certifiedIdlFactory: idlCertifiedFactoryBackend
		});

		return new BackendCanister(canisterId, service, certifiedService);
	}

	listUserTokens = ({ certified = true }: QueryParams): Promise<UserToken[]> => {
		const { list_user_tokens } = this.caller({ certified });

		return list_user_tokens();
	};

	listCustomTokens = ({ certified = true }: QueryParams): Promise<CustomToken[]> => {
		const { list_custom_tokens } = this.caller({ certified });

		return list_custom_tokens();
	};

	setManyCustomTokens = ({ tokens }: { tokens: CustomToken[] }): Promise<void> => {
		const { set_many_custom_tokens } = this.caller({ certified: true });

		return set_many_custom_tokens(tokens);
	};

	setCustomToken = ({ token }: { token: CustomToken }): Promise<void> => {
		const { set_custom_token } = this.caller({ certified: true });

		return set_custom_token(token);
	};

	setManyUserTokens = ({ tokens }: { tokens: UserToken[] }): Promise<void> => {
		const { set_many_user_tokens } = this.caller({ certified: true });

		return set_many_user_tokens(tokens);
	};

	setUserToken = ({ token }: { token: UserToken }): Promise<void> => {
		const { set_user_token } = this.caller({ certified: true });

		return set_user_token(token);
	};

	createUserProfile = (): Promise<UserProfile> => {
		const { create_user_profile } = this.caller({ certified: true });

		return create_user_profile();
	};

	getUserProfile = ({ certified = true }: QueryParams): Promise<GetUserProfileResponse> => {
		const { get_user_profile } = this.caller({ certified });

		return get_user_profile();
	};

	addUserCredential = ({
		credentialJwt,
		issuerCanisterId,
		currentUserVersion,
		credentialSpec
	}: AddUserCredentialParams): Promise<AddUserCredentialResponse> => {
		const { add_user_credential } = this.caller({ certified: true });

		return add_user_credential({
			credential_jwt: credentialJwt,
			issuer_canister_id: issuerCanisterId,
			current_user_version: toNullable(currentUserVersion),
			credential_spec: credentialSpec
		});
	};

	btcAddPendingTransaction = async ({
		txId,
		...rest
	}: BtcAddPendingTransactionParams): Promise<boolean> => {
		const { btc_add_pending_transaction } = this.caller({ certified: true });

		const response = await btc_add_pending_transaction({
			txid: txId,
			...rest
		});

		if ('Ok' in response) {
			return true;
		}

		throw mapBtcPendingTransactionError(response.Err);
	};

	// TODO: rename to plural
	btcGetPendingTransaction = async ({
		network,
		address
	}: BtcGetPendingTransactionParams): Promise<PendingTransaction[]> => {
		const { btc_get_pending_transactions } = this.caller({ certified: true });

		const response = await btc_get_pending_transactions({
			network,
			address
		});

		if ('Ok' in response) {
			const {
				Ok: { transactions }
			} = response;
			return transactions;
		}

		throw mapBtcPendingTransactionError(response.Err);
	};

	btcSelectUserUtxosFee = async ({
		network,
		minConfirmations,
		amountSatoshis
	}: BtcSelectUserUtxosFeeParams): Promise<SelectedUtxosFeeResponse> => {
		const { btc_select_user_utxos_fee } = this.caller({ certified: true });

		const response = await btc_select_user_utxos_fee({
			network,
			min_confirmations: minConfirmations,
			amount_satoshis: amountSatoshis
		});

		if ('Ok' in response) {
			const { Ok } = response;
			return Ok;
		}

		throw mapBtcSelectUserUtxosFeeError(response.Err);
	};

	allowSigning = async (): Promise<void> => {
		const { allow_signing } = this.caller({ certified: true });

		const response = await allow_signing();

		if ('Err' in response) {
			throw mapAllowSigningError(response.Err);
		}
	};
}
