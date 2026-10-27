import type {
	UniswapLayouts,
	UniswapUniversalRouter,
	UniswapUniversalRouterVersion
} from '$eth/types/uniswap';
import { ZERO } from '$lib/constants/app.constants';

// Uniswap's Universal Router as OISY reads the transactions dApps send to it: taken from
// https://github.com/Uniswap/universal-router (tags 2.0.0, 2.1.1 and 2.1.2) and the v4-periphery
// commit each tag pins, and checked on 2026-10-27 against live 2.1.2 transactions on Base.

/**
 * The routers OISY describes the swaps of, per chain.
 *
 * From `deploy-addresses/<chain>.json` in the router's repository, matching `CHAIN_CONFIGS` in
 * Uniswap's universal-router-sdk. The router is not upgradeable, so an address pins its code, but
 * only on its own chain: the same address elsewhere may hold anything. The version is part of the
 * pin because it decides how each command's input is laid out.
 *
 * Base Sepolia has no 2.0.0 entry: the two sources name different addresses for it.
 */
export const UNISWAP_UNIVERSAL_ROUTERS: UniswapUniversalRouter[] = [
	// Ethereum
	{ chainId: 1n, address: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af', version: '2.0.0' },
	{ chainId: 1n, address: '0x4C82D1fBFe28C977cBB58D8C7FF8FCF9F70a2cCA', version: '2.1.1' },
	{ chainId: 1n, address: '0x23617e59A5925b2A4Bf75d73ff6711cD0b29De85', version: '2.1.2' },
	// Sepolia
	{ chainId: 11155111n, address: '0x3a9d48ab9751398bbfa63ad67599bb04e4bdf98b', version: '2.0.0' },
	{ chainId: 11155111n, address: '0x7DfD4F31be6814D2906BDE155c3e1B146EAc1468', version: '2.1.1' },
	{ chainId: 11155111n, address: '0x7E4f6c5e954Da5c61B3423D81E2277431Ac043f3', version: '2.1.2' },
	// Base
	{ chainId: 8453n, address: '0x6ff5693b99212da76ad316178a184ab56d299b43', version: '2.0.0' },
	{ chainId: 8453n, address: '0xFdf682F51FE81Aa4898F0AE2163d8A55c127fbC7', version: '2.1.1' },
	{ chainId: 8453n, address: '0xd6145b2D3F379919E8CdEda7B97e37c4b2Ca9c40', version: '2.1.2' },
	// Base Sepolia
	{ chainId: 84532n, address: '0x8B844f885672f333Bc0042cB669255f93a4C1E6b', version: '2.1.1' },
	{ chainId: 84532n, address: '0x8702463e73f74d0b6765aBceb314Ef07aCb92650', version: '2.1.2' },
	// BNB Smart Chain
	{ chainId: 56n, address: '0x1906c1d672b88cd1b9ac7593301ca990f94eae07', version: '2.0.0' },
	{ chainId: 56n, address: '0x8B844f885672f333Bc0042cB669255f93a4C1E6b', version: '2.1.1' },
	{ chainId: 56n, address: '0xDc264714F68d84CF29BC605589405E78bDBE7C9f', version: '2.1.2' },
	// Polygon
	{ chainId: 137n, address: '0x1095692a6237d83c6a72f3f5efedb9a670c49223', version: '2.0.0' },
	{ chainId: 137n, address: '0x8B844f885672f333Bc0042cB669255f93a4C1E6b', version: '2.1.1' },
	{ chainId: 137n, address: '0xDc264714F68d84CF29BC605589405E78bDBE7C9f', version: '2.1.2' },
	// Arbitrum
	{ chainId: 42161n, address: '0xa51afafe0263b40edaef0df8781ea9aa03e381a3', version: '2.0.0' },
	{ chainId: 42161n, address: '0x8B844f885672f333Bc0042cB669255f93a4C1E6b', version: '2.1.1' },
	{ chainId: 42161n, address: '0x2d01411773c8C24805306E89A41F7855C3c4Fe65', version: '2.1.2' },
	// Robinhood Chain
	{ chainId: 4663n, address: '0x8876789976decbfcbbbe364623c63652db8c0904', version: '2.1.1' },
	{ chainId: 4663n, address: '0x204FAca1764B154221e35c0d20aBb3c525710498', version: '2.1.2' }
];

// execute(bytes commands, bytes[] inputs, uint256 deadline)
export const UNISWAP_EXECUTE_HASH = '0x3593564c';

// execute(bytes commands, bytes[] inputs), which Uniswap's SDK sends when a swap sets no deadline
export const UNISWAP_EXECUTE_WITHOUT_DEADLINE_HASH = '0x24856bc3';

// `Commands.COMMAND_TYPE_MASK`: the low seven bits of a command byte name the command. The top bit,
// `FLAG_ALLOW_REVERT`, only matters to commands that report failure instead of reverting.
export const UNISWAP_COMMAND_TYPE_MASK = 0x7f;

// `Commands`: the commands OISY reads.
export const UNISWAP_COMMANDS = {
	V3_SWAP_EXACT_IN: 0x00,
	V3_SWAP_EXACT_OUT: 0x01,
	PERMIT2_TRANSFER_FROM: 0x02,
	SWEEP: 0x04,
	TRANSFER: 0x05,
	PAY_PORTION: 0x06,
	PAY_PORTION_FULL_PRECISION: 0x07,
	V2_SWAP_EXACT_IN: 0x08,
	V2_SWAP_EXACT_OUT: 0x09,
	PERMIT2_PERMIT: 0x0a,
	WRAP_ETH: 0x0b,
	UNWRAP_WETH: 0x0c,
	BALANCE_CHECK_ERC20: 0x0e,
	V4_SWAP: 0x10
} as const;

// v4-periphery `Actions`: the nine a `V4_SWAP` command can run in the router, which reverts on any
// other.
export const UNISWAP_V4_ACTIONS = {
	SWAP_EXACT_IN_SINGLE: 0x06,
	SWAP_EXACT_IN: 0x07,
	SWAP_EXACT_OUT_SINGLE: 0x08,
	SWAP_EXACT_OUT: 0x09,
	SETTLE: 0x0b,
	SETTLE_ALL: 0x0c,
	TAKE: 0x0e,
	TAKE_ALL: 0x0f,
	TAKE_PORTION: 0x10
} as const;

// `ActionConstants.MSG_SENDER`: a recipient standing for the transaction's sender.
export const UNISWAP_RECIPIENT_SENDER = '0x0000000000000000000000000000000000000001';

// `ActionConstants.ADDRESS_THIS`: a recipient standing for the router itself.
export const UNISWAP_RECIPIENT_ROUTER = '0x0000000000000000000000000000000000000002';

// `ActionConstants.CONTRACT_BALANCE`: an amount standing for the router's whole balance of a token.
export const UNISWAP_CONTRACT_BALANCE = 1n << 255n;

// `ActionConstants.OPEN_DELTA`: a V4 amount standing for the whole amount owed or credited, and
// `Constants.ALREADY_PAID`: a V2 input already sent to the pair.
export const UNISWAP_OPEN_AMOUNT = ZERO;

// `BipsLibrary.BPS_DENOMINATOR`, which `PAY_PORTION` and `TAKE_PORTION` divide by, and the
// denominator of `PAY_PORTION_FULL_PRECISION`.
export const UNISWAP_BIPS_DENOMINATOR = 10_000n;
export const UNISWAP_FULL_PRECISION_DENOMINATOR = 10n ** 18n;

// A V3 path: a token, then a 3-byte fee and the next token for every pool.
export const UNISWAP_V3_PATH_ADDRESS_LENGTH = 20;
export const UNISWAP_V3_PATH_HOP_LENGTH = 23;

const V3_SWAP = ['address', 'uint256', 'uint256', 'bytes', 'bool'];
const V2_SWAP = ['address', 'uint256', 'uint256', 'address[]', 'bool'];

// 2.1.1 added a per-hop minimum price after the swap's other inputs.
const MIN_HOP_PRICES = 'uint256[]';

const POOL_KEY =
	'tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)';
const PATH_KEY =
	'tuple(address intermediateCurrency, uint24 fee, int24 tickSpacing, address hooks, bytes hookData)';

// `IV4Router` swap structs, as 2.0.0 and as 2.1.x lay them out.
const V4_SWAP_SINGLE_2_0 = `tuple(${POOL_KEY} poolKey, bool zeroForOne, uint128 amount, uint128 amountLimit, bytes hookData)`;
const V4_SWAP_SINGLE_2_1 = `tuple(${POOL_KEY} poolKey, bool zeroForOne, uint128 amount, uint128 amountLimit, uint256 minHopPriceX36, bytes hookData)`;
const V4_SWAP_2_0 = `tuple(address currency, ${PATH_KEY}[] path, uint128 amount, uint128 amountLimit)`;
const V4_SWAP_2_1 = `tuple(address currency, ${PATH_KEY}[] path, uint256[] minHopPriceX36, uint128 amount, uint128 amountLimit)`;

const sharedCommands: Partial<Record<number, string[]>> = {
	// `SWEEP` and `PERMIT2_TRANSFER_FROM` read their amount as a `uint160`.
	[UNISWAP_COMMANDS.PERMIT2_TRANSFER_FROM]: ['address', 'address', 'uint160'],
	[UNISWAP_COMMANDS.SWEEP]: ['address', 'address', 'uint160'],
	[UNISWAP_COMMANDS.TRANSFER]: ['address', 'address', 'uint256'],
	[UNISWAP_COMMANDS.PAY_PORTION]: ['address', 'address', 'uint256'],
	[UNISWAP_COMMANDS.PERMIT2_PERMIT]: [
		'tuple(tuple(address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline)',
		'bytes'
	],
	[UNISWAP_COMMANDS.WRAP_ETH]: ['address', 'uint256'],
	[UNISWAP_COMMANDS.UNWRAP_WETH]: ['address', 'uint256'],
	[UNISWAP_COMMANDS.BALANCE_CHECK_ERC20]: ['address', 'address', 'uint256'],
	[UNISWAP_COMMANDS.V4_SWAP]: ['bytes', 'bytes[]']
};

const sharedActions: Partial<Record<number, string[]>> = {
	[UNISWAP_V4_ACTIONS.SETTLE]: ['address', 'uint256', 'bool'],
	[UNISWAP_V4_ACTIONS.SETTLE_ALL]: ['address', 'uint256'],
	[UNISWAP_V4_ACTIONS.TAKE]: ['address', 'address', 'uint256'],
	[UNISWAP_V4_ACTIONS.TAKE_ALL]: ['address', 'uint256'],
	[UNISWAP_V4_ACTIONS.TAKE_PORTION]: ['address', 'address', 'uint256']
};

const layouts2_0: UniswapLayouts = {
	commands: {
		...sharedCommands,
		[UNISWAP_COMMANDS.V3_SWAP_EXACT_IN]: V3_SWAP,
		[UNISWAP_COMMANDS.V3_SWAP_EXACT_OUT]: V3_SWAP,
		[UNISWAP_COMMANDS.V2_SWAP_EXACT_IN]: V2_SWAP,
		[UNISWAP_COMMANDS.V2_SWAP_EXACT_OUT]: V2_SWAP
	},
	actions: {
		...sharedActions,
		[UNISWAP_V4_ACTIONS.SWAP_EXACT_IN_SINGLE]: [V4_SWAP_SINGLE_2_0],
		[UNISWAP_V4_ACTIONS.SWAP_EXACT_IN]: [V4_SWAP_2_0],
		[UNISWAP_V4_ACTIONS.SWAP_EXACT_OUT_SINGLE]: [V4_SWAP_SINGLE_2_0],
		[UNISWAP_V4_ACTIONS.SWAP_EXACT_OUT]: [V4_SWAP_2_0]
	}
};

const layouts2_1: UniswapLayouts = {
	commands: {
		...sharedCommands,
		[UNISWAP_COMMANDS.V3_SWAP_EXACT_IN]: [...V3_SWAP, MIN_HOP_PRICES],
		[UNISWAP_COMMANDS.V3_SWAP_EXACT_OUT]: [...V3_SWAP, MIN_HOP_PRICES],
		[UNISWAP_COMMANDS.V2_SWAP_EXACT_IN]: [...V2_SWAP, MIN_HOP_PRICES],
		[UNISWAP_COMMANDS.V2_SWAP_EXACT_OUT]: [...V2_SWAP, MIN_HOP_PRICES],
		[UNISWAP_COMMANDS.PAY_PORTION_FULL_PRECISION]: ['address', 'address', 'uint256']
	},
	actions: {
		...sharedActions,
		[UNISWAP_V4_ACTIONS.SWAP_EXACT_IN_SINGLE]: [V4_SWAP_SINGLE_2_1],
		[UNISWAP_V4_ACTIONS.SWAP_EXACT_IN]: [V4_SWAP_2_1],
		[UNISWAP_V4_ACTIONS.SWAP_EXACT_OUT_SINGLE]: [V4_SWAP_SINGLE_2_1],
		[UNISWAP_V4_ACTIONS.SWAP_EXACT_OUT]: [V4_SWAP_2_1]
	}
};

// The input of every command and V4 action OISY reads, as each version lays it out. A command or
// action without an entry is one OISY does not read.
export const UNISWAP_LAYOUTS: Record<UniswapUniversalRouterVersion, UniswapLayouts> = {
	'2.0.0': layouts2_0,
	'2.1.1': layouts2_1,
	'2.1.2': layouts2_1
};
