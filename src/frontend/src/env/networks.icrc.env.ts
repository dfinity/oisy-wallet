import {
	CKBTC_EXPLORER_URL,
	CKBTC_TESTNET_EXPLORER_URL,
	CKETH_EXPLORER_URL,
	CKETH_SEPOLIA_EXPLORER_URL
} from '$env/explorers.env';
import { EURC_TOKEN } from '$env/tokens-erc20/tokens.eurc.env';
import { LINK_TOKEN, SEPOLIA_LINK_TOKEN } from '$env/tokens-erc20/tokens.link.env';
import { OCT_TOKEN } from '$env/tokens-erc20/tokens.oct.env';
import { PEPE_TOKEN, SEPOLIA_PEPE_TOKEN } from '$env/tokens-erc20/tokens.pepe.env';
import { SHIB_TOKEN } from '$env/tokens-erc20/tokens.shib.env';
import { UNI_TOKEN } from '$env/tokens-erc20/tokens.uni.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens-erc20/tokens.usdt.env';
import { WBTC_TOKEN } from '$env/tokens-erc20/tokens.wbtc.env';
import { WSTETH_TOKEN } from '$env/tokens-erc20/tokens.wsteth.env';
import { XAUT_TOKEN } from '$env/tokens-erc20/tokens.xaut.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
import { ckErc20Production, ckErc20Staging } from '$env/tokens.ckerc20.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import type { EnvTokens } from '$env/types/env-token-ckerc20';
import type { EnvTokenSymbol } from '$env/types/env-token-common';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcCkInterface } from '$icp/types/ic';
import { BETA, LOCAL, PROD, STAGING } from '$lib/constants/app.constants';
import type { CanisterIdText, OptionCanisterIdText } from '$lib/types/canister';
import type { NetworkEnvironment } from '$lib/types/network';
import { nonNullish } from '@dfinity/utils';

export const IC_CKBTC_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_LEDGER_CANISTER_ID as OptionCanisterIdText) ??
	'mxzaz-hqaaa-aaaar-qaada-cai';

export const IC_CKBTC_INDEX_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_INDEX_CANISTER_ID as OptionCanisterIdText) ??
	'n5wcd-faaaa-aaaar-qaaea-cai';

export const IC_CKBTC_MINTER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_MINTER_CANISTER_ID as OptionCanisterIdText) ??
	'mqygn-kiaaa-aaaar-qaadq-cai';

export const STAGING_CKBTC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_LEDGER_CANISTER_ID as OptionCanisterIdText;
export const STAGING_CKBTC_INDEX_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_INDEX_CANISTER_ID as OptionCanisterIdText;
export const STAGING_CKBTC_MINTER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_MINTER_CANISTER_ID as OptionCanisterIdText;

export const LOCAL_CKBTC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKBTC_LEDGER_CANISTER_ID as OptionCanisterIdText;
export const LOCAL_CKBTC_INDEX_CANISTER_ID = import.meta.env.VITE_LOCAL_CKBTC_INDEX_CANISTER_ID as
	| CanisterIdText
	| null
	| undefined;
export const LOCAL_CKBTC_MINTER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKBTC_MINTER_CANISTER_ID as OptionCanisterIdText;

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
	(STAGING || BETA || PROD) &&
	nonNullish(STAGING_CKBTC_LEDGER_CANISTER_ID) &&
	nonNullish(STAGING_CKBTC_INDEX_CANISTER_ID) &&
	nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: STAGING_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: STAGING_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: STAGING_CKBTC_MINTER_CANISTER_ID,
				exchangeCoinId: 'bitcoin',
				position: 2,
				twinToken: BTC_TESTNET_TOKEN,
				explorerUrl: CKBTC_TESTNET_EXPLORER_URL
			}
		: undefined;

const CKBTC_IC_DATA: IcCkInterface | undefined =
	STAGING || BETA || PROD
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
				position: 3,
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
				position: 2,
				twinToken: SEPOLIA_TOKEN,
				explorerUrl: CKETH_SEPOLIA_EXPLORER_URL
			}
		: undefined;

const CKETH_IC_DATA: IcCkInterface | undefined =
	STAGING || BETA || PROD
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
	ledgerCanisterId,
	env
}: {
	ckErc20Tokens: EnvTokens;
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
			position: 2,
			twinToken: SEPOLIA_USDC_TOKEN
		}
	: undefined;

const CKLINK_STAGING_DATA: IcCkInterface | undefined = nonNullish(
	CKERC20_STAGING_DATA?.ckSepoliaLINK
)
	? {
			...CKERC20_STAGING_DATA.ckSepoliaLINK,
			position: 3,
			twinToken: SEPOLIA_LINK_TOKEN
		}
	: undefined;

const CKPEPE_STAGING_DATA: IcCkInterface | undefined = nonNullish(
	CKERC20_STAGING_DATA?.ckSepoliaPEPE
)
	? {
			...CKERC20_STAGING_DATA.ckSepoliaPEPE,
			position: 4,
			twinToken: SEPOLIA_PEPE_TOKEN
		}
	: undefined;

const CKUSDC_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckUSDC)
	? {
			...CKERC20_PRODUCTION_DATA.ckUSDC,
			position: 1,
			twinToken: USDC_TOKEN
		}
	: undefined;

const CKLINK_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckLINK)
	? {
			...CKERC20_PRODUCTION_DATA.ckLINK,
			position: 2,
			twinToken: LINK_TOKEN
		}
	: undefined;

const CKPEPE_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckPEPE)
	? {
			...CKERC20_PRODUCTION_DATA.ckPEPE,
			position: 3,
			twinToken: PEPE_TOKEN
		}
	: undefined;

const CKOCT_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckOCT)
	? {
			...CKERC20_PRODUCTION_DATA.ckOCT,
			position: 4,
			twinToken: OCT_TOKEN
		}
	: undefined;

const CKSHIB_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckSHIB)
	? {
			...CKERC20_PRODUCTION_DATA.ckSHIB,
			position: 5,
			twinToken: SHIB_TOKEN
		}
	: undefined;

const CKWBTC_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckWBTC)
	? {
			...CKERC20_PRODUCTION_DATA.ckWBTC,
			position: 6,
			twinToken: WBTC_TOKEN
		}
	: undefined;

const CKUSDT_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckUSDT)
	? {
			...CKERC20_PRODUCTION_DATA.ckUSDT,
			position: 7,
			twinToken: USDT_TOKEN
		}
	: undefined;

const CKWSTETH_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckWSTETH)
	? {
			...CKERC20_PRODUCTION_DATA.ckWSTETH,
			position: 8,
			twinToken: WSTETH_TOKEN
		}
	: undefined;

const CKUNI_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckUNI)
	? {
			...CKERC20_PRODUCTION_DATA.ckUNI,
			position: 9,
			twinToken: UNI_TOKEN
		}
	: undefined;

const CKEURC_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckEURC)
	? {
			...CKERC20_PRODUCTION_DATA.ckEURC,
			position: 10,
			twinToken: EURC_TOKEN
		}
	: undefined;

const CKXAUT_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckXAUT)
	? {
			...CKERC20_PRODUCTION_DATA.ckXAUT,
			position: 11,
			twinToken: XAUT_TOKEN
		}
	: undefined;

export const CKERC20_LEDGER_CANISTER_TESTNET_IDS: CanisterIdText[] = [
	...(nonNullish(LOCAL_CKUSDC_LEDGER_CANISTER_ID) ? [LOCAL_CKUSDC_LEDGER_CANISTER_ID] : []),
	...(nonNullish(CKUSDC_STAGING_DATA?.ledgerCanisterId)
		? [CKUSDC_STAGING_DATA.ledgerCanisterId]
		: []),
	...(nonNullish(CKLINK_STAGING_DATA?.ledgerCanisterId)
		? [CKLINK_STAGING_DATA.ledgerCanisterId]
		: []),
	...(nonNullish(CKPEPE_STAGING_DATA?.ledgerCanisterId)
		? [CKPEPE_STAGING_DATA.ledgerCanisterId]
		: [])
];

export const CKERC20_LEDGER_CANISTER_IC_IDS: CanisterIdText[] = [
	...(nonNullish(CKUSDC_IC_DATA?.ledgerCanisterId) ? [CKUSDC_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKLINK_IC_DATA?.ledgerCanisterId) ? [CKLINK_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKPEPE_IC_DATA?.ledgerCanisterId) ? [CKPEPE_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKOCT_IC_DATA?.ledgerCanisterId) ? [CKOCT_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKSHIB_IC_DATA?.ledgerCanisterId) ? [CKSHIB_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKWBTC_IC_DATA?.ledgerCanisterId) ? [CKWBTC_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKUSDT_IC_DATA?.ledgerCanisterId) ? [CKUSDT_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKWSTETH_IC_DATA?.ledgerCanisterId) ? [CKWSTETH_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKUNI_IC_DATA?.ledgerCanisterId) ? [CKUNI_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKEURC_IC_DATA?.ledgerCanisterId) ? [CKEURC_IC_DATA.ledgerCanisterId] : []),
	...(nonNullish(CKXAUT_IC_DATA?.ledgerCanisterId) ? [CKXAUT_IC_DATA.ledgerCanisterId] : [])
];

export const CKERC20_LEDGER_CANISTER_IDS: CanisterIdText[] = [
	...CKERC20_LEDGER_CANISTER_IC_IDS,
	...CKERC20_LEDGER_CANISTER_TESTNET_IDS
];

/**
 * All ICRC tokens data
 */

// The subset of the ICRC tokens that are also displayed if the user is not signed in.
export const PUBLIC_ICRC_TOKENS: IcCkInterface[] = [
	...(nonNullish(CKBTC_IC_DATA) ? [CKBTC_IC_DATA] : []),
	...(nonNullish(CKETH_IC_DATA) ? [CKETH_IC_DATA] : []),
	...(nonNullish(CKUSDC_IC_DATA) ? [CKUSDC_IC_DATA] : [])
];

export const ICRC_TOKENS: IcCkInterface[] = [
	...PUBLIC_ICRC_TOKENS,
	...(nonNullish(CKBTC_LOCAL_DATA) ? [CKBTC_LOCAL_DATA] : []),
	...(nonNullish(CKBTC_STAGING_DATA) ? [CKBTC_STAGING_DATA] : []),
	...(nonNullish(CKETH_LOCAL_DATA) ? [CKETH_LOCAL_DATA] : []),
	...(nonNullish(CKETH_STAGING_DATA) ? [CKETH_STAGING_DATA] : []),
	...(nonNullish(CKUSDC_LOCAL_DATA) ? [CKUSDC_LOCAL_DATA] : []),
	...(nonNullish(CKUSDC_STAGING_DATA) ? [CKUSDC_STAGING_DATA] : []),
	...(nonNullish(CKLINK_STAGING_DATA) ? [CKLINK_STAGING_DATA] : []),
	...(nonNullish(CKLINK_IC_DATA) ? [CKLINK_IC_DATA] : []),
	...(nonNullish(CKPEPE_IC_DATA) ? [CKPEPE_IC_DATA] : []),
	...(nonNullish(CKPEPE_STAGING_DATA) ? [CKPEPE_STAGING_DATA] : []),
	...(nonNullish(CKOCT_IC_DATA) ? [CKOCT_IC_DATA] : []),
	...(nonNullish(CKSHIB_IC_DATA) ? [CKSHIB_IC_DATA] : []),
	...(nonNullish(CKWBTC_IC_DATA) ? [CKWBTC_IC_DATA] : []),
	...(nonNullish(CKUSDT_IC_DATA) ? [CKUSDT_IC_DATA] : []),
	...(nonNullish(CKWSTETH_IC_DATA) ? [CKWSTETH_IC_DATA] : []),
	...(nonNullish(CKUNI_IC_DATA) ? [CKUNI_IC_DATA] : []),
	...(nonNullish(CKEURC_IC_DATA) ? [CKEURC_IC_DATA] : []),
	...(nonNullish(CKXAUT_IC_DATA) ? [CKXAUT_IC_DATA] : [])
];

export const ICRC_TOKENS_LEDGER_CANISTER_IDS: LedgerCanisterIdText[] = ICRC_TOKENS.map(
	({ ledgerCanisterId }) => ledgerCanisterId
);

export const ICRC_LEDGER_CANISTER_TESTNET_IDS = [
	...CKBTC_LEDGER_CANISTER_TESTNET_IDS,
	...CKETH_LEDGER_CANISTER_TESTNET_IDS,
	...CKERC20_LEDGER_CANISTER_TESTNET_IDS
];

// On Chain Fusion view, we want to display ICP, Ethereum and selected CK tokens.
export const ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS = [
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKETH_LEDGER_CANISTER_ID,
	...(nonNullish(CKERC20_PRODUCTION_DATA?.ckUSDC)
		? [CKERC20_PRODUCTION_DATA.ckUSDC.ledgerCanisterId]
		: [])
];
