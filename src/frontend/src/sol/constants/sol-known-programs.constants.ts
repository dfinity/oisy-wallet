import {
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	MEMO_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';

/**
 * The programs a simulated run may call from inside another program's instruction without the
 * WalletConnect review asking the user to confirm the transaction separately.
 *
 * The balance changes and the operations describe what a transaction does to the user's wallet and
 * token accounts. A call made inside another program's instruction can also act on what the user
 * holds in an application - a stake account, a lending deposit - and neither of the two shows that.
 * The review names every program outside this list that the run calls that way, and approving
 * waits for the user to confirm they understand OISY cannot say what it does.
 *
 * Sized from the calls ordinary swaps make: the runs of swaps built through Jupiter (Ultra and the
 * Swap API) and Raydium, and swaps made on chain through DFlow, OKX, Titan, Orca, Meteora and
 * pump.fun, measured on 2026-09-29. Applications where users keep balances of their own - lending,
 * derivatives, staking - are left out on purpose, since those balances are what the confirmation
 * is about. The list dates: routers keep adding venues, and a venue missing here asks for the
 * confirmation on every swap routed through it. Jupiter publishes the programs it routes through
 * (`/swap/v1/program-id-to-label`), which is the list to compare against.
 */
export const SOLANA_KNOWN_PROGRAM_ADDRESSES: SolAddress[] = [
	// What every transaction is made of.
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	MEMO_PROGRAM_ADDRESS,

	// Routers, whose own calls show up inside the swaps they route.
	'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6
	'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS', // Raydium router
	'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH', // DFlow v4
	'proVF4pMXVaYqmy4NjniPh4pqKNfMmsihgd4wdkCX3u', // OKX DEX Router
	'T1TANpTeScyeqVzzgNViGDNrkQ6qHz9KrSBS4aNXvGT', // Titan

	// Raydium.
	'675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // AMM v4
	'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C', // CPMM
	'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // CLMM
	'LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj', // LaunchLab

	// Orca.
	'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Whirlpool
	'9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // v2
	'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1', // v1

	// Meteora, and the vault its first dynamic AMM keeps its reserves in.
	'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', // DLMM
	'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB', // DAMM v1
	'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG', // DAMM v2
	'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN', // Dynamic Bonding Curve
	'24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi', // Vault

	// Pump.fun: the bonding curve, its AMM, and the fee program both of them call.
	'6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Bonding curve
	'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA', // AMM
	'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ', // Fees

	// Pools run by market makers, which a large share of Jupiter's routes go through.
	'goonuddtQRrWqqn5nFyczVKaie28f3kDkHWkHtURSLE', // GoonFi V2
	'3TK9D8aoBFYjYZtKCjciPrVrRStsnvo7KmpcJqDavpaU', // Kipseli
	'BiSoNHVpsVZW2F7rx2eQ59yQwKxzU5NvBcmKshCSUypi', // BisonFi
	'ALPHAQmeA7bjrVuccPsYPiCvsi428SNwte66Srvs4pHA', // AlphaQ
	'TessVdML9pBGgG9yGks7o4HewRaXVAMuoVj4x83GLQH', // TesseraV
	'ZERor4xhbUycZ6gb9ntrhqscUcZmAbQDjEAtCf4hbZY', // ZeroFi
	'ojh19ojaKduoJZuaJADhcVGp4xt1TcdAvZmpVsCorch', // Scorch
	'SCoRcH8c2dpjvcJD6FiPbCSQyQgu3PcUAWj2Xxx3mqn', // Scorch, the second program its routes call
	'QuaNtZsgYRe5Z9Bk4LZ4cTD9tbkVoyCNf1R2BN9bBDv', // Quantum
	'9H6tua7jkLhdm3w8BvgpTn5LZNU7g4ZynDmCiNN3q6Rp', // HumidiFi
	'SV2EYYJyRz2YhfXwXnhNAevDEui5Q6yrfyo13WtupPF', // SolFi V2
	'FLUX6xBayGxLX9UcimVRxXFMHH6q43mAbRvDzSpCsvfK', // Flux

	// Other pools.
	'HpNfyc2Saw7RKkQd8nEL4khUcuPhQ7WwY1B2qjx8jxFq', // PancakeSwap
	'REALQqNEomY6cQGZJUGwywTBD2UmDT32rZcNnfxQ5N2', // Byreal
	'fUSioN9YKKSa3CUC2YUc4tPkHJ5Y6XW1yz8y6F7qWz9', // FusionAMM (DefiTuna)

	// An order book. A withdrawal from it can only pay a token account of the signer, so it shows
	// among the balance changes.
	'MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms' // Manifest
];
