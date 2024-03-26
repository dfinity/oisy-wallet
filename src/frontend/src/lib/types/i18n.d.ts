/**
 * Auto-generated definitions file ("npm run i18n")
 */

interface I18nCore {
	text: {
		test_banner: string;
		logout: string;
		cancel: string;
		next: string;
		save: string;
		back: string;
		name: string;
		symbol: string;
		decimals: string;
	};
	alt: { close: string; logo: string };
}

interface I18nNavigation {
	text: {
		source_code_on_github: string;
		view_on_explorer: string;
		source_code: string;
		manage_internet_identity: string;
		back_to_wallet: string;
	};
	alt: { manage_internet_identity: string; more_settings: string; menu: string };
}

interface I18nSign_in {
	title: string;
	description: string;
	connect_with: string;
}

interface I18nWallet {
	address: string;
	address_copied: string;
	icp_deposits: string;
	alt_open_etherscan: string;
}

interface I18nInit {
	initializing_wallet: string;
	lets_go: string;
	securing_session: string;
	retrieving_eth_key: string;
}

interface I18nHero {
	use_with_caution: string;
	learn_more_about_erc20_icp: string;
}

interface I18nSettings {
	text: {
		title: string;
		principal: string;
		principal_copied: string;
		principal_description: string;
		session: string;
		session_description: string;
		testnets: string;
		testnets_description: string;
		tokens: string;
		tokens_description: string;
	};
	alt: { testnets_toggle: string };
}

interface I18nNetworks {
	title: string;
	show_testnets: string;
	more: string;
}

interface I18nSend {
	text: { amount: string; destination: string; source: string; balance: string };
	assertion: { invalid_destination_address: string };
}

interface I18nToken {
	text: { add_new: string; contract_address: string; add: string; review: string; saving: string };
	placeholder: { enter_contract_address: string };
	warning: { trust_token: string };
	error: {
		invalid_contract_address: string;
		no_metadata: string;
		unexpected: string;
		already_available: string;
		loading_metadata: string;
	};
}

interface I18n {
	lang: Languages;
	core: I18nCore;
	navigation: I18nNavigation;
	sign_in: I18nSign_in;
	wallet: I18nWallet;
	init: I18nInit;
	hero: I18nHero;
	settings: I18nSettings;
	networks: I18nNetworks;
	send: I18nSend;
	token: I18nToken;
}
