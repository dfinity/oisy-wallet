import {
	UNISWAP_BIPS_DENOMINATOR,
	UNISWAP_COMMAND_TYPE_MASK,
	UNISWAP_COMMANDS,
	UNISWAP_CONTRACT_BALANCE,
	UNISWAP_EXECUTE_HASH,
	UNISWAP_EXECUTE_WITHOUT_DEADLINE_HASH,
	UNISWAP_FULL_PRECISION_DENOMINATOR,
	UNISWAP_LAYOUTS,
	UNISWAP_OPEN_AMOUNT,
	UNISWAP_RECIPIENT_ROUTER,
	UNISWAP_RECIPIENT_SENDER,
	UNISWAP_UNIVERSAL_ROUTERS,
	UNISWAP_V3_PATH_ADDRESS_LENGTH,
	UNISWAP_V3_PATH_HOP_LENGTH,
	UNISWAP_V4_ACTIONS
} from '$eth/constants/uniswap.constants';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { ErcFungibleToken } from '$eth/types/erc-fungible';
import type {
	UniswapLayouts,
	UniswapSwap,
	UniswapSwapFee,
	UniswapSwapFeeAmount,
	UniswapUniversalRouter
} from '$eth/types/uniswap';
import { isDestinationContractAddress } from '$eth/utils/send.utils';
import { getCalldataSelector } from '$eth/utils/transactions.utils';
import { MAX_UINT_160, ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { AbiCoder, type Result } from 'ethers/abi';
import { dataSlice, getBytes, hexlify } from 'ethers/utils';

const abiCoder = AbiCoder.defaultAbiCoder();

const EXECUTE_ARGUMENTS: Record<string, string[]> = {
	[UNISWAP_EXECUTE_HASH]: ['bytes', 'bytes[]', 'uint256'],
	[UNISWAP_EXECUTE_WITHOUT_DEADLINE_HASH]: ['bytes', 'bytes[]']
};

// Who a command pays: the wallet signing the transaction, the router itself, which holds tokens
// between commands, or any other address.
type UniswapParty =
	{ kind: 'wallet' } | { kind: 'router' } | { kind: 'other'; address: EthAddress };

interface UniswapDelivery {
	// Lowercased. The zero address is the network's native coin.
	token: string;
	recipient: UniswapParty;
	// The least the router lets reach the recipient: 0 when it enforces nothing.
	minimum: bigint;
}

type UniswapPlanFee = { token: string; recipient: EthAddress } & UniswapSwapFeeAmount;

interface UniswapPlan {
	// What the plan pulls from the wallet through Permit2, per lowercased token.
	pulled: Map<string, bigint>;
	deliveries: UniswapDelivery[];
	fees: UniswapPlanFee[];
	approvals: { token: string; amount: bigint; expiration: bigint }[];
	exactOutput: boolean;
}

interface UniswapReader {
	plan: UniswapPlan;
	party: (address: string) => UniswapParty;
	layouts: UniswapLayouts;
	router: UniswapUniversalRouter;
}

/**
 * The values `data` encodes as `types`, provided it is exactly their ABI encoding.
 *
 * The router reads most inputs with inline assembly at fixed offsets, which checks neither that a
 * value fits its type nor that an offset points where an encoder would put it, and ethers decodes
 * leniently too: it masks a `uint160` to its low bits. Holding each input to the encoding of the
 * values read from it is what makes the router and the review read the same values.
 */
const decodeExactly = ({ types, data }: { types: string[]; data: string }): Result | undefined => {
	try {
		const values = abiCoder.decode(types, data);

		return abiCoder.encode(types, values).toLowerCase() === data.toLowerCase() ? values : undefined;
	} catch (_: unknown) {
		// Not an encoding of these types.
	}
};

const decodeExecute = (
	data: string
): { commands: Uint8Array; inputs: string[]; deadline: bigint | undefined } | undefined => {
	const selector = getCalldataSelector(data);
	const types = nonNullish(selector) ? EXECUTE_ARGUMENTS[selector] : undefined;

	if (isNullish(types)) {
		return;
	}

	try {
		const args = dataSlice(data, 4);
		const values = abiCoder.decode(types, args);

		// The router never reads what follows its arguments, where Uniswap's web app appends a tag, so
		// only the arguments are held to their exact encoding.
		if (!args.toLowerCase().startsWith(abiCoder.encode(types, values).toLowerCase())) {
			return;
		}

		const [commands, inputs, deadline] = values;

		return { commands: getBytes(commands), inputs: [...inputs], deadline };
	} catch (_: unknown) {
		// Not `execute` arguments.
	}
};

// The first and the last token of a V3 path, which must be a token followed by whole pools.
const toV3PathTokens = (path: string): [string, string] | undefined => {
	const bytes = getBytes(path);
	const pools = (bytes.length - UNISWAP_V3_PATH_ADDRESS_LENGTH) / UNISWAP_V3_PATH_HOP_LENGTH;

	if (!Number.isInteger(pools) || pools < 1) {
		return;
	}

	return [
		hexlify(bytes.slice(0, UNISWAP_V3_PATH_ADDRESS_LENGTH)),
		hexlify(bytes.slice(bytes.length - UNISWAP_V3_PATH_ADDRESS_LENGTH))
	];
};

const toParty = ({
	address,
	wallet,
	router
}: {
	address: string;
	wallet: EthAddress;
	router: EthAddress;
}): UniswapParty => {
	const lowercased = address.toLowerCase();

	if (lowercased === UNISWAP_RECIPIENT_SENDER || lowercased === wallet.toLowerCase()) {
		return { kind: 'wallet' };
	}

	if (lowercased === UNISWAP_RECIPIENT_ROUTER || lowercased === router.toLowerCase()) {
		return { kind: 'router' };
	}

	return { kind: 'other', address };
};

// Neither the router's whole balance nor the native coin, which Permit2 cannot move, is an amount
// pulled from the wallet that anything in the transaction bounds.
const pull = ({
	plan,
	token,
	amount
}: {
	plan: UniswapPlan;
	token: string;
	amount: bigint;
}): boolean => {
	const key = token.toLowerCase();

	if (amount === UNISWAP_CONTRACT_BALANCE || key === ZERO_ETH_ADDRESS) {
		return false;
	}

	plan.pulled.set(key, (plan.pulled.get(key) ?? ZERO) + amount);

	return true;
};

const deliver = ({
	plan,
	token,
	recipient,
	minimum
}: { plan: UniswapPlan } & UniswapDelivery): void => {
	// What the router keeps, it holds for the commands that follow: that is no delivery.
	if (recipient.kind === 'router') {
		return;
	}

	plan.deliveries.push({ token: token.toLowerCase(), recipient, minimum });
};

// A share of what the router holds of a token, where 10^18 is all of it. Paid to a third party, it
// is a fee; to the wallet, a delivery the router puts no minimum on.
const payShare = ({
	plan,
	token,
	recipient,
	share
}: {
	plan: UniswapPlan;
	token: string;
	recipient: UniswapParty;
	share: bigint;
}): void => {
	if (recipient.kind === 'other') {
		plan.fees.push({ token: token.toLowerCase(), recipient: recipient.address, share });
		return;
	}

	deliver({ plan, token, recipient, minimum: ZERO });
};

const toShare = (bips: bigint): bigint =>
	(bips * UNISWAP_FULL_PRECISION_DENOMINATOR) / UNISWAP_BIPS_DENOMINATOR;

const swap = ({
	reader: { plan, party },
	recipient,
	tokenIn,
	tokenOut,
	exactInput,
	amount,
	amountLimit,
	payerIsUser
}: {
	reader: UniswapReader;
	recipient: string;
	tokenIn: string;
	tokenOut: string;
	exactInput: boolean;
	amount: bigint;
	amountLimit: bigint;
	payerIsUser: boolean;
}): boolean => {
	// Exact input: `amount` in, at least `amountLimit` out. Exact output: `amount` out, at most
	// `amountLimit` in.
	const [amountIn, amountOut] = exactInput ? [amount, amountLimit] : [amountLimit, amount];

	if (payerIsUser && !pull({ plan, token: tokenIn, amount: amountIn })) {
		return false;
	}

	if (!exactInput) {
		plan.exactOutput = true;
	}

	deliver({ plan, token: tokenOut, recipient: party(recipient), minimum: amountOut });

	return true;
};

/**
 * The actions of a `V4_SWAP`, read into the plan.
 *
 * V4 accounts per currency rather than per action: a swap leaves an amount owed and an amount
 * credited, settlements pay what is owed and takes deliver what is credited. So the swaps are read
 * first, for what they spend and must produce, and bound the settlements and takes around them
 * wherever those sit.
 */
const readV4Swap = ({
	reader,
	actions,
	params
}: {
	reader: UniswapReader;
	actions: Uint8Array;
	params: string[];
}): boolean => {
	const { plan, party, layouts } = reader;

	// The router reverts on a mismatch.
	if (actions.length !== params.length) {
		return false;
	}

	const steps: { action: number; args: Result }[] = [];

	for (const [index, action] of actions.entries()) {
		const types = layouts.actions[action];
		const args = nonNullish(types) ? decodeExactly({ types, data: params[index] }) : undefined;

		if (isNullish(args)) {
			return false;
		}

		steps.push({ action, args });
	}

	// The explicit inputs of the swaps, the currencies a swap spends the whole credit of, the minimum
	// outputs and the number of takes, per lowercased currency.
	const spent = new Map<string, bigint>();
	const spentOpenly = new Set<string>();
	const produced = new Map<string, bigint>();
	const takes = new Map<string, number>();

	const v4Swap = ({
		exactInput,
		currencyIn,
		currencyOut,
		amount,
		amountLimit
	}: {
		exactInput: boolean;
		currencyIn: string;
		currencyOut: string;
		amount: bigint;
		amountLimit: bigint;
	}): boolean => {
		// An exact output of the open amount is whatever is owed of that currency: nothing bounds it.
		if (!exactInput && amount === UNISWAP_OPEN_AMOUNT) {
			return false;
		}

		const [amountIn, amountOut] = exactInput ? [amount, amountLimit] : [amountLimit, amount];
		const keyIn = currencyIn.toLowerCase();
		const keyOut = currencyOut.toLowerCase();

		if (exactInput && amount === UNISWAP_OPEN_AMOUNT) {
			spentOpenly.add(keyIn);
		} else {
			spent.set(keyIn, (spent.get(keyIn) ?? ZERO) + amountIn);
		}

		produced.set(keyOut, (produced.get(keyOut) ?? ZERO) + amountOut);

		if (!exactInput) {
			plan.exactOutput = true;
		}

		return true;
	};

	for (const { action, args } of steps) {
		if (
			action === UNISWAP_V4_ACTIONS.SWAP_EXACT_IN_SINGLE ||
			action === UNISWAP_V4_ACTIONS.SWAP_EXACT_OUT_SINGLE
		) {
			const {
				poolKey: [currency0, currency1],
				zeroForOne,
				amount,
				amountLimit
			} = args[0].toObject();

			if (
				!v4Swap({
					exactInput: action === UNISWAP_V4_ACTIONS.SWAP_EXACT_IN_SINGLE,
					currencyIn: zeroForOne ? currency0 : currency1,
					currencyOut: zeroForOne ? currency1 : currency0,
					amount,
					amountLimit
				})
			) {
				return false;
			}
		} else if (
			action === UNISWAP_V4_ACTIONS.SWAP_EXACT_IN ||
			action === UNISWAP_V4_ACTIONS.SWAP_EXACT_OUT
		) {
			const { currency, path, amount, amountLimit } = args[0].toObject();
			const exactInput = action === UNISWAP_V4_ACTIONS.SWAP_EXACT_IN;

			if (path.length === 0) {
				return false;
			}

			// An exact-input path leads from `currency` to its last hop, an exact-output path from its
			// first hop to `currency`.
			if (
				!v4Swap({
					exactInput,
					currencyIn: exactInput ? currency : path[0][0],
					currencyOut: exactInput ? path[path.length - 1][0] : currency,
					amount,
					amountLimit
				})
			) {
				return false;
			}
		} else if (
			action === UNISWAP_V4_ACTIONS.TAKE ||
			action === UNISWAP_V4_ACTIONS.TAKE_ALL ||
			action === UNISWAP_V4_ACTIONS.TAKE_PORTION
		) {
			const key = args[0].toLowerCase();

			takes.set(key, (takes.get(key) ?? 0) + 1);
		}
	}

	// What an open settlement of a currency pays: the explicit inputs of the swaps that spend it, as
	// long as nothing else adds to what is owed of it. A take of the same currency could.
	const owedOf = (key: string): bigint | undefined =>
		spent.has(key) && !spentOpenly.has(key) && !takes.has(key) ? spent.get(key) : undefined;

	// What the only take of a currency gets when it takes the open amount: everything the swaps
	// produce of it, so at least their minimum outputs, provided no swap spends it again.
	const producedOf = (key: string): bigint =>
		takes.get(key) === 1 && !spent.has(key) && !spentOpenly.has(key)
			? (produced.get(key) ?? ZERO)
			: ZERO;

	for (const { action, args } of steps) {
		if (action === UNISWAP_V4_ACTIONS.SETTLE) {
			const [currency, amount, payerIsUser] = args;
			const key = currency.toLowerCase();
			const owed = amount === UNISWAP_OPEN_AMOUNT ? owedOf(key) : amount;

			// The router settles the native coin out of its own balance, which the transaction's value
			// funds, whoever the action names as paying.
			const paidByWallet = payerIsUser && key !== ZERO_ETH_ADDRESS;

			if (paidByWallet && (isNullish(owed) || !pull({ plan, token: key, amount: owed }))) {
				return false;
			}
		} else if (action === UNISWAP_V4_ACTIONS.SETTLE_ALL) {
			const [currency, maxAmount] = args;
			const key = currency.toLowerCase();

			// The wallet pays everything owed, which the router caps at `maxAmount`. The native coin, it
			// pays out of the transaction's value.
			const owed = owedOf(key);

			if (
				key !== ZERO_ETH_ADDRESS &&
				!pull({ plan, token: key, amount: nonNullish(owed) && owed < maxAmount ? owed : maxAmount })
			) {
				return false;
			}
		} else if (action === UNISWAP_V4_ACTIONS.TAKE) {
			const [currency, recipient, amount] = args;

			deliver({
				plan,
				token: currency,
				recipient: party(recipient),
				minimum: amount === UNISWAP_OPEN_AMOUNT ? producedOf(currency.toLowerCase()) : amount
			});
		} else if (action === UNISWAP_V4_ACTIONS.TAKE_ALL) {
			const [currency, minAmount] = args;
			const fromSwaps = producedOf(currency.toLowerCase());

			deliver({
				plan,
				token: currency,
				recipient: { kind: 'wallet' },
				minimum: fromSwaps > minAmount ? fromSwaps : minAmount
			});
		} else if (action === UNISWAP_V4_ACTIONS.TAKE_PORTION) {
			const [currency, recipient, bips] = args;

			// The router reverts on a share above all of it.
			if (bips > UNISWAP_BIPS_DENOMINATOR) {
				return false;
			}

			payShare({ plan, token: currency, recipient: party(recipient), share: toShare(bips) });
		}
	}

	return true;
};

const readCommand = ({
	reader,
	command,
	args
}: {
	reader: UniswapReader;
	command: number;
	args: Result;
}): boolean => {
	const { plan, party, router } = reader;

	switch (command) {
		case UNISWAP_COMMANDS.V3_SWAP_EXACT_IN:
		case UNISWAP_COMMANDS.V3_SWAP_EXACT_OUT: {
			const [recipient, amount, amountLimit, path, payerIsUser] = args;
			const tokens = toV3PathTokens(path);
			const exactInput = command === UNISWAP_COMMANDS.V3_SWAP_EXACT_IN;

			if (isNullish(tokens)) {
				return false;
			}

			// An exact-output path runs from the output back to the input.
			const [tokenIn, tokenOut] = exactInput ? tokens : [tokens[1], tokens[0]];

			return swap({
				reader,
				recipient,
				tokenIn,
				tokenOut,
				exactInput,
				amount,
				amountLimit,
				payerIsUser
			});
		}
		case UNISWAP_COMMANDS.V2_SWAP_EXACT_IN:
		case UNISWAP_COMMANDS.V2_SWAP_EXACT_OUT: {
			const [recipient, amount, amountLimit, path, payerIsUser] = args;
			const exactInput = command === UNISWAP_COMMANDS.V2_SWAP_EXACT_IN;

			// An exact input of 0 is an input paid to the pair beforehand, by some earlier command.
			if (path.length < 2 || (exactInput && amount === UNISWAP_OPEN_AMOUNT)) {
				return false;
			}

			return swap({
				reader,
				recipient,
				tokenIn: path[0],
				tokenOut: path[path.length - 1],
				exactInput,
				amount,
				amountLimit,
				payerIsUser
			});
		}
		case UNISWAP_COMMANDS.PERMIT2_TRANSFER_FROM: {
			const [token, recipient, amount] = args;

			// Into the router, to be swapped from there. Anywhere else, it is a transfer, not a swap.
			return party(recipient).kind === 'router' && pull({ plan, token, amount });
		}
		case UNISWAP_COMMANDS.PERMIT2_PERMIT: {
			const [[[token, amount, expiration], spender]] = args;

			// The swap spends the router's allowance only. An allowance for anyone else is not part of
			// it, and an expiration of 0 lasts for the current block, which is no date to show.
			if (
				!isDestinationContractAddress({ contractAddress: router.address, destination: spender }) ||
				expiration === ZERO
			) {
				return false;
			}

			plan.approvals.push({ token: token.toLowerCase(), amount, expiration });

			return true;
		}
		case UNISWAP_COMMANDS.WRAP_ETH: {
			const [recipient] = args;

			// Into the router, to be swapped from there. Anywhere else, it would deliver the router's
			// wrapped native token, which OISY does not pin.
			return party(recipient).kind === 'router';
		}
		case UNISWAP_COMMANDS.UNWRAP_WETH: {
			const [recipient, amountMin] = args;

			deliver({ plan, token: ZERO_ETH_ADDRESS, recipient: party(recipient), minimum: amountMin });

			return true;
		}
		case UNISWAP_COMMANDS.SWEEP: {
			const [token, recipient, amountMin] = args;

			deliver({ plan, token, recipient: party(recipient), minimum: amountMin });

			return true;
		}
		case UNISWAP_COMMANDS.TRANSFER: {
			const [token, recipient, value] = args;
			const to = party(recipient);
			const wholeBalance = value === UNISWAP_CONTRACT_BALANCE;

			if (to.kind !== 'other') {
				deliver({ plan, token, recipient: to, minimum: wholeBalance ? ZERO : value });
				return true;
			}

			// A stated amount paid to a third party is a flat fee. The router's whole balance is not.
			if (wholeBalance) {
				return false;
			}

			plan.fees.push({ token: token.toLowerCase(), recipient: to.address, amount: value });

			return true;
		}
		case UNISWAP_COMMANDS.PAY_PORTION: {
			const [token, recipient, bips] = args;

			// The router reverts on a share above all of it.
			if (bips > UNISWAP_BIPS_DENOMINATOR) {
				return false;
			}

			payShare({ plan, token, recipient: party(recipient), share: toShare(bips) });

			return true;
		}
		case UNISWAP_COMMANDS.PAY_PORTION_FULL_PRECISION: {
			const [token, recipient, portion] = args;

			if (portion > UNISWAP_FULL_PRECISION_DENOMINATOR) {
				return false;
			}

			payShare({ plan, token, recipient: party(recipient), share: portion });

			return true;
		}
		case UNISWAP_COMMANDS.BALANCE_CHECK_ERC20:
			// Checks a balance and moves nothing.
			return true;
		case UNISWAP_COMMANDS.V4_SWAP: {
			const [actions, params] = args;

			return readV4Swap({ reader, actions: getBytes(actions), params: [...params] });
		}
		default:
			return false;
	}
};

const toSwap = ({
	plan,
	router,
	value,
	deadline,
	resolveToken
}: {
	plan: UniswapPlan;
	router: UniswapUniversalRouter;
	value: bigint;
	deadline: bigint | undefined;
	resolveToken: (token: string) => Token | undefined;
}): UniswapSwap | undefined => {
	const [paidToken, ...otherPaidTokens] = [
		...plan.pulled.keys(),
		...(value > ZERO ? [ZERO_ETH_ADDRESS] : [])
	];

	if (isNullish(paidToken) || otherPaidTokens.length > 0) {
		return;
	}

	// Unspent input returned to the wallet makes no second token. Anywhere else, it would be a transfer
	// of what the wallet pays.
	if (
		plan.deliveries.some(
			({ token, recipient: { kind } }) => token === paidToken && kind !== 'wallet'
		)
	) {
		return;
	}

	const deliveries = plan.deliveries.filter(({ token }) => token !== paidToken);

	const [receivedToken, ...otherReceivedTokens] = [
		...new Set(deliveries.map(({ token }) => token))
	];

	const [recipient, ...otherRecipients] = [
		...new Set(
			deliveries.map(({ recipient }) =>
				recipient.kind === 'other' ? recipient.address.toLowerCase() : recipient.kind
			)
		)
	];

	if (
		isNullish(receivedToken) ||
		otherReceivedTokens.length > 0 ||
		isNullish(recipient) ||
		otherRecipients.length > 0 ||
		plan.approvals.length > 1
	) {
		return;
	}

	const paid = resolveToken(paidToken);
	const received = resolveToken(receivedToken);

	const fees = plan.fees.map((fee): UniswapSwapFee | undefined => {
		const token = resolveToken(fee.token);

		return nonNullish(token) ? { ...fee, token } : undefined;
	});

	const [approval] = plan.approvals;
	const approvalToken = nonNullish(approval) ? resolveToken(approval.token) : undefined;

	if (
		isNullish(paid) ||
		isNullish(received) ||
		fees.some(isNullish) ||
		(nonNullish(approval) && isNullish(approvalToken))
	) {
		return;
	}

	const [{ recipient: party }] = deliveries;

	return {
		router,
		paid: {
			token: paid,
			amount: paidToken === ZERO_ETH_ADDRESS ? value : (plan.pulled.get(paidToken) ?? ZERO),
			atMost: plan.exactOutput
		},
		received: {
			token: received,
			amount: deliveries.reduce((sum, { minimum }) => sum + minimum, ZERO)
		},
		...(party.kind === 'other' && { recipient: party.address }),
		fees: fees.filter(nonNullish),
		...(nonNullish(approval) &&
			nonNullish(approvalToken) && {
				approval: {
					token: approvalToken,
					amount: approval.amount,
					unlimited: approval.amount === MAX_UINT_160,
					expiration: Number(approval.expiration)
				}
			}),
		...(nonNullish(deadline) &&
			deadline <= BigInt(Number.MAX_SAFE_INTEGER) && { deadline: Number(deadline) })
	};
};

export interface GetUniswapSwapParams {
	to: string | undefined;
	data: string | undefined;
	chainId: bigint;
	networkId: NetworkId;
	// The transaction's native value.
	value: bigint;
	// The address signing the transaction, which the router knows as its sender.
	wallet: OptionEthAddress;
	nativeToken: Token;
	// The tokens OISY lists, enabled or not. Only those on the request's network are matched.
	tokens: ErcFungibleToken[];
}

/**
 * The swap a transaction to Uniswap's Universal Router makes, as far as OISY can state it.
 *
 * Only a router pinned on the request's chain gives the command bytes their meaning, and only the
 * layout of its version reads them, so anything else is no swap. Every command must be one OISY
 * reads: the router pulls the wallet's tokens under the allowance the wallet gave it through
 * Permit2, and a command left unread could move them anywhere. What remains must reduce to one token
 * leaving the wallet and one other token arriving, at the wallet or at one other address, with every
 * other payment a fee. Every amount is one the router enforces.
 *
 * `undefined` for anything else, which the review then describes as a call it cannot read.
 */
export const getUniswapSwap = ({
	to,
	data,
	chainId,
	networkId,
	value,
	wallet,
	nativeToken,
	tokens
}: GetUniswapSwapParams): UniswapSwap | undefined => {
	if (isNullish(data) || isNullish(wallet)) {
		return;
	}

	const router = UNISWAP_UNIVERSAL_ROUTERS.find(
		({ chainId: routerChainId, address }) =>
			routerChainId === chainId &&
			isDestinationContractAddress({ contractAddress: address, destination: to })
	);

	if (isNullish(router)) {
		return;
	}

	const execute = decodeExecute(data);

	// The router reverts on a mismatch.
	if (isNullish(execute) || execute.commands.length !== execute.inputs.length) {
		return;
	}

	const reader: UniswapReader = {
		plan: { pulled: new Map(), deliveries: [], fees: [], approvals: [], exactOutput: false },
		party: (address) => toParty({ address, wallet, router: router.address }),
		layouts: UNISWAP_LAYOUTS[router.version],
		router
	};

	for (const [index, byte] of execute.commands.entries()) {
		// The allow-revert bit is ignored. Every command read here reverts the transaction when it
		// fails, except `PERMIT2_PERMIT`, whose failure grants nothing.
		const command = byte & UNISWAP_COMMAND_TYPE_MASK;
		const types = reader.layouts.commands[command];
		const args = nonNullish(types)
			? decodeExactly({ types, data: execute.inputs[index] })
			: undefined;

		if (isNullish(args) || !readCommand({ reader, command, args })) {
			return;
		}
	}

	return toSwap({
		plan: reader.plan,
		router,
		value,
		deadline: execute.deadline,
		resolveToken: (token) =>
			token === ZERO_ETH_ADDRESS
				? nativeToken
				: tokens.find(
						({ address, network: { id } }) => id === networkId && address.toLowerCase() === token
					)
	});
};
