export enum PLAUSIBLE_EVENTS {
	VIEW_OPEN = 'view_open',
	NFT_CATEGORIZE = 'nft_categorize',
	PAGE_OPEN = 'page_open',
	LIST_SETTINGS_CHANGE = 'list_settings_change',
	SWAP_OFFER = 'swap_offer',
	MEDIA_CONSENT = 'media_consent',
	OPEN_MODAL = 'open_modal',
	LOAD_CUSTOM_TOKENS = 'load_custom_tokens',
	PAY = 'pay'
}

export enum PLAUSIBLE_EVENT_CONTEXTS {
	NFT = 'nft',
	ASSETS_TAB = 'assets_tab',
	TOKENS = 'tokens',
	DFX = 'dfx',
	OPEN_CRYPTOPAY = 'open_cryptopay'
}

export enum PLAUSIBLE_EVENT_SUBCONTEXT_NFT {
	ERC721 = 'erc721',
	ERC1155 = 'erc1155'
}

export enum PLAUSIBLE_EVENT_VALUES {
	NFT = 'nft',
	NFT_COLLECTION_PAGE = 'nft-collection-page',
	NFT_PAGE = 'nft-page'
}

export enum PLAUSIBLE_EVENT_SOURCES {
	ASSETS_PAGE = 'assets_page',
	NFT_COLLECTION = 'nft-collection-page',
	NFT_MEDIA_REVIEW = 'media-review',
	NFT_PAGE = 'nft-page',
	NFTS_PAGE = 'nfts',
	NAVIGATION = 'navigation'
}

export enum PLAUSIBLE_EVENT_EVENTS_KEYS {
	GROUP = 'group',
	VISIBILITY = 'visibility',
	SORT_ASC = 'sort_asc',
	SORT_DESC = 'sort_desc',
	PRICE = 'price'
}
