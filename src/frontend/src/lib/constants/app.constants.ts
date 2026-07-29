import { parseBoolEnvVar } from '$lib/utils/env.utils';
import { nonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

export const APP_VERSION = VITE_APP_VERSION;

export const MODE = VITE_DFX_NETWORK;
export const LOCAL = MODE === 'local';
export const TEST_FE = MODE.startsWith('test_fe_');
export const AUDIT = MODE === 'audit';
export const E2E = MODE === 'e2e';
export const STAGING = MODE === 'staging' || TEST_FE || AUDIT || E2E;
export const BETA = MODE === 'beta';
export const PROD = MODE === 'ic';

// Set via OISY_SIGNER_TARGET env var at build time ('signer' | 'legacy_signer' | '')
export const SIGNER_TARGET: string | undefined = VITE_OISY_SIGNER_TARGET || undefined;
export const IS_SIGNER_DOMAIN = nonNullish(SIGNER_TARGET);

export const TEST = parseBoolEnvVar(import.meta.env.TEST);

export const REPLICA_HOST = LOCAL ? 'http://localhost:4943/' : 'https://icp-api.io';

export const INTERNET_IDENTITY_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_INTERNET_IDENTITY_CANISTER_ID
	: undefined;

export const INTERNET_IDENTITY_ORIGIN = LOCAL
	? `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`
	: 'https://identity.internetcomputer.org';

export const BACKEND_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_BACKEND_CANISTER_ID
	: TEST_FE || AUDIT || E2E
		? (import.meta.env[`VITE_${MODE.toUpperCase()}_BACKEND_CANISTER_ID`] ??
			import.meta.env.VITE_STAGING_BACKEND_CANISTER_ID)
		: STAGING
			? import.meta.env.VITE_STAGING_BACKEND_CANISTER_ID
			: BETA
				? import.meta.env.VITE_BETA_BACKEND_CANISTER_ID
				: import.meta.env.VITE_IC_BACKEND_CANISTER_ID;

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

export const OISY_TRADE_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_OISY_TRADE_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_OISY_TRADE_CANISTER_ID
		: BETA
			? import.meta.env.VITE_BETA_OISY_TRADE_CANISTER_ID
			: import.meta.env.VITE_IC_OISY_TRADE_CANISTER_ID;

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
// e.g. BigInt(60 * 60 * 1_000 * 1_000 * 1_000) = 1 hour in nanoseconds
export const AUTH_MAX_TIME_TO_LIVE = BigInt(60 * 60 * 1_000 * 1_000 * 1_000);

const DOMAIN_URL_HOSTNAME =
	typeof window !== 'undefined'
		? window.location.hostname
		: typeof self !== 'undefined'
			? self.location.hostname
			: '';
const IS_ICP_DOMAIN_URL = DOMAIN_URL_HOSTNAME.endsWith('.icp0.io');

export const AUTH_ALTERNATIVE_ORIGINS = import.meta.env.VITE_AUTH_ALTERNATIVE_ORIGINS;
// Signer domains always need a derivation origin so users get the same identity as on the main wallet.
export const AUTH_DERIVATION_ORIGIN =
	IS_SIGNER_DOMAIN || BETA || (PROD && IS_ICP_DOMAIN_URL)
		? STAGING
			? 'https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io'
			: 'https://oisy.com'
		: STAGING
			? 'https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io'
			: undefined;

export const AUTH_POPUP_WIDTH = 576;
// we need to temporarily increase the height so II 2.0 in "guided mode" fits the popup
// TODO: revert to 625 after II provides a fix on their end
export const AUTH_POPUP_HEIGHT = 826;

// Workers
export const AUTH_TIMER_INTERVAL = 1_000;
// From FI team:
// On mainnet, the index runs its indexing function every second. The time to see a new transaction in the index is <=1 second plus the time required by the indexing function
// (however)
// ICP Index has not been upgraded yet, so right now for ICP it is variable between 0 and 2 seconds. Leo has changed the ckBTC and ckETH to run every second, and we want to change the ICP one too eventually. We just didn't get to work on it yet
export const INDEX_RELOAD_DELAY = 2_000;

// Date and time
export const SECONDS_IN_MINUTE = 60;
export const MINUTES_IN_HOUR = 60;
export const HOURS_IN_DAY = 24;

export const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * MINUTES_IN_HOUR;
export const SECONDS_IN_DAY = SECONDS_IN_HOUR * HOURS_IN_DAY;

export const MILLISECONDS_IN_SECOND = 1_000;
export const MILLISECONDS_IN_DAY = SECONDS_IN_DAY * MILLISECONDS_IN_SECOND;

export const NANO_SECONDS_IN_MILLISECOND = 1_000_000n;
export const NANO_SECONDS_IN_SECOND = NANO_SECONDS_IN_MILLISECOND * 1_000n;
export const NANO_SECONDS_IN_MINUTE = NANO_SECONDS_IN_SECOND * 60n;
export const NANO_SECONDS_IN_HALF_MINUTE = NANO_SECONDS_IN_SECOND * 30n;

// For some use case we want to display some amount to a maximal number of decimals which is not related to the number of decimals of the selected token.
// Just a value that looks good visually.
export const EIGHT_DECIMALS = 8;

// eslint-disable-next-line no-restricted-syntax -- This is the definition
export const ZERO = 0n;
export const MAX_UINT_256 = (1n << 256n) - 1n;

// NFTs
export const COLLECTION_TIMER_INTERVAL_MILLIS = (SECONDS_IN_MINUTE / 3) * 1_000; // 20 seconds in milliseconds
export const NFT_TIMER_INTERVAL_MILLIS = (SECONDS_IN_MINUTE / 3) * 1_000; // 20 seconds in milliseconds

// Wallets
export const WALLET_TIMER_INTERVAL_MILLIS = (SECONDS_IN_MINUTE / 2) * 1_000; // 30 seconds in milliseconds
export const WALLET_PAGINATION = 10n;
// Solana wallets
// Until we find a way to reduce the number of calls (that we pay proportionally) done to the Solana RPC, we delay them more than the other wallets.
// TODO: Use the normal one when we have a better way to handle the Solana wallets, for example when we have the internal Solana RPC canister, or when we don't load again the transactions that are already loaded.
export const SOL_WALLET_TIMER_INTERVAL_MILLIS = SECONDS_IN_MINUTE * 1_000; // 1 minute in milliseconds

// Code generation
export const CODE_REGENERATE_INTERVAL_IN_SECONDS = 45;

// Active user transactions polling
export const ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS = 5 * 1_000; // 5 seconds
// Minimum delay between two `forward_evm_to_icp` re-notifications for the same
// pending OneSec EVM→ICP row (notifying is an update call, polling is 5s).
export const ONESEC_FORWARDING_NOTIFY_INTERVAL_MILLIS = SECONDS_IN_MINUTE * 1_000; // 1 minute

// User Snapshot
export const USER_SNAPSHOT_TIMER_INTERVAL_MILLIS = SECONDS_IN_MINUTE * 5 * 1_000; // 5 minutes in milliseconds

// Fallback
export const FALLBACK_TIMEOUT = 10_000;

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

// Personal notes
// Cleartext cap, enforced client-side (the backend only ever sees ciphertext).
// Counted in Unicode code points, not UTF-16 units, so emoji / CJK / astral
// characters are measured as the user sees them.
export const MAX_PERSONAL_NOTE_LENGTH = 2_000;
// Per-user cap; mirrors the backend's `MAX_PERSONAL_NOTES_PER_USER`. Drives the
// client-side "at capacity" gate; the backend `TooManyNotes` rejection remains
// the source of truth.
export const MAX_PERSONAL_NOTES_PER_USER = 1_000;
// Per-user active-share cap; mirrors the backend's `MAX_PERSONAL_NOTE_SHARES_PER_USER`.
// Drives the client-side "at capacity" gate in the Share dialog; the backend
// `TooManyShares` rejection remains the source of truth.
export const MAX_PERSONAL_NOTE_SHARES_PER_USER = 100;

// Network bonus multiplier
export const NETWORK_BONUS_MULTIPLIER_DEFAULT = 1;

// NFT max filesize limit (10MB)
export const NFT_MAX_FILESIZE_LIMIT = 1024 * 1024 * 10;

// ZERO ETH address
export const ZERO_ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
