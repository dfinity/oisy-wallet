import { CKETH_EXPLORER_URL, CKETH_SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import { ETH_TOKEN_GROUP } from '$env/tokens/groups/groups.eth.env';
import { EURC_TOKEN_GROUP } from '$env/tokens/groups/groups.eurc.env';
import { LINK_TOKEN_GROUP } from '$env/tokens/groups/groups.link.env';
import { OCT_TOKEN_GROUP } from '$env/tokens/groups/groups.oct.env';
import { PEPE_TOKEN_GROUP } from '$env/tokens/groups/groups.pepe.env';
import { SHIB_TOKEN_GROUP } from '$env/tokens/groups/groups.shib.env';
import { UNI_TOKEN_GROUP } from '$env/tokens/groups/groups.uni.env';
import { USDC_TOKEN_GROUP } from '$env/tokens/groups/groups.usdc.env';
import { USDT_TOKEN_GROUP } from '$env/tokens/groups/groups.usdt.env';
import { WBTC_TOKEN_GROUP } from '$env/tokens/groups/groups.wbtc.env';
import { WSTETH_TOKEN_GROUP } from '$env/tokens/groups/groups.wsteth.env';
import { XAUT_TOKEN_GROUP } from '$env/tokens/groups/groups.xaut.env';
import { EURC_TOKEN } from '$env/tokens/tokens-erc20/tokens.eurc.env';
import { LINK_TOKEN, SEPOLIA_LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { OCT_TOKEN } from '$env/tokens/tokens-erc20/tokens.oct.env';
import { PEPE_TOKEN, SEPOLIA_PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { SHIB_TOKEN } from '$env/tokens/tokens-erc20/tokens.shib.env';
import { UNI_TOKEN } from '$env/tokens/tokens-erc20/tokens.uni.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { WBTC_TOKEN } from '$env/tokens/tokens-erc20/tokens.wbtc.env';
import { WSTETH_TOKEN } from '$env/tokens/tokens-erc20/tokens.wsteth.env';
import { XAUT_TOKEN } from '$env/tokens/tokens-erc20/tokens.xaut.env';
import { ckErc20Production, ckErc20Staging } from '$env/tokens/tokens.ckerc20.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import type { EnvCkErc20Tokens } from '$env/types/env-token-ckerc20';
import type { EnvTokenSymbol } from '$env/types/env-token-common';
import type { IcCkInterface, IcInterface } from '$icp/types/ic-token';
import { BETA, LOCAL, PROD, STAGING } from '$lib/constants/app.constants';
import type { CanisterIdText, OptionCanisterIdText } from '$lib/types/canister';
import type { NetworkEnvironment } from '$lib/types/network';
import type { NonEmptyArray } from '$lib/types/utils';
import { nonNullish } from '@dfinity/utils';

/**
 * ckETH
 */

export const IC_CKETH_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKETH_LEDGER_CANISTER_ID as OptionCanisterIdText) ??
	'ss2fx-dyaaa-aaaar-qacoq-cai';

export const IC_CKETH_INDEX_CANISTER_ID =
	(import.meta.env.VITE_IC_CKETH_INDEX_CANISTER_ID as OptionCanisterIdText) ??
	's3zol-vqaaa-aaaar-qacpa-cai';

export const IC_CKETH_MINTER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKETH_MINTER_CANISTER_ID as OptionCanisterIdText) ??
	'sv3dd-oaaaa-aaaar-qacoa-cai';

export const STAGING_CKETH_LEDGER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKETH_LEDGER_CANISTER_ID as OptionCanisterIdText;

export const STAGING_CKETH_INDEX_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKETH_INDEX_CANISTER_ID as OptionCanisterIdText;

export const STAGING_CKETH_MINTER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKETH_MINTER_CANISTER_ID as OptionCanisterIdText;

export const LOCAL_CKETH_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKETH_LEDGER_CANISTER_ID as OptionCanisterIdText;

export const LOCAL_CKETH_INDEX_CANISTER_ID = import.meta.env.VITE_LOCAL_CKETH_INDEX_CANISTER_ID as
	| CanisterIdText
	| null
	| undefined;

export const LOCAL_CKETH_MINTER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKETH_MINTER_CANISTER_ID as OptionCanisterIdText;

const CKETH_LOCAL_DATA: IcCkInterface | undefined =
	LOCAL &&
	nonNullish(LOCAL_CKETH_LEDGER_CANISTER_ID) &&
	nonNullish(LOCAL_CKETH_INDEX_CANISTER_ID) &&
	nonNullish(LOCAL_CKETH_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: LOCAL_CKETH_LEDGER_CANISTER_ID,
				indexCanisterId: LOCAL_CKETH_INDEX_CANISTER_ID,
				minterCanisterId: LOCAL_CKETH_MINTER_CANISTER_ID,
				exchangeCoinId: 'ethereum',
				twinToken: SEPOLIA_TOKEN
			}
		: undefined;

const CKETH_STAGING_DATA: IcCkInterface | undefined =
	(STAGING || BETA || PROD) &&
	nonNullish(STAGING_CKETH_LEDGER_CANISTER_ID) &&
	nonNullish(STAGING_CKETH_INDEX_CANISTER_ID) &&
	nonNullish(STAGING_CKETH_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: STAGING_CKETH_LEDGER_CANISTER_ID,
				indexCanisterId: STAGING_CKETH_INDEX_CANISTER_ID,
				minterCanisterId: STAGING_CKETH_MINTER_CANISTER_ID,
				exchangeCoinId: 'ethereum',
				twinToken: SEPOLIA_TOKEN,
				explorerUrl: CKETH_SEPOLIA_EXPLORER_URL
			}
		: undefined;

export const CKETH_IC_DATA: IcCkInterface | undefined =
	STAGING || BETA || PROD
		? {
				ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
				indexCanisterId: IC_CKETH_INDEX_CANISTER_ID,
				minterCanisterId: IC_CKETH_MINTER_CANISTER_ID,
				exchangeCoinId: 'ethereum',
				twinToken: ETHEREUM_TOKEN,
				groupData: ETH_TOKEN_GROUP,
				explorerUrl: CKETH_EXPLORER_URL
			}
		: undefined;

export const CKETH_LEDGER_CANISTER_TESTNET_IDS: CanisterIdText[] = [
	...(nonNullish(STAGING_CKETH_LEDGER_CANISTER_ID) ? [STAGING_CKETH_LEDGER_CANISTER_ID] : []),
	...(nonNullish(LOCAL_CKETH_LEDGER_CANISTER_ID) ? [LOCAL_CKETH_LEDGER_CANISTER_ID] : [])
];

export const CKETH_LEDGER_CANISTER_IDS: NonEmptyArray<CanisterIdText> = [
	IC_CKETH_LEDGER_CANISTER_ID,
	...CKETH_LEDGER_CANISTER_TESTNET_IDS
];

/**
 * ckERC20
 */

export const LOCAL_CKUSDC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKUSDC_LEDGER_CANISTER_ID as OptionCanisterIdText;

export const LOCAL_CKUSDC_INDEX_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKUSDC_INDEX_CANISTER_ID as OptionCanisterIdText;

const CKUSDC_LOCAL_DATA: IcCkInterface | undefined =
	LOCAL &&
	nonNullish(LOCAL_CKUSDC_LEDGER_CANISTER_ID) &&
	nonNullish(LOCAL_CKUSDC_INDEX_CANISTER_ID) &&
	nonNullish(LOCAL_CKETH_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: LOCAL_CKUSDC_LEDGER_CANISTER_ID,
				indexCanisterId: LOCAL_CKUSDC_INDEX_CANISTER_ID,
				minterCanisterId: LOCAL_CKETH_MINTER_CANISTER_ID,
				exchangeCoinId: 'ethereum',
				twinToken: SEPOLIA_USDC_TOKEN,
				...(nonNullish(LOCAL_CKETH_LEDGER_CANISTER_ID) && {
					feeLedgerCanisterId: LOCAL_CKETH_LEDGER_CANISTER_ID
				})
			}
		: undefined;

const mapCkErc20Data = ({
	ckErc20Tokens,
	minterCanisterId,
	ledgerCanisterId,
	env
}: {
	ckErc20Tokens: EnvCkErc20Tokens;
	minterCanisterId: OptionCanisterIdText;
	ledgerCanisterId: OptionCanisterIdText;
	env: NetworkEnvironment;
}): Record<EnvTokenSymbol, Omit<IcCkInterface, 'twinToken' | 'position'>> =>
	Object.entries(ckErc20Tokens).reduce(
		(acc, [key, value]) => ({
			...acc,
			...((STAGING || BETA || PROD) &&
				nonNullish(value) &&
				nonNullish(minterCanisterId) && {
					[key]: {
						...value,
						minterCanisterId,
						exchangeCoinId: 'ethereum',
						explorerUrl: `${env === 'testnet' ? CKETH_SEPOLIA_EXPLORER_URL : CKETH_EXPLORER_URL}/${value.ledgerCanisterId}`,
						...(nonNullish(ledgerCanisterId) && {
							feeLedgerCanisterId: ledgerCanisterId
						})
					}
				})
		}),
		{}
	);

const CKERC20_STAGING_DATA = mapCkErc20Data({
	ckErc20Tokens: ckErc20Staging,
	minterCanisterId: STAGING_CKETH_MINTER_CANISTER_ID,
	ledgerCanisterId: STAGING_CKETH_LEDGER_CANISTER_ID,
	env: 'testnet'
});

const CKERC20_PRODUCTION_DATA = mapCkErc20Data({
	ckErc20Tokens: ckErc20Production,
	minterCanisterId: IC_CKETH_MINTER_CANISTER_ID,
	ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
	env: 'mainnet'
});

const CKUSDC_STAGING_DATA: IcCkInterface | undefined = nonNullish(
	CKERC20_STAGING_DATA?.ckSepoliaUSDC
)
	? {
			...CKERC20_STAGING_DATA.ckSepoliaUSDC,
			twinToken: SEPOLIA_USDC_TOKEN
		}
	: undefined;














export const ICRC_CK_ETH_TOKENS: IcInterface[] = [
	...(nonNullish(CKETH_LOCAL_DATA) ? [CKETH_LOCAL_DATA] : []),
	...(nonNullish(CKETH_STAGING_DATA) ? [CKETH_STAGING_DATA] : [])
];



