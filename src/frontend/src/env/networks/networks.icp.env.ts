import { ICP_EXPLORER_URL } from '$env/explorers.env';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import icpIcon from '$lib/assets/networks/icp.svg';
import { LOCAL } from '$lib/constants/app.constants';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type { Network, NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';
import { Principal } from '@icp-sdk/core/principal';

export const ICP_LEDGER_CANISTER_ID =
	(LOCAL
		? (import.meta.env.VITE_LOCAL_ICP_LEDGER_CANISTER_ID as OptionCanisterIdText)
		: (import.meta.env.VITE_IC_ICP_LEDGER_CANISTER_ID as OptionCanisterIdText)) ??
	'ryjl3-tyaaa-aaaaa-aaaba-cai';

export const ICP_INDEX_CANISTER_ID =
	(LOCAL
		? (import.meta.env.VITE_LOCAL_ICP_INDEX_CANISTER_ID as OptionCanisterIdText)
		: (import.meta.env.VITE_IC_ICP_INDEX_CANISTER_ID as OptionCanisterIdText)) ??
	'qhbym-qaaaa-aaaaa-aaafq-cai';

export const ICP_MINTING_ACCOUNT = getIcrcAccount(
	Principal.fromText(
		(LOCAL
			? (import.meta.env.VITE_LOCAL_ICP_MINTING_ACCOUNT_PRINCIPAL_TEXT as OptionCanisterIdText)
			: (import.meta.env.VITE_IC_ICP_MINTING_ACCOUNT_PRINCIPAL_TEXT as OptionCanisterIdText)) ??
			'rrkah-fqaaa-aaaaa-aaaaq-cai'
	)
);

/**
 * ICP
 */
export const ICP_NETWORK_SYMBOL = 'ICP';

export const ICP_NETWORK_ID: NetworkId = parseNetworkId(ICP_NETWORK_SYMBOL);

export const ICP_NETWORK: Network = {
	id: ICP_NETWORK_ID,
	env: 'mainnet',
	name: 'Internet Computer',
	icon: icpIcon,
	explorerUrl: ICP_EXPLORER_URL,
	supportsNft: true,
	buy: { onramperId: 'icp' },
	pay: { openCryptoPay: 'Internet Computer' }
};

/**
 * ICP Pseudo Testnet Network
 *
 * This is a pseudo testnet network for ICP, used for testing/developing purposes.
 * It will be associated with what we call "testnet" tokens.
 * This allows us to simplify the filters of the token list and avoid polluting "real" ICP balance with the balances of the testnet tokens.
 */
export const ICP_PSEUDO_TESTNET_NETWORK_SYMBOL = 'ICP-PSEUDO-TESTNET';

export const ICP_PSEUDO_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(
	ICP_PSEUDO_TESTNET_NETWORK_SYMBOL
);

export const ICP_PSEUDO_TESTNET_NETWORK: Network = {
	id: ICP_PSEUDO_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'IC (testnet tokens)',
	icon: icpIcon,
	explorerUrl: ICP_EXPLORER_URL,
	supportsNft: true
};
