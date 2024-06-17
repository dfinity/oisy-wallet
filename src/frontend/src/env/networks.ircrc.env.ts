import { CKBTC_EXPLORER_URL, CKETH_EXPLORER_URL } from '$env/explorers.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
import ckErc20Tokens from '$env/tokens.ckerc20.json';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens.erc20.env';
import {
	envTokensCkErc20,
	type EnvTokenSymbol,
	type EnvTokens
} from '$icp/types/env-token-ckerc20';
import type { IcCkInterface } from '$icp/types/ic';
import { LOCAL, PROD, STAGING } from '$lib/constants/app.constants';
import type { CanisterIdText } from '$lib/types/canister';
import { nonNullish } from '@dfinity/utils';

export const IC_CKBTC_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_LEDGER_CANISTER_ID as CanisterIdText | null | undefined) ??
	'mxzaz-hqaaa-aaaar-qaada-cai';

export const IC_CKBTC_INDEX_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_INDEX_CANISTER_ID as CanisterIdText | null | undefined) ??
	'n5wcd-faaaa-aaaar-qaaea-cai';

export const IC_CKBTC_MINTER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_MINTER_CANISTER_ID as CanisterIdText | null | undefined) ??
	'mqygn-kiaaa-aaaar-qaadq-cai';

export const STAGING_CKBTC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_LEDGER_CANISTER_ID as CanisterIdText | null | undefined;
export const STAGING_CKBTC_INDEX_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_INDEX_CANISTER_ID as CanisterIdText | null | undefined;
export const STAGING_CKBTC_MINTER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_MINTER_CANISTER_ID as CanisterIdText | null | undefined;

export const LOCAL_CKBTC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKBTC_LEDGER_CANISTER_ID as CanisterIdText | null | undefined;
export const LOCAL_CKBTC_INDEX_CANISTER_ID = import.meta.env.VITE_LOCAL_CKBTC_INDEX_CANISTER_ID as
	| CanisterIdText
	| null
	| undefined;
export const LOCAL_CKBTC_MINTER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKBTC_MINTER_CANISTER_ID as CanisterIdText | null | undefined;

const CKBTC_LOCAL_DATA: IcCkInterface | undefined =
	LOCAL &&
	nonNullish(LOCAL_CKBTC_LEDGER_CANISTER_ID) &&
	nonNullish(LOCAL_CKBTC_INDEX_CANISTER_ID) &&
	nonNullish(LOCAL_CKBTC_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: LOCAL_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: LOCAL_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: LOCAL_CKBTC_MINTER_CANISTER_ID,
				exchangeCoinId: 'bitcoin',
				position: 3,
				twinToken: BTC_TESTNET_TOKEN
			}
		: undefined;

const CKBTC_STAGING_DATA: IcCkInterface | undefined =
	(STAGING || PROD) &&
	nonNullish(STAGING_CKBTC_LEDGER_CANISTER_ID) &&
	nonNullish(STAGING_CKBTC_INDEX_CANISTER_ID) &&
	nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: STAGING_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: STAGING_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: STAGING_CKBTC_MINTER_CANISTER_ID,
				exchangeCoinId: 'bitcoin',
				position: 2,
				twinToken: BTC_TESTNET_TOKEN
			}
		: undefined;

const CKBTC_IC_DATA: IcCkInterface | undefined =
	STAGING || PROD
		? {
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
				exchangeCoinId: 'bitcoin',
				position: 1,
				twinToken: BTC_MAINNET_TOKEN,
				explorerUrl: CKBTC_EXPLORER_URL
			}
		: undefined;

export const CKBTC_LEDGER_CANISTER_TESTNET_IDS: CanisterIdText[] = [
	...(nonNullish(STAGING_CKBTC_LEDGER_CANISTER_ID) ? [STAGING_CKBTC_LEDGER_CANISTER_ID] : []),
	...(nonNullish(LOCAL_CKBTC_LEDGER_CANISTER_ID) ? [LOCAL_CKBTC_LEDGER_CANISTER_ID] : [])
];

export const CKBTC_LEDGER_CANISTER_IDS: [CanisterIdText, ...CanisterIdText[]] = [
	IC_CKBTC_LEDGER_CANISTER_ID,
	...CKBTC_LEDGER_CANISTER_TESTNET_IDS
];

/**
 * ckETH
 */

export const IC_CKETH_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKETH_LEDGER_CANISTER_ID as CanisterIdText | null | undefined) ??
	'ss2fx-dyaaa-aaaar-qacoq-cai';

export const IC_CKETH_INDEX_CANISTER_ID =
	(import.meta.env.VITE_IC_CKETH_INDEX_CANISTER_ID as CanisterIdText | null | undefined) ??
	's3zol-vqaaa-aaaar-qacpa-cai';

export const IC_CKETH_MINTER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKETH_MINTER_CANISTER_ID as CanisterIdText | null | undefined) ??
	'sv3dd-oaaaa-aaaar-qacoa-cai';

export const STAGING_CKETH_LEDGER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKETH_LEDGER_CANISTER_ID as CanisterIdText | null | undefined;
export const STAGING_CKETH_INDEX_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKETH_INDEX_CANISTER_ID as CanisterIdText | null | undefined;
export const STAGING_CKETH_MINTER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKETH_MINTER_CANISTER_ID as CanisterIdText | null | undefined;

export const LOCAL_CKETH_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKETH_LEDGER_CANISTER_ID as CanisterIdText | null | undefined;
export const LOCAL_CKETH_INDEX_CANISTER_ID = import.meta.env.VITE_LOCAL_CKETH_INDEX_CANISTER_ID as
	| CanisterIdText
	| null
	| undefined;
export const LOCAL_CKETH_MINTER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKETH_MINTER_CANISTER_ID as CanisterIdText | null | undefined;

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
				position: 3,
				twinToken: SEPOLIA_TOKEN
			}
		: undefined;

const CKETH_STAGING_DATA: IcCkInterface | undefined =
	(STAGING || PROD) &&
	nonNullish(STAGING_CKETH_LEDGER_CANISTER_ID) &&
	nonNullish(STAGING_CKETH_INDEX_CANISTER_ID) &&
	nonNullish(STAGING_CKETH_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: STAGING_CKETH_LEDGER_CANISTER_ID,
				indexCanisterId: STAGING_CKETH_INDEX_CANISTER_ID,
				minterCanisterId: STAGING_CKETH_MINTER_CANISTER_ID,
				exchangeCoinId: 'ethereum',
				position: 2,
				twinToken: SEPOLIA_TOKEN
			}
		: undefined;

const CKETH_IC_DATA: IcCkInterface | undefined =
	STAGING || PROD
		? {
				ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
				indexCanisterId: IC_CKETH_INDEX_CANISTER_ID,
				minterCanisterId: IC_CKETH_MINTER_CANISTER_ID,
				exchangeCoinId: 'ethereum',
				position: 1,
				twinToken: ETHEREUM_TOKEN,
				explorerUrl: CKETH_EXPLORER_URL
			}
		: undefined;

export const CKETH_LEDGER_CANISTER_TESTNET_IDS: CanisterIdText[] = [
	...(nonNullish(STAGING_CKETH_LEDGER_CANISTER_ID) ? [STAGING_CKETH_LEDGER_CANISTER_ID] : []),
	...(nonNullish(LOCAL_CKETH_LEDGER_CANISTER_ID) ? [LOCAL_CKETH_LEDGER_CANISTER_ID] : [])
];

export const CKETH_LEDGER_CANISTER_IDS: [CanisterIdText, ...CanisterIdText[]] = [
	IC_CKETH_LEDGER_CANISTER_ID,
	...CKETH_LEDGER_CANISTER_TESTNET_IDS
];

/**
 * ckERC20
 */

const ckErc20 = envTokensCkErc20.safeParse(ckErc20Tokens);

const { production: ckErc20Production, staging: ckErc20Staging } = ckErc20.success
	? ckErc20.data
	: { production: {}, staging: {} };

export const LOCAL_CKUSDC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKUSDC_LEDGER_CANISTER_ID as CanisterIdText | null | undefined;
export const LOCAL_CKUSDC_INDEX_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKUSDC_INDEX_CANISTER_ID as CanisterIdText | null | undefined;

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
				position: 3,
				twinToken: SEPOLIA_USDC_TOKEN,
				...(nonNullish(LOCAL_CKETH_LEDGER_CANISTER_ID) && {
					feeLedgerCanisterId: LOCAL_CKETH_LEDGER_CANISTER_ID
				})
			}
		: undefined;

const mapCkErc20Data = ({
	ckErc20Tokens,
	minterCanisterId,
	ledgerCanisterId
}: {
	ckErc20Tokens: EnvTokens;
	minterCanisterId: string | null | undefined;
	ledgerCanisterId: string | null | undefined;
}): Record<EnvTokenSymbol, Omit<IcCkInterface, 'twinToken' | 'position'>> =>
	Object.entries(ckErc20Tokens).reduce(
		(acc, [key, value]) => ({
			...acc,
			...(nonNullish(value) &&
				nonNullish(minterCanisterId) && {
					[key]: {
						...value,
						minterCanisterId,
						exchangeCoinId: 'ethereum',
						explorerUrl: `${CKETH_EXPLORER_URL}/${value.ledgerCanisterId}`,
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
	ledgerCanisterId: STAGING_CKETH_LEDGER_CANISTER_ID
});

const CKERC20_PRODUCTION_DATA = mapCkErc20Data({
	ckErc20Tokens: ckErc20Production,
	minterCanisterId: IC_CKETH_MINTER_CANISTER_ID,
	ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID
});

const CKUSDC_STAGING_DATA: IcCkInterface | undefined =
	(STAGING || PROD) && nonNullish(CKERC20_STAGING_DATA?.ckSepoliaUSDC)
		? {
				...CKERC20_STAGING_DATA.ckSepoliaUSDC,
				position: 2,
				twinToken: SEPOLIA_USDC_TOKEN
			}
		: undefined;

const CKUSDC_IC_DATA: IcCkInterface | undefined =
	(STAGING || PROD) && nonNullish(CKERC20_PRODUCTION_DATA?.ckUSDC)
		? {
				...CKERC20_PRODUCTION_DATA.ckUSDC,
				position: 1,
				twinToken: USDC_TOKEN
			}
		: undefined;

export const CKUSDC_LEDGER_CANISTER_TESTNET_IDS: CanisterIdText[] = [
	...(nonNullish(CKUSDC_STAGING_DATA?.ledgerCanisterId)
		? [CKUSDC_STAGING_DATA.ledgerCanisterId]
		: []),
	...(nonNullish(LOCAL_CKUSDC_LEDGER_CANISTER_ID) ? [LOCAL_CKUSDC_LEDGER_CANISTER_ID] : [])
];

export const CKERC20_LEDGER_CANISTER_IDS: CanisterIdText[] = [
	...(nonNullish(CKUSDC_IC_DATA?.ledgerCanisterId) ? [CKUSDC_IC_DATA.ledgerCanisterId] : []),
	...CKUSDC_LEDGER_CANISTER_TESTNET_IDS
];

/**
 * All ICRC tokens data
 */

export const ICRC_TOKENS: IcCkInterface[] = [
	...(nonNullish(CKBTC_LOCAL_DATA) ? [CKBTC_LOCAL_DATA] : []),
	...(nonNullish(CKBTC_STAGING_DATA) ? [CKBTC_STAGING_DATA] : []),
	...(nonNullish(CKBTC_IC_DATA) ? [CKBTC_IC_DATA] : []),
	...(nonNullish(CKETH_LOCAL_DATA) ? [CKETH_LOCAL_DATA] : []),
	...(nonNullish(CKETH_STAGING_DATA) ? [CKETH_STAGING_DATA] : []),
	...(nonNullish(CKETH_IC_DATA) ? [CKETH_IC_DATA] : []),
	...(nonNullish(CKUSDC_LOCAL_DATA) ? [CKUSDC_LOCAL_DATA] : []),
	...(nonNullish(CKUSDC_STAGING_DATA) ? [CKUSDC_STAGING_DATA] : []),
	...(nonNullish(CKUSDC_IC_DATA) ? [CKUSDC_IC_DATA] : [])
];

export const ICRC_LEDGER_CANISTER_TESTNET_IDS = [
	...CKBTC_LEDGER_CANISTER_TESTNET_IDS,
	...CKETH_LEDGER_CANISTER_TESTNET_IDS,
	...CKUSDC_LEDGER_CANISTER_TESTNET_IDS
];
