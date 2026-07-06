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
	TRADING = 'trading'
}

export enum PLAUSIBLE_EVENT_ERROR_SEVERITIES {
	MAJOR = 'major'
}

export enum PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES {
	SECRET_NOT_CONFIGURED = 'secret_not_configured',
	RATE_LIMITED = 'rate_limited',
	SIGNING_FAILED = 'signing_failed'
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
	TRADING = 'trading'
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

export enum PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS {
	UNCERTIFIED_REMOVED = 'uncertified_removed'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_SIGNER {
	PERMISSIONS = 'permissions',
	ACCOUNTS = 'accounts',
	CONSENT_MESSAGE = 'consent_message',
	CALL_CANISTER = 'call_canister'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_TRADING {
	LIMIT_ORDER = 'limit_order',
	CANCEL_ORDER = 'cancel_order',
	DEPOSIT = 'deposit',
	WITHDRAW = 'withdraw'
}

export enum PLAUSIBLE_EVENT_VALUES {
	NFT = 'nft',
	NFT_COLLECTION_PAGE = 'nft-collection-page',
	NFT_PAGE = 'nft-page',
	EARN_PAGE = 'earn-page',
	BORROW_PAGE = 'borrow-page',
	HARVEST_AUTOPILOTS_PAGE = 'harvest-autopilots-page',
	HARVEST_AUTOPILOT_DETAIL_PAGE = 'harvest-autopilot-detail-page',
	TOKENS_BASIC = 'tokens_basic',
	TOKENS_EXTENDED = 'tokens_extended',
	TRANSACTIONS_BASIC = 'transactions_basic',
	TRANSACTIONS_EXTENDED = 'transactions_extended'
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
	LIQUIDIUM = 'liquidium'
}

export enum PLAUSIBLE_EVENT_EVENTS_KEYS {
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
	LINK = 'link'
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
