import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { LIFI_FEE_BPS } from '$eth/constants/lifi.constants';
import { ZERO } from '$lib/constants/app.constants';
import type { LifiQuoteRejectedError } from '$lib/types/errors';
import { lifiRejectedError } from '$lib/utils/lifi-swap.utils';
import {
	JUPITER_ROUTE_V2_DISCRIMINATOR,
	JUPITER_SHARED_ACCOUNTS_ROUTE_V2_DISCRIMINATOR,
	JUPITER_V6_PROGRAM,
	LIFI_SOLANA_FEE_PROGRAM,
	LIFI_SOLANA_FEE_PROGRAM_CLOCK,
	LIFI_SOLANA_FEE_PROGRAM_DATA_LENGTH,
	LIFI_SOLANA_FEE_PROGRAM_DISCRIMINATOR,
	LIFI_SOLANA_FEE_WALLET,
	LIFI_SOLANA_PROGRAM_ADDRESSES
} from '$sol/constants/lifi.constants';
import {
	ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS,
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	SOLANA_LAMPORTS_PER_SIGNATURE,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolInstruction } from '$sol/types/sol-instructions';
import type { SolSimulationResult } from '$sol/types/sol-simulation';
import { calculateSolPrioritizationFee } from '$sol/utils/fee.utils';
import { parseSolAtaInstruction } from '$sol/utils/sol-instructions-ata.utils';
import { parseSolComputeBudgetInstruction } from '$sol/utils/sol-instructions-compute-budget.utils';
import { parseSolSystemInstruction } from '$sol/utils/sol-instructions-system.utils';
import { parseSolToken2022Instruction } from '$sol/utils/sol-instructions-token-2022.utils';
import { parseSolTokenInstruction } from '$sol/utils/sol-instructions-token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { ComputeBudgetInstruction } from '@solana-program/compute-budget';
import { SystemInstruction } from '@solana-program/system';
import { AssociatedTokenInstruction, TokenInstruction } from '@solana-program/token';
import {
	getTokenSize,
	Token2022Instruction,
	type Extension,
	type ExtensionArgs
} from '@solana-program/token-2022';
import {
	getBase16Decoder,
	getStructDecoder,
	getU16Decoder,
	getU64Decoder,
	isSignerRole,
	isWritableRole,
	type ReadonlyUint8Array
} from '@solana/kit';

const BASIS_POINTS = 10_000n;

const rejected = (reason: string): LifiQuoteRejectedError =>
	lifiRejectedError({ subject: 'transaction', reason });

/**
 * What a LI.FI Solana transaction is bound to: the request it answers, in LI.FI's addresses (a mint,
 * or the System Program id for native SOL), and the minimum output the user reviewed.
 */
export interface LifiSolBinding {
	userAddress: SolAddress;
	fromToken: SolAddress;
	toToken: SolAddress;
	amount: bigint;
	displayedToAmountMin: bigint;
}

/**
 * The accounts the binding compares against, derived rather than read from the transaction: the
 * user's associated token account for wrapped SOL; the user's for the source and the destination
 * mints, which is that wrapped SOL account for native SOL; and the fee wallet's for an SPL source's
 * mint. Those for a mint are keyed by each token program that may hold it.
 */
export interface LifiSolDerivedAccounts {
	wrappedSolAccount: SolAddress;
	sourceTokenAccounts: Partial<Record<SolAddress, SolAddress>>;
	destinationTokenAccounts: Partial<Record<SolAddress, SolAddress>>;
	feeTokenAccounts: Partial<Record<SolAddress, SolAddress>>;
}

/**
 * An account a `CreateIdempotent` of the transaction creates, with what decides its size: the token
 * program creating it, and the mint.
 */
export interface LifiSolCreatedAccount {
	account: SolAddress;
	mint: SolAddress;
	tokenProgram: SolAddress;
}

export interface LifiSolInstructions {
	computeUnitLimit: bigint;
	computeUnitPrice?: bigint;
	createdAccounts: LifiSolCreatedAccount[];
	// Whether the transaction closes the user's wrapped SOL account, which unwraps whatever it holds.
	closesWrappedSolAccount: boolean;
}

export interface JupiterRouteArguments {
	inAmount: bigint;
	quotedOutAmount: bigint;
	slippageBps: number;
	platformFeeBps: number;
	positiveSlippageBps: number;
}

const jupiterRouteArgumentsDecoder = getStructDecoder([
	['inAmount', getU64Decoder()],
	['quotedOutAmount', getU64Decoder()],
	['slippageBps', getU16Decoder()],
	['platformFeeBps', getU16Decoder()],
	['positiveSlippageBps', getU16Decoder()]
]);

// The arguments above, then the route plan's length prefix.
const JUPITER_ROUTE_ARGUMENTS_MIN_LENGTH = 26;

// Where a route entrypoint's arguments start, and the position of each account the binding reads,
// from the program's on-chain IDL (2026-10-23, the destination's 2026-10-28).
interface JupiterEntrypoint {
	argumentsOffset: number;
	userTransferAuthority: number;
	sourceTokenAccount: number;
	destinationTokenAccount: number;
	sourceMint: number;
	destinationMint: number;
	sourceTokenProgram: number;
	destinationTokenProgram: number;
	// An optional account that, when set, takes the output in the destination's place. Unset, it
	// holds the program's own id.
	outputRedirect?: number;
}

const JUPITER_ENTRYPOINTS: Record<string, JupiterEntrypoint> = {
	[JUPITER_ROUTE_V2_DISCRIMINATOR]: {
		argumentsOffset: 8,
		userTransferAuthority: 0,
		sourceTokenAccount: 1,
		destinationTokenAccount: 2,
		sourceMint: 3,
		destinationMint: 4,
		sourceTokenProgram: 5,
		destinationTokenProgram: 6,
		outputRedirect: 7
	},
	// An `id: u8` before the same arguments, and the program's own authority and token accounts among
	// the user's.
	[JUPITER_SHARED_ACCOUNTS_ROUTE_V2_DISCRIMINATOR]: {
		argumentsOffset: 9,
		userTransferAuthority: 1,
		sourceTokenAccount: 2,
		destinationTokenAccount: 5,
		sourceMint: 6,
		destinationMint: 7,
		sourceTokenProgram: 8,
		destinationTokenProgram: 9
	}
};

const jupiterEntrypointOf = (data: ReadonlyUint8Array): JupiterEntrypoint | undefined =>
	JUPITER_ENTRYPOINTS[getBase16Decoder().decode(data.slice(0, 8))];

/**
 * The leading arguments of a Jupiter v6 `route_v2` or `shared_accounts_route_v2` instruction, as
 * the program's on-chain IDL lays them out; `undefined` for any other instruction of the program, or
 * data too short to hold them. The route plan that follows is not decoded: what it does is bound by
 * the minimum the program enforces on its output.
 */
export const decodeJupiterRoute = (data: ReadonlyUint8Array): JupiterRouteArguments | undefined => {
	const entrypoint = jupiterEntrypointOf(data);

	if (
		isNullish(entrypoint) ||
		data.length < entrypoint.argumentsOffset + JUPITER_ROUTE_ARGUMENTS_MIN_LENGTH
	) {
		return;
	}

	return jupiterRouteArgumentsDecoder.decode(data, entrypoint.argumentsOffset);
};

/**
 * The minimum output a Jupiter route enforces, rounded to the nearest unit as LI.FI rounds its
 * `toAmountMin`: rounded down, the check would refuse every route LI.FI rounded up, about half of
 * them. The minimum Jupiter enforces may then be one base unit below the one displayed.
 */
export const jupiterRouteMinimum = ({
	quotedOutAmount,
	slippageBps
}: Pick<JupiterRouteArguments, 'quotedOutAmount' | 'slippageBps'>): bigint =>
	(quotedOutAmount * (BASIS_POINTS - BigInt(slippageBps)) + BASIS_POINTS / 2n) / BASIS_POINTS;

type LifiSolStep =
	| { kind: 'computeUnitLimit'; units: bigint }
	| { kind: 'computeUnitPrice'; microLamports: bigint }
	| { kind: 'feeProgram' }
	| { kind: 'fee'; amount: bigint }
	| { kind: 'wrap' }
	| ({ kind: 'create' } & LifiSolCreatedAccount)
	| { kind: 'close'; account: SolAddress }
	| { kind: 'route'; route: JupiterRouteArguments };

// The repository's parsers throw on an instruction their program does not define.
const parse = <T>({
	parser,
	instruction
}: {
	parser: (instruction: SolInstruction) => T;
	instruction: SolInstruction;
}): T | undefined => {
	try {
		return parser(instruction);
	} catch (_: unknown) {
		return undefined;
	}
};

const accountAddresses = ({ accounts }: SolInstruction): SolAddress[] =>
	(accounts ?? []).map(({ address }) => address);

const hasShape = ({
	instruction: { accounts, data },
	accountsLength,
	dataLength
}: {
	instruction: SolInstruction;
	accountsLength: number;
	dataLength: number;
}): boolean => (accounts ?? []).length === accountsLength && (data ?? []).length === dataLength;

const computeBudgetStep = (instruction: SolInstruction): LifiSolStep | undefined => {
	const parsed = parse({ parser: parseSolComputeBudgetInstruction, instruction });

	if (
		parsed?.instructionType === ComputeBudgetInstruction.SetComputeUnitLimit &&
		hasShape({ instruction, accountsLength: 0, dataLength: 5 })
	) {
		return { kind: 'computeUnitLimit', units: BigInt(parsed.data.units) };
	}

	if (
		parsed?.instructionType === ComputeBudgetInstruction.SetComputeUnitPrice &&
		hasShape({ instruction, accountsLength: 0, dataLength: 9 })
	) {
		return { kind: 'computeUnitPrice', microLamports: BigInt(parsed.data.microLamports) };
	}
};

// The Clock sysvar, then one account the instruction only reads, which does not sign.
const feeProgramStep = ({ data, accounts = [] }: SolInstruction): LifiSolStep | undefined => {
	const [clock, reference, ...others] = accounts;

	if (
		data?.[0] === LIFI_SOLANA_FEE_PROGRAM_DISCRIMINATOR &&
		data.length === LIFI_SOLANA_FEE_PROGRAM_DATA_LENGTH &&
		clock?.address === LIFI_SOLANA_FEE_PROGRAM_CLOCK &&
		nonNullish(reference) &&
		!isSignerRole(reference.role) &&
		!isWritableRole(reference.role) &&
		others.length === 0
	) {
		return { kind: 'feeProgram' };
	}
};

const systemStep = ({
	instruction,
	binding: { userAddress, fromToken },
	accounts: { wrappedSolAccount }
}: {
	instruction: SolInstruction;
	binding: LifiSolBinding;
	accounts: LifiSolDerivedAccounts;
}): LifiSolStep | undefined => {
	const parsed = parse({ parser: parseSolSystemInstruction, instruction });

	if (
		parsed?.instructionType !== SystemInstruction.TransferSol ||
		!hasShape({ instruction, accountsLength: 2, dataLength: 12 }) ||
		parsed.accounts.source.address !== userAddress
	) {
		return;
	}

	const { destination } = parsed.accounts;

	if (destination.address === wrappedSolAccount) {
		return { kind: 'wrap' };
	}

	// LI.FI takes its fee from a native source in SOL, and from an SPL source in that token.
	if (destination.address === LIFI_SOLANA_FEE_WALLET && fromToken === SYSTEM_PROGRAM_ADDRESS) {
		return { kind: 'fee', amount: parsed.data.amount };
	}
};

const associatedTokenStep = ({
	instruction,
	binding: { userAddress }
}: {
	instruction: SolInstruction;
	binding: LifiSolBinding;
}): LifiSolStep | undefined => {
	const parsed = parse({ parser: parseSolAtaInstruction, instruction });

	if (
		parsed?.instructionType !== AssociatedTokenInstruction.CreateAssociatedTokenIdempotent ||
		!hasShape({ instruction, accountsLength: 6, dataLength: 1 })
	) {
		return;
	}

	const { payer, ata, owner, mint, systemProgram, tokenProgram } = parsed.accounts;

	// The associated token program itself refuses an account that is not the one derived from the
	// owner, the mint and the token program.
	if (
		payer.address !== userAddress ||
		owner.address !== userAddress ||
		systemProgram.address !== SYSTEM_PROGRAM_ADDRESS ||
		![TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS].includes(tokenProgram.address)
	) {
		return;
	}

	return {
		kind: 'create',
		account: ata.address,
		mint: mint.address,
		tokenProgram: tokenProgram.address
	};
};

// LI.FI's fee from an SPL source: a `TransferChecked` of the source token by the user, to the fee
// wallet's associated token account for it under the program the instruction calls.
const feeTransferStep = ({
	parsed: {
		accounts: { mint, destination, authority },
		data: { amount }
	},
	instruction,
	binding: { userAddress, fromToken },
	accounts: { feeTokenAccounts }
}: {
	parsed: {
		accounts: Record<'mint' | 'destination' | 'authority', { address: SolAddress }>;
		data: { amount: bigint };
	};
	instruction: SolInstruction;
	binding: LifiSolBinding;
	accounts: LifiSolDerivedAccounts;
}): LifiSolStep | undefined => {
	const feeTokenAccount = feeTokenAccounts[instruction.programAddress];

	if (
		hasShape({ instruction, accountsLength: 4, dataLength: 10 }) &&
		authority.address === userAddress &&
		mint.address === fromToken &&
		nonNullish(feeTokenAccount) &&
		destination.address === feeTokenAccount
	) {
		return { kind: 'fee', amount };
	}
};

const tokenStep = ({
	instruction,
	binding,
	accounts
}: {
	instruction: SolInstruction;
	binding: LifiSolBinding;
	accounts: LifiSolDerivedAccounts;
}): LifiSolStep | undefined => {
	const parsed = parse({ parser: parseSolTokenInstruction, instruction });

	if (
		parsed?.instructionType === TokenInstruction.SyncNative &&
		hasShape({ instruction, accountsLength: 1, dataLength: 1 }) &&
		parsed.accounts.account.address === accounts.wrappedSolAccount
	) {
		return { kind: 'wrap' };
	}

	// Which account it may close depends on the rest of the transaction; who it pays and who signs
	// for it do not.
	if (
		parsed?.instructionType === TokenInstruction.CloseAccount &&
		hasShape({ instruction, accountsLength: 3, dataLength: 1 }) &&
		parsed.accounts.destination.address === binding.userAddress &&
		parsed.accounts.owner.address === binding.userAddress
	) {
		return { kind: 'close', account: parsed.accounts.account.address };
	}

	if (parsed?.instructionType === TokenInstruction.TransferChecked) {
		return feeTransferStep({ parsed, instruction, binding, accounts });
	}
};

const token2022Step = (params: {
	instruction: SolInstruction;
	binding: LifiSolBinding;
	accounts: LifiSolDerivedAccounts;
}): LifiSolStep | undefined => {
	const parsed = parse({ parser: parseSolToken2022Instruction, instruction: params.instruction });

	if (parsed?.instructionType === Token2022Instruction.TransferChecked) {
		return feeTransferStep({ parsed, ...params });
	}
};

// LI.FI's address for native SOL stands for wrapped SOL inside a route.
const routeMint = (token: SolAddress): SolAddress =>
	token === SYSTEM_PROGRAM_ADDRESS ? WSOL_TOKEN.address : token;

/**
 * A Jupiter route spending from the user's own account for the source mint and paying the
 * destination mint into the user's own account for it, signed for by the user.
 *
 * The simulation alone does not bind its source: lamports sent to the user's wrapped SOL account
 * and never synced are not part of its token amount, so a route that syncs and spends them leaves
 * that amount as it was, and the run shows no decrease. Bound to the source account, the route's
 * input is also in the source token's units, which the bound on the amount assumes.
 *
 * Nor does it bind the destination: it counts every token account the user owns, and anyone can
 * open one for the user without their signature. Paid into such an account, the output would still
 * be the user's, but OISY reads and spends only the associated one, so it would be lost to the
 * wallet.
 */
const routeStep = ({
	instruction,
	binding: { userAddress, fromToken, toToken },
	accounts: { sourceTokenAccounts, destinationTokenAccounts }
}: {
	instruction: SolInstruction;
	binding: LifiSolBinding;
	accounts: LifiSolDerivedAccounts;
}): LifiSolStep | undefined => {
	const { data } = instruction;
	const entrypoint = nonNullish(data) ? jupiterEntrypointOf(data) : undefined;
	const route = nonNullish(data) ? decodeJupiterRoute(data) : undefined;

	if (isNullish(entrypoint) || isNullish(route)) {
		return;
	}

	const addresses = accountAddresses(instruction);

	// The user's account under the token program the route names for it, if it names one.
	const userTokenAccount = ({
		program,
		accounts
	}: {
		program: number;
		accounts: Partial<Record<SolAddress, SolAddress>>;
	}): SolAddress | undefined => {
		const tokenProgram = addresses[program];

		return nonNullish(tokenProgram) ? accounts[tokenProgram] : undefined;
	};

	const sourceTokenAccount = userTokenAccount({
		program: entrypoint.sourceTokenProgram,
		accounts: sourceTokenAccounts
	});

	const destinationTokenAccount = userTokenAccount({
		program: entrypoint.destinationTokenProgram,
		accounts: destinationTokenAccounts
	});

	if (
		addresses[entrypoint.userTransferAuthority] !== userAddress ||
		addresses[entrypoint.sourceMint] !== routeMint(fromToken) ||
		addresses[entrypoint.destinationMint] !== routeMint(toToken) ||
		isNullish(sourceTokenAccount) ||
		addresses[entrypoint.sourceTokenAccount] !== sourceTokenAccount ||
		isNullish(destinationTokenAccount) ||
		addresses[entrypoint.destinationTokenAccount] !== destinationTokenAccount ||
		(nonNullish(entrypoint.outputRedirect) &&
			addresses[entrypoint.outputRedirect] !== JUPITER_V6_PROGRAM)
	) {
		return;
	}

	return { kind: 'route', route };
};

/**
 * What one top-level instruction is, if it is one a LI.FI route may contain; `undefined` for any
 * other. Pinned by program and instruction, not by program alone: a known DEX program could
 * otherwise be called for anything, say a withdrawal from a position of the user's that pays
 * someone else, which the wallet's own deltas would not show.
 */
const classify = (params: {
	instruction: SolInstruction;
	binding: LifiSolBinding;
	accounts: LifiSolDerivedAccounts;
}): LifiSolStep | undefined => {
	const { instruction } = params;

	switch (instruction.programAddress) {
		case COMPUTE_BUDGET_PROGRAM_ADDRESS:
			return computeBudgetStep(instruction);
		case LIFI_SOLANA_FEE_PROGRAM:
			return feeProgramStep(instruction);
		case SYSTEM_PROGRAM_ADDRESS:
			return systemStep(params);
		case ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS:
			return associatedTokenStep(params);
		case TOKEN_PROGRAM_ADDRESS:
			return tokenStep(params);
		case TOKEN_2022_PROGRAM_ADDRESS:
			return token2022Step(params);
		case JUPITER_V6_PROGRAM:
			return routeStep(params);
	}
};

/**
 * Refuses a LI.FI Solana transaction unless every top-level instruction is one a LI.FI route through
 * Jupiter contains, and those instructions do what the request asked of them:
 *
 * - exactly one compute unit limit, which the fee is priced from, and at most one price;
 * - LI.FI's fee instructions: its program with only its pinned accounts, and at most one fee
 *   transfer, to its pinned wallet, of at most `LIFI_FEE_BPS` of the amount;
 * - associated token accounts created for the user and paid by the user; the user's own wrapped SOL
 *   account funded by the user and synced;
 * - closes paying the user, of accounts the transaction creates or of the user's wrapped SOL
 *   account (whether that one held wrapped SOL only the simulation says);
 * - exactly one Jupiter route, from the user's own account for the source mint to the destination
 *   mint, whose on-chain minimum output is at least the minimum the user reviewed, with no
 *   platform taking a share, spending no more than the amount less the fee.
 *
 * Returns what the transaction's network fee and the rent of the accounts it creates are priced
 * from.
 */
export const assertLifiSolInstructions = ({
	instructions,
	binding,
	accounts
}: {
	instructions: readonly SolInstruction[];
	binding: LifiSolBinding;
	accounts: LifiSolDerivedAccounts;
}): LifiSolInstructions => {
	const steps = instructions.map((instruction) => {
		const step = classify({ instruction, binding, accounts });

		if (isNullish(step)) {
			throw rejected('an instruction is not one a LI.FI route may contain');
		}

		return step;
	});

	const ofKind = <K extends LifiSolStep['kind']>(kind: K) =>
		steps.filter((step): step is Extract<LifiSolStep, { kind: K }> => step.kind === kind);

	const [limit, ...otherLimits] = ofKind('computeUnitLimit');
	const [price, ...otherPrices] = ofKind('computeUnitPrice');

	// Without a limit the network charges its own default, which no fee read from the message prices.
	if (isNullish(limit) || otherLimits.length > 0 || otherPrices.length > 0) {
		throw rejected('the transaction does not set exactly one compute budget');
	}

	const [fee, ...otherFees] = ofKind('fee');
	const feeAmount = fee?.amount ?? ZERO;

	if (
		ofKind('feeProgram').length > 1 ||
		otherFees.length > 0 ||
		feeAmount * BASIS_POINTS > binding.amount * LIFI_FEE_BPS
	) {
		throw rejected("the transaction's fee exceeds LI.FI's");
	}

	const createdAccounts = ofKind('create').map(({ account, mint, tokenProgram }) => ({
		account,
		mint,
		tokenProgram
	}));

	const closable = [accounts.wrappedSolAccount, ...createdAccounts.map(({ account }) => account)];
	const closes = ofKind('close');

	if (closes.some(({ account }) => !closable.includes(account))) {
		throw rejected('the transaction closes an account it did not create');
	}

	const [route, ...otherRoutes] = ofKind('route');

	if (isNullish(route) || otherRoutes.length > 0) {
		throw rejected('the transaction does not make exactly one Jupiter route');
	}

	const { inAmount, platformFeeBps, positiveSlippageBps } = route.route;

	if (platformFeeBps !== 0 || positiveSlippageBps !== 0) {
		throw rejected('the route gives a platform a share of the output');
	}

	// A slippage above 100 % makes the minimum negative, below any minimum displayed.
	if (jupiterRouteMinimum(route.route) < binding.displayedToAmountMin) {
		throw rejected('the on-chain minimum output is below the one displayed');
	}

	if (inAmount + feeAmount > binding.amount) {
		throw rejected('the route spends more than the amount');
	}

	return {
		computeUnitLimit: limit.units,
		...(nonNullish(price) && { computeUnitPrice: price.microLamports }),
		createdAccounts,
		closesWrappedSolAccount: closes.some(({ account }) => account === accounts.wrappedSolAccount)
	};
};

/**
 * The network fee a version 0 transaction pays: its priority fee, as its own Compute Budget
 * instructions set it, plus the base fee of each signature.
 */
export const lifiSolNetworkFee = ({
	computeUnitLimit,
	computeUnitPrice,
	signatures,
	instructionsCount
}: Pick<LifiSolInstructions, 'computeUnitLimit' | 'computeUnitPrice'> & {
	signatures: number;
	instructionsCount: number;
}): bigint =>
	SOLANA_LAMPORTS_PER_SIGNATURE * BigInt(signatures) +
	(calculateSolPrioritizationFee({ computeUnitPrice, computeUnitLimit, instructionsCount }) ??
		ZERO);

// The account extensions Token-2022 adds to an account at initialisation for its mint's own: the
// token program's whole mapping (`required_init_account_extensions`).
const REQUIRED_ACCOUNT_EXTENSIONS: Partial<Record<Extension['__kind'], ExtensionArgs>> = {
	TransferFeeConfig: { __kind: 'TransferFeeAmount', withheldAmount: ZERO },
	NonTransferable: { __kind: 'NonTransferableAccount' },
	TransferHook: { __kind: 'TransferHookAccount', transferring: false },
	PausableConfig: { __kind: 'PausableAccount' }
};

// The mint extensions that add nothing to an account.
const MINT_ONLY_EXTENSIONS: Extension['__kind'][] = [
	'MintCloseAuthority',
	'ConfidentialTransferMint',
	'DefaultAccountState',
	'InterestBearingConfig',
	'PermanentDelegate',
	'ConfidentialTransferFee',
	'MetadataPointer',
	'TokenMetadata',
	'GroupPointer',
	'TokenGroup',
	'GroupMemberPointer',
	'TokenGroupMember',
	'ConfidentialMintBurn',
	'ScaledUiAmountConfig'
];

/**
 * The size of the associated token account Token-2022 creates for a mint with these extensions:
 * `ImmutableOwner`, which every associated token account gets, plus the account extensions the
 * mint's own require. `undefined` for an extension neither list places, whose account cannot be
 * sized.
 */
export const token2022AccountSize = (mintExtensions: Extension['__kind'][]): bigint | undefined => {
	if (
		mintExtensions.some(
			(kind) => isNullish(REQUIRED_ACCOUNT_EXTENSIONS[kind]) && !MINT_ONLY_EXTENSIONS.includes(kind)
		)
	) {
		return;
	}

	const required = mintExtensions
		.map((kind) => REQUIRED_ACCOUNT_EXTENSIONS[kind])
		.filter(nonNullish);

	return BigInt(getTokenSize([{ __kind: 'ImmutableOwner' }, ...required]));
};

const sumDeltas = ({
	deltas,
	tokenAddress
}: {
	deltas: NonNullable<SolSimulationResult['preview']>['tokenDeltas'];
	tokenAddress: SolAddress;
}): bigint =>
	deltas.reduce(
		(acc, { tokenAddress: address, delta }) => (address === tokenAddress ? acc + delta : acc),
		ZERO
	);

/**
 * Refuses a LI.FI Solana transaction unless a simulation of its exact bytes, with the pre-state read
 * at the slot it ran at, shows it doing only what the request asked, within `ceiling`, the LI.FI
 * ceiling of this very transaction (its network fee and the rent of every account it creates):
 *
 * - no control change on any account of the user's, and every token account it creates left to the
 *   user alone;
 * - no account of the user's closed but their wrapped SOL account, and that one only if it held no
 *   wrapped SOL: the lamports it held are then the user's own coming back, and are not counted as
 *   received;
 * - no program called but known ones and the pinned LI.FI ones;
 * - no more than the amount of the source token spent, no other token account of the user's
 *   decreasing, and no more SOL spent than the amount of a native source plus `ceiling`;
 * - at least the reviewed minimum of the destination token received, or for native SOL, at least
 *   that minimum less `ceiling`, since the wallet's lamport change is net of the fee and the rent.
 *
 * A simulation that failed, timed out or could not be read at one slot refuses the transaction.
 */
export const assertLifiSolSimulation = ({
	result,
	binding: { userAddress, fromToken, toToken, amount, displayedToAmountMin },
	wrappedSolAccount,
	ceiling
}: {
	result: SolSimulationResult | undefined;
	binding: LifiSolBinding;
	wrappedSolAccount: SolAddress;
	ceiling: bigint;
}) => {
	if (isNullish(result)) {
		throw rejected('the simulation failed');
	}

	const { preview, unreadPrograms } = result;

	if (unreadPrograms.some((program) => !LIFI_SOLANA_PROGRAM_ADDRESSES.includes(program))) {
		throw rejected('the route calls a program outside the pinned ones');
	}

	if (isNullish(preview)) {
		throw rejected('the simulation shows nothing received');
	}

	const {
		solDelta = ZERO,
		tokenDeltas,
		controlChanges,
		createdAccounts = [],
		closedAccounts = []
	} = preview;

	// A closed account is reported holding no lamports as a System account, which reads as a change of
	// its program and owner. Nothing is left to control there; the close rules below hold it instead.
	if (
		controlChanges.some(
			({ account }) => !closedAccounts.some(({ account: closed }) => closed === account)
		)
	) {
		throw rejected("the transaction changes who controls an account of the user's");
	}

	if (
		createdAccounts.some(
			({ owner, delegate, closeAuthority }) =>
				owner !== userAddress ||
				nonNullish(delegate) ||
				(nonNullish(closeAuthority) && closeAuthority !== userAddress)
		)
	) {
		throw rejected('the transaction creates an account the user does not control alone');
	}

	// A closed account's balance going to zero is its only token delta: one listed held some.
	if (
		closedAccounts.some(
			({ account }) =>
				account !== wrappedSolAccount ||
				tokenDeltas.some(({ account: deltaAccount }) => deltaAccount === account)
		)
	) {
		throw rejected("the transaction closes an account of the user's");
	}

	const solReceived = solDelta - closedAccounts.reduce((acc, { lamports }) => acc + lamports, ZERO);

	// A native source's address is the System Program's, which no token delta carries: every token
	// account decreasing is then refused, and the SOL bound takes the amount.
	if (
		sumDeltas({ deltas: tokenDeltas, tokenAddress: fromToken }) < -amount ||
		tokenDeltas.some(({ tokenAddress, delta }) => delta < ZERO && tokenAddress !== fromToken) ||
		solReceived < -(fromToken === SYSTEM_PROGRAM_ADDRESS ? amount : ZERO) - ceiling
	) {
		throw rejected('the transaction spends more than the amount');
	}

	const received =
		toToken === SYSTEM_PROGRAM_ADDRESS
			? solReceived + ceiling
			: sumDeltas({ deltas: tokenDeltas, tokenAddress: toToken });

	if (received < displayedToAmountMin) {
		throw rejected('the transaction receives less than the minimum displayed');
	}
};
