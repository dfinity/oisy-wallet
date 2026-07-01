import type {
	ActiveUserTransaction,
	_SERVICE as BackendService,
	BtcGetFeePercentilesResponse,
	Contact,
	CreatePersonalNoteShareRequest,
	CustomToken,
	DeletePersonalNoteRequest,
	ExchangeRate,
	GetAllowedCyclesResponse,
	PersonalNoteEntry,
	PersonalNoteShareContent,
	SignOnramperWidgetUrlRequest,
	SignOnramperWidgetUrlResponse,
	TokenId
} from '$declarations/backend/backend.did';
import { idlFactory as idlCertifiedFactoryBackend } from '$declarations/backend/backend.factory.certified.did';
import { idlFactory as idlFactoryBackend } from '$declarations/backend/backend.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import {
	mapAllowSigningError,
	mapBtcAddPendingTransactionError,
	mapBtcGetFeePercentilesError,
	mapBtcGetPendingTransactionsError,
	mapGetAllowedCyclesError,
	mapSignOnramperWidgetUrlError
} from '$lib/canisters/backend.errors';
import { ZERO } from '$lib/constants/app.constants';
import type {
	AddPendingTransactionOutcome,
	AddUserDismissedNotificationParams,
	AddUserHiddenDappIdParams,
	AllowSigningOutcome,
	AllowSigningParams,
	BtcAddPendingTransactionParams,
	BtcGetFeePercentilesParams,
	BtcGetPendingTransactionParams,
	CreateActiveUserTransactionParams,
	CreateUserProfileResponse,
	GetPendingTransactionsOutcome,
	GetUserProfileResponse,
	GetUserTransactionsParams,
	GetUserTransactionsResponse,
	SaveProviderAgreements,
	SaveUserAgreements,
	SaveUserNetworksSettings,
	SaveUserTransactionsParams,
	SetUserShowTestnetsParams,
	SignOnramperWidgetUrlParams,
	UpdateActiveUserTransactionParams,
	UpdateUserExperimentalFeatureSettings,
	UpdateUserTransactionFilterSettings
} from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { SignupsClosedError } from '$lib/types/errors';
import type { BackendExchangeRate } from '$lib/types/exchange';
import { mapBackendUserAgreements } from '$lib/utils/agreements.utils';
import { mapBackendProviderAgreements } from '$lib/utils/provider-agreements.utils';
import { mapUserExperimentalFeatures } from '$lib/utils/user-experimental-features.utils';
import { mapUserNetworks } from '$lib/utils/user-networks.utils';
import {
	Canister,
	createServices,
	fromNullable,
	nonNullish,
	toNullable,
	type QueryParams
} from '@dfinity/utils';

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

	listCustomTokens = (): Promise<CustomToken[]> => {
		const { list_custom_tokens } = this.caller({ certified: true });

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

	removeCustomToken = ({ token }: { token: CustomToken }): Promise<void> => {
		const { remove_custom_token } = this.caller({ certified: true });

		return remove_custom_token(token);
	};

	createUserProfile = async (): Promise<CreateUserProfileResponse> => {
		const { create_user_profile } = this.caller({ certified: true });

		const response = await create_user_profile();

		if ('Err' in response && 'SignupsClosed' in response.Err) {
			throw new SignupsClosedError();
		}

		return response;
	};

	getUserProfile = ({ certified }: QueryParams): Promise<GetUserProfileResponse> => {
		const { get_user_profile } = this.caller({ certified });

		return get_user_profile();
	};

	newUserSignupsAllowed = ({ certified }: QueryParams): Promise<boolean> => {
		const { new_user_signups_allowed } = this.caller({ certified });

		return new_user_signups_allowed();
	};

	exchangeRateEnabled = ({ certified }: QueryParams): Promise<boolean> => {
		const { exchange_rate_enabled } = this.caller({ certified });

		return exchange_rate_enabled();
	};

	btcAddPendingTransaction = async ({
		txId,
		iiDelegationChain,
		...rest
	}: BtcAddPendingTransactionParams): Promise<AddPendingTransactionOutcome> => {
		const { btc_add_pending_transaction } = this.caller({ certified: true });

		const response = await btc_add_pending_transaction({
			txid: txId,
			ii_delegation_chain: iiDelegationChain,
			...rest
		});

		if ('Ok' in response) {
			return { response: true };
		}

		// In case of rate limit reached, we ignore the error and let the user continue (for now).
		// TODO: improve placeholder with significant data, for now we do not use them
		if ('RateLimited' in response.Err) {
			return {
				response: true,
				rateLimitInfo: {
					endpoint: 'btc_add_pending_transaction',
					limiter: 'BTC_ADD_PENDING_TX_RATE_LIMITER'
				}
			};
		}

		throw mapBtcAddPendingTransactionError(response.Err);
	};

	btcGetPendingTransactions = async ({
		network,
		iiDelegationChain
	}: BtcGetPendingTransactionParams): Promise<GetPendingTransactionsOutcome> => {
		const { btc_get_pending_transactions } = this.caller({ certified: true });

		const response = await btc_get_pending_transactions({
			network,
			ii_delegation_chain: iiDelegationChain
		});

		if ('Ok' in response) {
			const {
				Ok: { transactions }
			} = response;
			return { response: transactions };
		}

		// In case of rate limit reached, we ignore the error and let the user continue (for now).
		// TODO: improve placeholder with significant data, for now we do not use them
		if ('RateLimited' in response.Err) {
			return {
				response: [],
				rateLimitInfo: {
					endpoint: 'btc_get_pending_transactions',
					limiter: 'BTC_GET_PENDING_TX_RATE_LIMITER'
				}
			};
		}

		throw mapBtcGetPendingTransactionsError(response.Err);
	};

	btcGetCurrentFeePercentiles = async ({
		network
	}: BtcGetFeePercentilesParams): Promise<BtcGetFeePercentilesResponse> => {
		const { btc_get_current_fee_percentiles } = this.caller({ certified: true });

		const response = await btc_get_current_fee_percentiles({
			network
		});

		if ('Ok' in response) {
			const { Ok } = response;
			return Ok;
		}

		throw mapBtcGetFeePercentilesError(response.Err);
	};

	getAllowedCycles = async (): Promise<GetAllowedCyclesResponse> => {
		const { get_allowed_cycles } = this.caller({ certified: true });

		const response = await get_allowed_cycles();

		if ('Ok' in response) {
			const { Ok } = response;
			return Ok;
		}

		throw mapGetAllowedCyclesError(response.Err);
	};

	signOnramperWidgetUrl = async ({
		wallets,
		networkWallets,
		walletAddressTags
	}: SignOnramperWidgetUrlParams): Promise<SignOnramperWidgetUrlResponse> => {
		const { sign_onramper_widget_url } = this.caller({ certified: true });

		const request: SignOnramperWidgetUrlRequest = {
			wallets: wallets.map(({ cryptoId, wallet }) => ({ key: cryptoId, value: wallet })),
			network_wallets: networkWallets.map(({ networkId, wallet }) => ({
				key: networkId,
				value: wallet
			})),
			wallet_address_tags: (walletAddressTags ?? []).map(({ cryptoId, tag }) => ({
				key: cryptoId,
				value: tag
			}))
		};

		const response = await sign_onramper_widget_url(request);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapSignOnramperWidgetUrlError(response.Err);
	};

	allowSigning = async ({
		iiDelegationChain
	}: AllowSigningParams): Promise<AllowSigningOutcome> => {
		const { allow_signing } = this.caller({ certified: true });

		const response = await allow_signing(
			toNullable({
				ii_delegation_chain: iiDelegationChain
			})
		);

		if ('Ok' in response) {
			return { response: response.Ok };
		}

		if ('RateLimited' in response.Err || 'RateLimitedByGuard' in response.Err) {
			return {
				response: {
					status: { Skipped: null },
					allowed_cycles: ZERO
				},
				rateLimitInfo: {
					endpoint: 'allow_signing',
					limiter:
						'RateLimitedByGuard' in response.Err
							? 'ALLOW_SIGNING_GUARD_LIMITER'
							: 'ALLOW_SIGNING_RATE_LIMITER'
				}
			};
		}

		throw mapAllowSigningError(response.Err);
	};

	addUserHiddenDappId = async ({
		dappId,
		currentUserVersion
	}: AddUserHiddenDappIdParams): Promise<void> => {
		const { add_user_hidden_dapp_id } = this.caller({ certified: true });

		await add_user_hidden_dapp_id({
			dapp_id: dappId,
			current_user_version: toNullable(currentUserVersion)
		});
	};

	addUserDismissedNotification = async ({
		notifications,
		currentUserVersion
	}: AddUserDismissedNotificationParams): Promise<void> => {
		const { add_user_dismissed_notification } = this.caller({ certified: true });

		await add_user_dismissed_notification({
			notifications,
			current_user_version: toNullable(currentUserVersion)
		});
	};

	setUserShowTestnets = async ({
		showTestnets,
		currentUserVersion
	}: SetUserShowTestnetsParams): Promise<void> => {
		const { set_user_show_testnets } = this.caller({ certified: true });

		await set_user_show_testnets({
			show_testnets: showTestnets,
			current_user_version: toNullable(currentUserVersion)
		});
	};

	updateUserNetworkSettings = async ({
		networks,
		currentUserVersion
	}: SaveUserNetworksSettings): Promise<void> => {
		const { update_user_network_settings } = this.caller({ certified: true });

		await update_user_network_settings({
			networks: mapUserNetworks(networks),
			current_user_version: toNullable(currentUserVersion)
		});
	};

	updateUserAgreements = async ({
		agreements,
		currentUserVersion
	}: SaveUserAgreements): Promise<void> => {
		const { update_user_agreements } = this.caller({ certified: true });

		await update_user_agreements({
			agreements: mapBackendUserAgreements(agreements),
			current_user_version: toNullable(currentUserVersion)
		});
	};

	updateProviderAgreements = async ({
		providerAgreements,
		currentUserVersion
	}: SaveProviderAgreements): Promise<void> => {
		const { update_provider_agreements } = this.caller({ certified: true });

		await update_provider_agreements({
			provider_agreements: mapBackendProviderAgreements(providerAgreements),
			current_user_version: toNullable(currentUserVersion)
		});
	};

	getContact = async (id: bigint): Promise<Contact> => {
		const { get_contact } = this.caller({ certified: false });
		const response = await get_contact(id);

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	getContacts = async (): Promise<Contact[]> => {
		const { get_contacts } = this.caller({ certified: false });
		const response = await get_contacts();

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	createContact = async (name: string): Promise<Contact> => {
		const { create_contact } = this.caller({ certified: true });
		const response = await create_contact({ name, image: [] });

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	deleteContact = async (id: bigint): Promise<bigint> => {
		const { delete_contact } = this.caller({ certified: true });
		const response = await delete_contact(id);

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	updateContact = async (contact: Contact): Promise<Contact> => {
		const { update_contact } = this.caller({ certified: true });
		const response = await update_contact(contact);

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	updateUserExperimentalFeatureSettings = async ({
		experimentalFeatures,
		currentUserVersion
	}: UpdateUserExperimentalFeatureSettings): Promise<void> => {
		const { update_user_experimental_feature_settings } = this.caller({ certified: true });

		await update_user_experimental_feature_settings({
			experimental_features: mapUserExperimentalFeatures(experimentalFeatures),
			current_user_version: toNullable(currentUserVersion)
		});
	};

	updateUserTransactionFilterSettings = async ({
		hideMicroTransactions,
		currentUserVersion
	}: UpdateUserTransactionFilterSettings): Promise<void> => {
		const { update_user_transaction_filter_settings } = this.caller({ certified: true });

		await update_user_transaction_filter_settings({
			filter: { hide_micro_transactions: hideMicroTransactions },
			current_user_version: toNullable(currentUserVersion)
		});
	};

	private mapExchangeRate = (rate: ExchangeRate | undefined): BackendExchangeRate | undefined => {
		if (!nonNullish(rate)) {
			return;
		}

		return {
			usd: {
				price: fromNullable(rate.usd.price),
				price24hChangePct: fromNullable(rate.usd.price_24h_change_pct),
				marketCap: fromNullable(rate.usd.market_cap),
				timestampNs: rate.usd.timestamp_ns
			}
		};
	};

	getExchangeRate = async ({
		token_id,
		certified
	}: { token_id: TokenId } & QueryParams): Promise<BackendExchangeRate | undefined> => {
		const { get_exchange_rate } = this.caller({ certified });

		const response = await get_exchange_rate(token_id);

		return this.mapExchangeRate(fromNullable(response));
	};

	getExchangeRates = async (): Promise<Array<[TokenId, BackendExchangeRate | undefined]>> => {
		// `get_exchange_rates` is an update on the backend (mutates token_activity, may issue
		// HTTP outcalls), so it always goes through the certified service.
		const { get_exchange_rates } = this.caller({ certified: true });

		const results = await get_exchange_rates();

		return results.map(([id, rate]) => [id, this.mapExchangeRate(fromNullable(rate))]);
	};

	getUserTransactions = async ({
		tokenId,
		start,
		maxResults
	}: GetUserTransactionsParams): Promise<GetUserTransactionsResponse> => {
		const { get_user_transactions } = this.caller({ certified: false });

		const response = await get_user_transactions({
			token_id: tokenId,
			start: toNullable(start),
			max_results: maxResults
		});

		if ('Ok' in response) {
			const { transactions, newest_block_index, oldest_block_index, total_stored, next_start } =
				response.Ok;

			return {
				transactions,
				newestBlockIndex: fromNullable(newest_block_index),
				oldestBlockIndex: fromNullable(oldest_block_index),
				totalStored: total_stored,
				nextStart: fromNullable(next_start)
			};
		}

		throw response.Err;
	};

	saveUserTransactions = async ({
		tokenId,
		transactions
	}: SaveUserTransactionsParams): Promise<void> => {
		const { save_user_transactions } = this.caller({ certified: true });

		const response = await save_user_transactions({
			token_id: tokenId,
			transactions
		});

		if ('Ok' in response) {
			return;
		}

		throw response.Err;
	};

	createActiveUserTransaction = async ({
		id,
		data,
		progressStep,
		externalRefs
	}: CreateActiveUserTransactionParams): Promise<ActiveUserTransaction> => {
		const { create_active_user_transaction } = this.caller({ certified: true });

		const response = await create_active_user_transaction({
			id,
			data,
			progress_step: toNullable(progressStep),
			external_refs: externalRefs
		});

		if ('Ok' in response) {
			return response.Ok;
		}

		throw response.Err;
	};

	updateActiveUserTransaction = async ({
		id,
		status,
		progressStep,
		externalRefs,
		error
	}: UpdateActiveUserTransactionParams): Promise<ActiveUserTransaction> => {
		const { update_active_user_transaction } = this.caller({ certified: true });

		const response = await update_active_user_transaction({
			id,
			status: toNullable(status),
			progress_step: toNullable(progressStep),
			external_refs: toNullable(externalRefs),
			error: toNullable(error)
		});

		if ('Ok' in response) {
			return response.Ok;
		}

		throw response.Err;
	};

	deleteActiveUserTransaction = async (id: string): Promise<void> => {
		const { delete_active_user_transaction } = this.caller({ certified: true });

		const response = await delete_active_user_transaction(id);

		if ('Ok' in response) {
			return;
		}

		throw response.Err;
	};

	getActiveUserTransactions = async (): Promise<ActiveUserTransaction[]> => {
		const { get_active_user_transactions } = this.caller({ certified: false });

		const response = await get_active_user_transactions();

		if ('Ok' in response) {
			return response.Ok.transactions;
		}

		throw response.Err;
	};

	setPersonalNote = async (request: PersonalNoteEntry): Promise<void> => {
		const { set_personal_note } = this.caller({ certified: true });
		const response = await set_personal_note(request);

		if ('Ok' in response) {
			return;
		}
		throw response.Err;
	};

	deletePersonalNote = async (request: DeletePersonalNoteRequest): Promise<void> => {
		const { delete_personal_note } = this.caller({ certified: true });
		const response = await delete_personal_note(request);

		if ('Ok' in response) {
			return;
		}
		throw response.Err;
	};

	getPersonalNotes = async (): Promise<PersonalNoteEntry[]> => {
		const { get_personal_notes } = this.caller({ certified: false });
		const response = await get_personal_notes();

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	getPersonalNotesCount = async (): Promise<bigint> => {
		const { get_personal_notes_count } = this.caller({ certified: false });
		const response = await get_personal_notes_count();

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	getPersonalNotesEncryptedVetkey = async (
		transportPublicKey: Uint8Array
	): Promise<Uint8Array | number[]> => {
		const { get_personal_notes_encrypted_vetkey } = this.caller({ certified: true });
		const response = await get_personal_notes_encrypted_vetkey(transportPublicKey);

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	getPersonalNotesVetkeyPublicKey = async (): Promise<Uint8Array | number[]> => {
		const { get_personal_notes_vetkey_public_key } = this.caller({ certified: true });
		const response = await get_personal_notes_vetkey_public_key();

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	createPersonalNoteShare = async (request: CreatePersonalNoteShareRequest): Promise<void> => {
		const { create_personal_note_share } = this.caller({ certified: true });
		const response = await create_personal_note_share(request);

		if ('Ok' in response) {
			return;
		}
		throw response.Err;
	};

	// Anonymous-callable read endpoint (the share recipient has no identity), so
	// it runs as a non-certified query like the other note reads.
	getPersonalNoteShare = async (token: string): Promise<PersonalNoteShareContent> => {
		const { get_personal_note_share } = this.caller({ certified: false });
		const response = await get_personal_note_share(token);

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	consumePersonalNoteShare = async (token: string): Promise<PersonalNoteShareContent> => {
		const { consume_personal_note_share } = this.caller({ certified: true });
		const response = await consume_personal_note_share(token);

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	getPersonalNoteSharesCount = async (): Promise<bigint> => {
		const { get_personal_note_shares_count } = this.caller({ certified: false });
		const response = await get_personal_note_shares_count();

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};
}
