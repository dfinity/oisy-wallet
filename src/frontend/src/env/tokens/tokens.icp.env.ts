import { ICP_EXPLORER_URL } from '$env/explorers.env';
import {
	ICP_INDEX_CANISTER_ID,
	ICP_LEDGER_CANISTER_ID,
	ICP_NETWORK,
	ICP_PSEUDO_TESTNET_NETWORK
} from '$env/networks/networks.icp.env';
import icpLight from '$icp/assets/icp-light.svg';
import { ICP_TRANSACTION_FEE_E8S } from '$icp/constants/icp.constants';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcToken } from '$icp/types/ic-token';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';

/**
 * ICP
 */
export const ICP_SYMBOL = 'ICP';

export const ICP_TOKEN_ID: TokenId = parseTokenId(ICP_SYMBOL);

export const ICP_TOKEN: RequiredToken<Omit<IcToken, 'deprecated'>> = {
	id: ICP_TOKEN_ID,
	network: ICP_NETWORK,
	standard: 'icp',
	category: 'default',
	exchangeCoinId: 'internet-computer',
	position: 0,
	name: 'Internet Computer',
	symbol: ICP_SYMBOL,
	decimals: 8,
	icon: icpLight,
	fee: ICP_TRANSACTION_FEE_E8S,
	ledgerCanisterId: ICP_LEDGER_CANISTER_ID,
	indexCanisterId: ICP_INDEX_CANISTER_ID,
	explorerUrl: ICP_EXPLORER_URL,
	buy: {
		onramperId: 'icp_icp'
	}
};

/**
 * TESTICP
 */
export const TESTICP_SYMBOL = 'TESTICP';

export const TESTICP_TOKEN_ID: TokenId = parseTokenId(TESTICP_SYMBOL);

export const TESTICP_TOKEN: RequiredToken<Omit<IcToken, 'deprecated' | 'explorerUrl'>> = {
	id: TESTICP_TOKEN_ID,
	network: ICP_PSEUDO_TESTNET_NETWORK,
	standard: 'icp',
	category: 'default',,
	exchangeCoinId: 'test-internet-computer',
	position: 0,
	name: 'Test ICP',
	symbol: TESTICP_SYMBOL,
	decimals: 8,
	icon: icpLight,
	fee: 10_000n,
	ledgerCanisterId: 'xafvr-biaaa-aaaai-aql5q-cai',
	indexCanisterId: 'qcuy6-bqaaa-aaaai-aqmqq-cai'
};

export const SUPPORTED_ICP_TOKENS: RequiredToken<Omit<IcToken, 'deprecated' | 'explorerUrl'>>[] =
	defineSupportedTokens({
		mainnetFlag: true,
		mainnetTokens: [ICP_TOKEN],
		testnetTokens: [TESTICP_TOKEN]
	});

export const SUPPORTED_ICP_LEDGER_CANISTER_IDS: LedgerCanisterIdText[] = SUPPORTED_ICP_TOKENS.map(
	({ ledgerCanisterId }) => ledgerCanisterId
);

export const ICP_LEDGER_CANISTER_TESTNET_IDS: LedgerCanisterIdText[] = [
	TESTICP_TOKEN.ledgerCanisterId
];
