export enum PLAUSIBLE_EVENTS {
	VIEW_OPEN = 'view_open',
	NFT_CATEGORIZE = 'nft_categorize',
	PAGE_OPEN = 'page_open',
	LIST_SETTINGS_CHANGE = 'list_settings_change',
	SWAP_OFFER = 'swap_offer',
	MEDIA_CONSENT = 'media_consent',
	OPEN_MODAL = 'open_modal',
	LOAD_CUSTOM_TOKENS = 'load_custom_tokens',
	PAY = 'pay',
	SIGN_IN_CANCELLED_HELP = 'sign_in_cancelled_help',
	RATE_LIMITED = 'rate_limited',
	STAKE = 'stake',
	UNSTAKE = 'unstake',
	LOAD_TRANSACTIONS = 'load_transactions',
	SIGNER_PAGE_VISIT = 'signer_page_visit',
	SIGNER_INTERACTION = 'signer_interaction',
	NETWORK_FILTER = 'network_filter',
	NETWORK_MANAGE = 'network_manage',
	TRANSACTION_FILTER = 'transaction_filter',
	TOKEN_MANAGE = 'token_manage',
	EXPORT_DATA = 'export_data',
	ONRAMPER_OPEN = 'onramper_open',
	LIMIT_ORDER = 'limit_order',
	DEPOSIT_WITHDRAW = 'deposit_withdraw',
	PERSONAL_NOTE = 'personal_note',
	PERSONAL_NOTE_SHARE = 'personal_note_share',
	HELP = 'help',
	TIP = 'tip',
	// The countdown to the end of the XDR basket that prices TCYCLES.
	XDR_BASKET_EXPIRY = 'xdr_basket_expiry',
	CYCLES_MINT = 'cycles_mint',
	// Sending a transaction, sent when something notable happens to it. The outcome is in
	// `result_status`, never in the name.
	TRANSACTION_SEND = 'transaction_send',
	// An invariant we believed unreachable was reached. Not for flows that can legitimately
	// fail — those keep their own event and report the outcome via `result_status`.
	ERROR = 'error'
}

// How serious any event is, from low to high, in `event_severity`: OpenTelemetry's level names,
// with `blocker` (as in `PLAUSIBLE_EVENT_ERROR_SEVERITIES`) in place of `fatal`. Unlike
// `result_error_severity`, which rates only errors, it can be set on every event.
export enum PLAUSIBLE_EVENT_SEVERITIES {
	INFO = 'info',
	WARN = 'warn',
	ERROR = 'error',
	BLOCKER = 'blocker'
}

export enum PLAUSIBLE_EVENT_ERROR_SEVERITIES {
	// The user cannot continue at all.
	BLOCKER = 'blocker',
	// A whole feature is unusable, the rest of the app works.
	CRITICAL = 'critical',
	// The user's action visibly failed.
	MAJOR = 'major',
	// Invisible to the user; they keep working as normal.
	MINOR = 'minor'
}

export enum PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES {
	SECRET_NOT_CONFIGURED = 'secret_not_configured',
	RATE_LIMITED = 'rate_limited',
	SIGNING_FAILED = 'signing_failed'
}

// ICPSwap writes free text into its `InternalError` variant and `mapIcpSwapFactoryError`
// interpolates it verbatim, so a raw message cannot satisfy invariant 4 in
// docs/ai/frontend/analytics.md. Help failures are categorised by error class instead; which call
// failed is already in `event_modifier`.
export enum PLAUSIBLE_EVENT_HELP_ERROR_TYPES {
	// The factory has no pool for the pair, or the lookup itself failed - the factory answers an
	// unknown pair with a text-free `CommonError`, so the two cannot be told apart.
	POOL_NOT_FOUND = 'pool_not_found',
	// The factory or the pool returned an error variant.
	CANISTER_ERROR = 'canister_error',
	// Anything else: transport, agent, or an unexpected throw.
	UNKNOWN = 'unknown'
}

// The category is what a dashboard filters on. The node's own text sits next to it in
// `result_error_text` only in the one wording known to carry a gas figure alone.
export enum PLAUSIBLE_EVENT_TRANSACTION_SEND_ERROR_TYPES {
	// The node simulated the transaction and it ran out of the gas it was signed with.
	OUT_OF_GAS = 'out_of_gas'
}

// Why an offer that arrived was left out of the swap form.
export enum PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES {
	// A 1Click quote for an XRP deposit came with a deposit memo.
	DEPOSIT_MEMO = 'deposit_memo'
}

// Why a tip step failed. `TipError` is OISY's own candid type, so its variant names are a closed
// set we control and safe to send under invariant 4 in docs/ai/frontend/analytics.md; only the
// name goes out, never the `msg` some variants carry. The ledger's refusals of the approve are
// prefixed because `InsufficientFunds` exists on both sides and means different things there.
export enum PLAUSIBLE_EVENT_TIP_ERROR_TYPES {
	INVALID_EXPIRY = 'invalid_expiry',
	CLAIM_IN_PROGRESS = 'claim_in_progress',
	SECRET_CIPHERTEXT_TOO_LARGE = 'secret_ciphertext_too_large',
	// The sender's allowance no longer covers the tip.
	UNCOVERED = 'uncovered',
	// Unknown id, expired, cancelled, already claimed or a wrong code: the canister answers all of
	// them alike on purpose, so nobody can probe which.
	NOT_FOUND = 'not_found',
	NOT_YOUR_TIP = 'not_your_tip',
	INVALID_CLAIM_CODE_HASH = 'invalid_claim_code_hash',
	INVALID_TIP_ID = 'invalid_tip_id',
	RATE_LIMITED = 'rate_limited',
	DUPLICATE_TIP_ID = 'duplicate_tip_id',
	NOT_CANCELLABLE = 'not_cancellable',
	TRANSFER_FAILED = 'transfer_failed',
	INTERNAL_ERROR = 'internal_error',
	MESSAGE_TOO_LONG = 'message_too_long',
	TOO_MANY_TIPS = 'too_many_tips',
	// The claim was valid but the sender's balance was short.
	INSUFFICIENT_FUNDS = 'insufficient_funds',
	AMOUNT_TOO_SMALL = 'amount_too_small',
	LEDGER_GENERIC_ERROR = 'ledger_generic_error',
	LEDGER_TEMPORARILY_UNAVAILABLE = 'ledger_temporarily_unavailable',
	LEDGER_DUPLICATE = 'ledger_duplicate',
	LEDGER_BAD_FEE = 'ledger_bad_fee',
	LEDGER_ALLOWANCE_CHANGED = 'ledger_allowance_changed',
	LEDGER_CREATED_IN_FUTURE = 'ledger_created_in_future',
	LEDGER_TOO_OLD = 'ledger_too_old',
	LEDGER_EXPIRED = 'ledger_expired',
	// The sender's balance does not cover the amount plus the fee.
	LEDGER_INSUFFICIENT_FUNDS = 'ledger_insufficient_funds',
	// Not a canister error: a reopen found no recoverable copy of the claim code, because the tip
	// predates the store, was cancelled, or its copy could not be saved when it was created.
	LINK_UNAVAILABLE = 'link_unavailable',
	// Anything else: transport, agent, the vetKey decryption, or an unexpected throw.
	UNKNOWN = 'unknown'
}

export enum PLAUSIBLE_EVENT_CONTEXTS {
	BACKEND = 'backend',
	NFT = 'nft',
	ASSETS_TAB = 'assets_tab',
	TOKENS = 'tokens',
	DFX = 'dfx',
	OPEN_CRYPTOPAY = 'open_cryptopay',
	EARN = 'earn',
	BORROW = 'borrow',
	TRANSACTIONS = 'transactions',
	SIGNER = 'signer',
	NETWORKS = 'networks',
	LEARN_MORE = 'learn_more',
	TRADING = 'trading',
	PERSONAL_NOTES = 'personal_notes',
	HELP = 'help',
	TIPS = 'tips',
	COMPUTE = 'compute',
	SEND = 'send',
	CONVERT = 'convert',
	AI_ASSISTANT = 'ai_assistant'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS {
	ICRC = 'icrc'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_EARN {
	HARVEST_AUTOPILOT = 'harvest-autopilot'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_NFT {
	ERC721 = 'erc721',
	ERC1155 = 'erc1155'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_BACKEND {
	PER_USER = 'per_user',
	GLOBAL = 'global'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_NETWORKS {
	SETTINGS_KEY_UNMAPPED = 'settings_key_unmapped'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS {
	UNCERTIFIED_REMOVED = 'uncertified_removed'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_SIGNER {
	PERMISSIONS = 'permissions',
	ACCOUNTS = 'accounts',
	CONSENT_MESSAGE = 'consent_message',
	CALL_CANISTER = 'call_canister'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_NOTES {
	SHARE = 'share'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_HELP {
	SUPPORT = 'support',
	NETWORK_EXPLORERS = 'network_explorers',
	PROVIDER_EXPLORERS = 'provider_explorers',
	ICPSWAP_WITHDRAWAL = 'icpswap_withdrawal'
}

export enum PLAUSIBLE_EVENT_VALUES {
	NFT = 'nft',
	NFT_COLLECTION_PAGE = 'nft-collection-page',
	NFT_PAGE = 'nft-page',
	EARN_PAGE = 'earn-page',
	BORROW_PAGE = 'borrow-page',
	OISY_TRADE_PAGE = 'oisy-trade-page',
	HARVEST_AUTOPILOTS_PAGE = 'harvest-autopilots-page',
	HARVEST_AUTOPILOT_DETAIL_PAGE = 'harvest-autopilot-detail-page',
	TOKENS_BASIC = 'tokens_basic',
	TOKENS_EXTENDED = 'tokens_extended',
	TRANSACTIONS_BASIC = 'transactions_basic',
	TRANSACTIONS_EXTENDED = 'transactions_extended',
	FIRST_NOTE = 'first_note'
}

export enum PLAUSIBLE_EVENT_SOURCES {
	BACKEND = 'backend',
	ASSETS_PAGE = 'assets_page',
	NFT_COLLECTION = 'nft-collection-page',
	NFT_MEDIA_REVIEW = 'media-review',
	NFT_PAGE = 'nft-page',
	NFTS_PAGE = 'nfts',
	NAVIGATION = 'navigation',
	HARVEST_AUTOPILOT = 'harvest-autopilot'
}

export enum PLAUSIBLE_EVENT_SOURCE_LOCATIONS {
	ACTIVITY_PAGE = 'activity_page',
	MANAGE_TOKENS = 'manage_tokens',
	TOKEN_DETAILS = 'token_details',
	SETTINGS_PAGE = 'settings_page',
	LOCK = 'lock',
	NFT = 'nft',
	REFERRAL = 'referral',
	SCANNER = 'scanner',
	WELCOME = 'welcome',
	EARN = 'earn',
	SIGNER = 'signer',
	REWARDS = 'rewards',
	TRANSACTIONS = 'transactions',
	LIQUIDIUM = 'liquidium',
	OISY_TRADE = 'oisy_trade',
	NOTES = 'notes',
	NOTE_SHARE_DIALOG = 'share_dialog',
	NOTE_SHARE_RECIPIENT_PAGE = 'recipient_page',
	HELP_PAGE = 'help_page',
	TIP_SENDER = 'tip_sender',
	TIP_CLAIMER = 'tip_claimer'
}

export enum PLAUSIBLE_EVENT_EVENTS_KEYS {
	BALANCES_FOUND = 'balances_found',
	GROUP = 'group',
	VISIBILITY = 'visibility',
	SORT = 'sort',
	SORT_ASC = 'sort_asc',
	SORT_DESC = 'sort_desc',
	PRICE = 'price',
	NETWORK = 'network',
	TRANSACTION_TYPE = 'transaction_type',
	TOKEN = 'token',
	CONTACT = 'contact',
	TYPE = 'type',
	LINK = 'link',
	// The gas limit a transaction was signed with.
	GAS_SENT = 'gas_sent',
	// The gas the network estimates the same transaction needs, asked again after it failed.
	GAS_NEEDED = 'gas_needed',
	// How long a tip stays claimable, as the label the sender picked.
	EXPIRY = 'expiry'
}

export enum PLAUSIBLE_EVENT_FILTER_MODIFIERS {
	SET = 'set',
	UNSET = 'unset',
	CLEAR = 'clear',
	OPEN = 'open',
	CLOSE = 'close'
}

export enum PLAUSIBLE_EVENT_RESULT_STATUSES {
	SUCCESS = 'success',
	ERROR = 'error',
	CANCEL = 'cancel',
	EXECUTING = 'executing'
}

export enum PLAUSIBLE_EVENT_TYPES_SIGNER {
	REQUESTED = 'requested',
	PRESENTED = 'presented'
}
