import { parseBoolEnvVar } from '$lib/utils/env.utils';
import { Principal } from '@dfinity/principal';
import { nonNullish } from '@dfinity/utils';

export const APP_VERSION = VITE_APP_VERSION;

export const MODE = VITE_DFX_NETWORK;
export const LOCAL = MODE === 'local';
export const TEST_FE = MODE.startsWith('test_fe_');
export const AUDIT = MODE === 'audit';
export const E2E = MODE === 'e2e';
export const STAGING = MODE === 'staging' || TEST_FE || AUDIT || E2E;
export const BETA = MODE === 'beta';
export const PROD = MODE === 'ic';

export const TEST = parseBoolEnvVar(import.meta.env.TEST);

const MAINNET_DOMAIN = 'icp0.io';

export const REPLICA_HOST = LOCAL ? 'http://localhost:4943/' : 'https://icp-api.io';

export const INTERNET_IDENTITY_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_INTERNET_IDENTITY_CANISTER_ID
	: undefined;

export const INTERNET_IDENTITY_ORIGIN = LOCAL
	? `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`
	: 'https://identity.internetcomputer.org';

export const POUH_ISSUER_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_POUH_ISSUER_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_POUH_ISSUER_CANISTER_ID
		: BETA
			? import.meta.env.VITE_BETA_POUH_ISSUER_CANISTER_ID
			: PROD
				? import.meta.env.VITE_IC_POUH_ISSUER_CANISTER_ID
				: undefined;

export const POUH_ISSUER_ORIGIN = nonNullish(POUH_ISSUER_CANISTER_ID)
	? LOCAL
		? `http://${POUH_ISSUER_CANISTER_ID}.localhost:4943`
		: STAGING
			? `https://${POUH_ISSUER_CANISTER_ID}.${MAINNET_DOMAIN}`
			: // BETA and PROD
				'https://id.decideai.xyz'
	: undefined;

export const BACKEND_CANISTER_ID = "jloto-byaaa-aaaap-anryq-cai"
export const BACKEND_CANISTER_PRINCIPAL = Principal.fromText(BACKEND_CANISTER_ID);

export const REWARDS_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_REWARDS_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_REWARDS_CANISTER_ID
		: BETA
			? import.meta.env.VITE_BETA_REWARDS_CANISTER_ID
			: import.meta.env.VITE_IC_REWARDS_CANISTER_ID;

export const SIGNER_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_SIGNER_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_SIGNER_CANISTER_ID
		: BETA
			? import.meta.env.VITE_BETA_SIGNER_CANISTER_ID
			: import.meta.env.VITE_IC_SIGNER_CANISTER_ID;

export const KONG_BACKEND_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_KONG_BACKEND_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_KONG_BACKEND_CANISTER_ID
		: BETA
			? import.meta.env.VITE_BETA_KONG_BACKEND_CANISTER_ID
			: import.meta.env.VITE_IC_KONG_BACKEND_CANISTER_ID;

export const ICP_SWAP_FACTORY_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_ICP_SWAP_FACTORY_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_ICP_SWAP_FACTORY_CANISTER_ID
		: BETA
			? import.meta.env.VITE_BETA_ICP_SWAP_FACTORY_CANISTER_ID
			: import.meta.env.VITE_IC_ICP_SWAP_FACTORY_CANISTER_ID;

export const XTC_LEDGER_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_XTC_LEDGER_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_XTC_LEDGER_CANISTER_ID
		: BETA
			? import.meta.env.VITE_BETA_XTC_LEDGER_CANISTER_ID
			: import.meta.env.VITE_IC_XTC_LEDGER_CANISTER_ID;

export const SOL_RPC_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_SOL_RPC_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_SOL_RPC_CANISTER_ID
		: BETA
			? import.meta.env.VITE_BETA_SOL_RPC_CANISTER_ID
			: import.meta.env.VITE_IC_SOL_RPC_CANISTER_ID;

export const LLM_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_LLM_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_LLM_CANISTER_ID
		: BETA
			? import.meta.env.VITE_BETA_LLM_CANISTER_ID
			: import.meta.env.VITE_IC_LLM_CANISTER_ID;

// How long the delegation identity should remain valid?
// e.g. BigInt(60 * 60 * 1000 * 1000 * 1000) = 1 hour in nanoseconds
export const AUTH_MAX_TIME_TO_LIVE = BigInt(60 * 60 * 1000 * 1000 * 1000);

export const AUTH_ALTERNATIVE_ORIGINS = import.meta.env.VITE_AUTH_ALTERNATIVE_ORIGINS;
export const AUTH_DERIVATION_ORIGIN = BETA
	? 'https://oisy.com'
	: STAGING
		? 'https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io'
		: undefined;

export const AUTH_POPUP_WIDTH = 576;
export const AUTH_POPUP_HEIGHT = 625;
export const VC_POPUP_WIDTH = AUTH_POPUP_WIDTH;
// Screen to allow credential presentation is longer than the authentication screen.
export const VC_POPUP_HEIGHT = 900;

// Workers
export const AUTH_TIMER_INTERVAL = 1000;
// From FI team:
// On mainnet, the index runs its indexing function every second. The time to see a new transaction in the index is <=1 second plus the time required by the indexing function
// (however)
// ICP Index has not been upgraded yet so right now for ICP is variable between 0 and 2 seconds. Leo has changed the ckBTC and ckETH to run every second, and we want to change the ICP one too eventually. We just didn't get to work on it yet
export const INDEX_RELOAD_DELAY = 2000;

// Date and time
export const SECONDS_IN_MINUTE = 60;
export const MINUTES_IN_HOUR = 60;
export const HOURS_IN_DAY = 24;

export const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * MINUTES_IN_HOUR;
export const SECONDS_IN_DAY = SECONDS_IN_HOUR * HOURS_IN_DAY;

export const MILLISECONDS_IN_SECOND = 1000;
export const MILLISECONDS_IN_DAY = SECONDS_IN_DAY * MILLISECONDS_IN_SECOND;

export const NANO_SECONDS_IN_MILLISECOND = 1_000_000n;
export const NANO_SECONDS_IN_SECOND = NANO_SECONDS_IN_MILLISECOND * 1_000n;
export const NANO_SECONDS_IN_MINUTE = NANO_SECONDS_IN_SECOND * 60n;

// For some use case we want to display some amount to a maximal number of decimals which is not related to the number of decimals of the selected token.
// Just a value that looks good visually.
export const EIGHT_DECIMALS = 8;

export const ZERO = 0n;

// NFTs
export const NFT_TIMER_INTERVAL_MILLIS = SECONDS_IN_MINUTE * 2 * 1000; // 2 minutes in milliseconds

// Wallets
export const WALLET_TIMER_INTERVAL_MILLIS = (SECONDS_IN_MINUTE / 2) * 1000; // 30 seconds in milliseconds
export const WALLET_PAGINATION = 10n;
// Solana wallets
// Until we find a way to reduce the number of calls (that we pay proportionally) done to the Solana RPC, we delay them more than the other wallets.
// TODO: Use the normal one when we have a better way to handle the Solana wallets, for example when we have the internal Solana RPC canister, or when we don't load again the transactions that are already loaded.
export const SOL_WALLET_TIMER_INTERVAL_MILLIS = SECONDS_IN_MINUTE * 1000; // 1 minute in milliseconds

// Code generation
export const CODE_REGENERATE_INTERVAL_IN_SECONDS = 45;

// User Snapshot
export const USER_SNAPSHOT_TIMER_INTERVAL_MILLIS = SECONDS_IN_MINUTE * 5 * 1000; // 5 minutes in milliseconds

// Fallback
export const FALLBACK_TIMEOUT = 10000;

// Git
export const GIT_COMMIT_HASH = VITE_GIT_COMMIT_HASH;
export const GIT_BRANCH_NAME = VITE_GIT_BRANCH_NAME;

// Threshold
export const FAILURE_THRESHOLD = 3;

// Micro transaction
export const MICRO_TRANSACTION_USD_THRESHOLD = 0.01;

// Known destinations
export const MAX_DISPLAYED_KNOWN_DESTINATION_AMOUNTS = 3;

// Send destination
export const MIN_DESTINATION_LENGTH_FOR_ERROR_STATE = 10;

// Contact validation
export const CONTACT_MAX_LABEL_LENGTH = 50;

// Contact validation
export const CONTACT_MAX_NAME_LENGTH = 100;
