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

const CKLINK_STAGING_DATA: IcCkInterface | undefined = nonNullish(
	CKERC20_STAGING_DATA?.ckSepoliaLINK
)
	? {
			...CKERC20_STAGING_DATA.ckSepoliaLINK,
			twinToken: SEPOLIA_LINK_TOKEN
		}
	: undefined;

const CKPEPE_STAGING_DATA: IcCkInterface | undefined = nonNullish(
	CKERC20_STAGING_DATA?.ckSepoliaPEPE
)
	? {
			...CKERC20_STAGING_DATA.ckSepoliaPEPE,
			twinToken: SEPOLIA_PEPE_TOKEN
		}
	: undefined;

export const CKUSDC_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckUSDC)
	? {
			...CKERC20_PRODUCTION_DATA.ckUSDC,
			twinToken: USDC_TOKEN,
			groupData: USDC_TOKEN_GROUP
		}
	: undefined;

export const IC_CKUSDC_LEDGER_CANISTER_ID = nonNullish(CKUSDC_IC_DATA)
	? CKUSDC_IC_DATA.ledgerCanisterId
	: undefined;

const CKLINK_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckLINK)
	? {
			...CKERC20_PRODUCTION_DATA.ckLINK,
			twinToken: LINK_TOKEN,
			groupData: LINK_TOKEN_GROUP
		}
	: undefined;

const CKPEPE_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckPEPE)
	? {
			...CKERC20_PRODUCTION_DATA.ckPEPE,
			twinToken: PEPE_TOKEN,
			groupData: PEPE_TOKEN_GROUP
		}
	: undefined;

const CKOCT_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckOCT)
	? {
			...CKERC20_PRODUCTION_DATA.ckOCT,
			twinToken: OCT_TOKEN,
			groupData: OCT_TOKEN_GROUP
		}
	: undefined;

const CKSHIB_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckSHIB)
	? {
			...CKERC20_PRODUCTION_DATA.ckSHIB,
			twinToken: SHIB_TOKEN,
			groupData: SHIB_TOKEN_GROUP
		}
	: undefined;

const CKWBTC_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckWBTC)
	? {
			...CKERC20_PRODUCTION_DATA.ckWBTC,
			twinToken: WBTC_TOKEN,
			groupData: WBTC_TOKEN_GROUP
		}
	: undefined;

const CKUSDT_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckUSDT)
	? {
			...CKERC20_PRODUCTION_DATA.ckUSDT,
			twinToken: USDT_TOKEN,
			groupData: USDT_TOKEN_GROUP
		}
	: undefined;

export const IC_CKUSDT_LEDGER_CANISTER_ID = nonNullish(CKUSDT_IC_DATA)
	? CKUSDT_IC_DATA.ledgerCanisterId
	: undefined;

const CKWSTETH_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckWSTETH)
	? {
			...CKERC20_PRODUCTION_DATA.ckWSTETH,
			twinToken: WSTETH_TOKEN,
			groupData: WSTETH_TOKEN_GROUP
		}
	: undefined;

const CKUNI_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckUNI)
	? {
			...CKERC20_PRODUCTION_DATA.ckUNI,
			twinToken: UNI_TOKEN,
			groupData: UNI_TOKEN_GROUP
		}
	: undefined;

const CKEURC_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckEURC)
	? {
			...CKERC20_PRODUCTION_DATA.ckEURC,
			twinToken: EURC_TOKEN,
			groupData: EURC_TOKEN_GROUP
		}
	: undefined;

const CKXAUT_IC_DATA: IcCkInterface | undefined = nonNullish(CKERC20_PRODUCTION_DATA?.ckXAUT)
	? {
			...CKERC20_PRODUCTION_DATA.ckXAUT,
			twinToken: XAUT_TOKEN,
			groupData: XAUT_TOKEN_GROUP
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

export const ICRC_CK_ETH_TOKENS: IcInterface[] = [
	...(nonNullish(CKETH_LOCAL_DATA) ? [CKETH_LOCAL_DATA] : []),
	...(nonNullish(CKETH_STAGING_DATA) ? [CKETH_STAGING_DATA] : [])
];

export const ICRC_CK_ERC20_TOKENS: IcInterface[] = [
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
