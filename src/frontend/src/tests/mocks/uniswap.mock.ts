import { EURC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.eurc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import {
	UNISWAP_COMMANDS,
	UNISWAP_EXECUTE_HASH,
	UNISWAP_EXECUTE_WITHOUT_DEADLINE_HASH
} from '$eth/constants/uniswap.constants';
import { MAX_UINT_160, ZERO } from '$lib/constants/app.constants';
import { AbiCoder } from 'ethers/abi';
import { solidityPacked } from 'ethers/hash';
import { hexlify, toUtf8Bytes } from 'ethers/utils';

const coder = AbiCoder.defaultAbiCoder();

// Universal Router 2.1.2 on Base.
export const mockUniswapRouter = '0xd6145b2D3F379919E8CdEda7B97e37c4b2Ca9c40';

export const mockUniswapWallet = '0x1f07024BAADBb532b58368F8881b4A10796dDC23';

export const mockUniswapDeadline = 1_793_092_628n;

// What Uniswap's web app appends after the arguments: `unix` and 18 more bytes.
export const mockUniswapTag = `${hexlify(toUtf8Bytes('unix')).slice(2)}${'ab'.repeat(18)}`;

// The V3 swap input of 2.1.x routers.
export const UNISWAP_V3_SWAP_TYPES = [
	'address',
	'uint256',
	'uint256',
	'bytes',
	'bool',
	'uint256[]'
];

export interface MockUniswapCommand {
	type: number;
	input: string;
}

export const encodeUniswapCommand = ({
	type,
	types,
	values
}: {
	type: number;
	types: string[];
	values: unknown[];
}): MockUniswapCommand => ({ type, input: coder.encode(types, values) });

// A V3 path through pools of a 0.05% fee.
export const encodeUniswapV3Path = (...tokens: string[]): string =>
	solidityPacked(
		tokens.flatMap((_, index) => (index === 0 ? ['address'] : ['uint24', 'address'])),
		tokens.flatMap((token, index) => (index === 0 ? [token] : [500, token]))
	);

export const encodeUniswapV3Swap = ({
	exactInput = true,
	recipient = mockUniswapWallet,
	amount,
	amountLimit,
	tokens = [EURC_TOKEN.address, USDC_TOKEN.address],
	payerIsUser = true,
	types = UNISWAP_V3_SWAP_TYPES
}: {
	exactInput?: boolean;
	recipient?: string;
	amount: bigint;
	amountLimit: bigint;
	tokens?: string[];
	payerIsUser?: boolean;
	types?: string[];
}): MockUniswapCommand =>
	encodeUniswapCommand({
		type: exactInput ? UNISWAP_COMMANDS.V3_SWAP_EXACT_IN : UNISWAP_COMMANDS.V3_SWAP_EXACT_OUT,
		types,
		// An exact-output path is encoded from the output back to the input.
		values: [
			recipient,
			amount,
			amountLimit,
			encodeUniswapV3Path(...(exactInput ? tokens : [...tokens].reverse())),
			payerIsUser,
			[]
		].slice(0, types.length)
	});

export const encodeUniswapSweep = ({
	token = USDC_TOKEN.address,
	recipient = mockUniswapWallet,
	amountMin = ZERO
}: {
	token?: string;
	recipient?: string;
	amountMin?: bigint;
} = {}): MockUniswapCommand =>
	encodeUniswapCommand({
		type: UNISWAP_COMMANDS.SWEEP,
		types: ['address', 'address', 'uint160'],
		values: [token, recipient, amountMin]
	});

export const encodeUniswapPermit = ({
	token = EURC_TOKEN.address,
	amount = MAX_UINT_160,
	expiration = 1_795_682_829n,
	spender = mockUniswapRouter
}: {
	token?: string;
	amount?: bigint;
	expiration?: bigint;
	spender?: string;
} = {}): MockUniswapCommand =>
	encodeUniswapCommand({
		type: UNISWAP_COMMANDS.PERMIT2_PERMIT,
		types: ['tuple(tuple(address,uint160,uint48,uint48),address,uint256)', 'bytes'],
		values: [
			[[token, amount, expiration, ZERO], spender, mockUniswapDeadline],
			`0x${'11'.repeat(65)}`
		]
	});

// `deadline: null` calls `execute` without one.
export const encodeUniswapExecute = ({
	commands,
	deadline = mockUniswapDeadline,
	tail = mockUniswapTag
}: {
	commands: MockUniswapCommand[];
	deadline?: bigint | null;
	tail?: string;
}): string => {
	const bytes = hexlify(Uint8Array.from(commands.map(({ type }) => type)));
	const inputs = commands.map(({ input }) => input);

	return deadline === null
		? `${UNISWAP_EXECUTE_WITHOUT_DEADLINE_HASH}${coder.encode(['bytes', 'bytes[]'], [bytes, inputs]).slice(2)}${tail}`
		: `${UNISWAP_EXECUTE_HASH}${coder.encode(['bytes', 'bytes[]', 'uint256'], [bytes, inputs, deadline]).slice(2)}${tail}`;
};

// 1 EURC for at least 1.087807 USDC on Base, paid to the wallet, then whatever USDC the router holds
// swept to the wallet too: a swap in Uniswap's web app, 2026-10-27.
export const encodeUniswapEurcToUsdc = ({
	recipient = mockUniswapWallet,
	amountOutMin = 1_087_807n,
	deadline = mockUniswapDeadline
}: {
	recipient?: string;
	amountOutMin?: bigint;
	deadline?: bigint | null;
} = {}): string =>
	encodeUniswapExecute({
		commands: [
			encodeUniswapV3Swap({ recipient, amount: 1_000_000n, amountLimit: amountOutMin }),
			encodeUniswapSweep({ recipient })
		],
		deadline
	});
