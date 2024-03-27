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
		done: string;
		close: string;
		refresh: string;
		name: string;
		symbol: string;
		decimals: string;
		amount: string;
	};
	alt: { logo: string };
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
	text: {
		address: string;
		wallet_address: string;
		address_copied: string;
		wallet_address_copied: string;
		display_wallet_address_qr: string;
		icp_deposits: string;
	};
	alt: { open_etherscan: string };
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

interface I18nReceive {
	text: { receive: string; address: string };
	icp: {
		text: {
			account_id: string;
			use_for_all_tokens: string;
			use_for_deposit: string;
			display_account_id_qr: string;
			account_id_copied: string;
		};
	};
	ckbtc: { text: { use_address_from_to: string } };
	cketh: { text: { use_address_from_to: string } };
	ethereum: {
		text: {
			checking_status: string;
			from_network: string;
			eth_to_cketh_description: string;
			learn_how_to_convert: string;
		};
	};
	bitcoin: {
		text: {
			checking_status: string;
			refresh_status: string;
			initializing: string;
			checking_incoming: string;
			refreshing_wallet: string;
			bitcoin_address: string;
			display_bitcoin_address_qr: string;
			bitcoin_address_copied: string;
			from_network: string;
			fee_applied: string;
		};
		info: { no_new_btc: string; check_btc_progress: string };
		error: { unexpected_btc: string };
	};
}

interface I18nSend {
	text: {
		send: string;
		destination: string;
		source: string;
		balance: string;
		review: string;
		approving: string;
		refreshing_ui: string;
		sending: string;
		signing: string;
		network: string;
		source_network: string;
		destination_network: string;
		initializing_transaction: string;
	};
	placeholder: {
		enter_eth_address: string;
		enter_recipient_address: string;
		enter_wallet_address: string;
	};
	info: { ckbtc_certified: string; cketh_certified: string };
	assertion: {
		invalid_destination_address: string;
		insufficient_funds: string;
		unknown_minimum_ckbtc_amount: string;
		unknown_minimum_cketh_amount: string;
		minimum_ckbtc_amount: string;
		minimum_cketh_amount: string;
		destination_address_invalid: string;
		amount_invalid: string;
	};
	error: { unexpected: string };
}

interface I18nConvert {
	text: {
		convert_to_btc: string;
		convert_to_eth: string;
		convert_to_cketh: string;
		convert_eth_to_cketh: string;
		how_to_convert_eth_to_cketh: string;
		send_eth: string;
		wait_eth_current_balance: string;
		set_amount: string;
	};
	error: { loading_cketh_helper: string };
}

interface I18nTokens {
	text: {
		title: string;
		add_new: string;
		contract_address: string;
		add: string;
		review: string;
		saving: string;
	};
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

interface I18nFee {
	text: {
		fee: string;
		estimated_btc: string;
		estimated_inter_network: string;
		estimated_eth: string;
	};
}

interface I18nInfo {
	bitcoin: { title: string; description: string; note: string; receive: string };
	ethereum: { title: string; description: string; how_to: string };
}

interface I18nWallet_connect {
	text: { name: string; session_proposal: string };
}

interface I18nTransaction {
	text: {
		details: string;
		id: string;
		id_copied: string;
		timestamp: string;
		type: string;
		from: string;
		from_copied: string;
		to: string;
		to_copied: string;
	};
	alt: {
		open_block_explorer: string;
		open_from_block_explorer: string;
		open_to_block_explorer: string;
	};
}

interface I18nTransactions {
	text: { title: string; no_transactions: string };
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
	receive: I18nReceive;
	send: I18nSend;
	convert: I18nConvert;
	tokens: I18nTokens;
	fee: I18nFee;
	info: I18nInfo;
	wallet_connect: I18nWallet_connect;
	transaction: I18nTransaction;
	transactions: I18nTransactions;
}
