import {
	VELORA_AUGUSTUS_CAP_SURPLUS_FLAG,
	VELORA_AUGUSTUS_FEE_BPS_MASK,
	VELORA_AUGUSTUS_PARTNER_SURPLUS_FLAGS,
	VELORA_AUGUSTUS_SELL_ABI,
	VELORA_BALANCER_V2_BATCH_SWAP_SELECTOR,
	VELORA_BALANCER_V2_SWAP_SELECTOR,
	VELORA_DELTA_CAP_SURPLUS_FLAG,
	VELORA_DELTA_FEE_BPS_MASK,
	VELORA_DELTA_ORDER_KIND_SELL,
	VELORA_DELTA_ORDER_TYPES,
	VELORA_DELTA_PARTNER_TAKES_SURPLUS_FLAG
} from '$eth/constants/velora.constants';
import { ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { SWAP_ETH_TOKEN_PLACEHOLDER } from '$lib/constants/swap.constants';
import { VeloraSwapRejectedError } from '$lib/types/errors';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { DeltaAuctionOrder, DeltaRoute, TransactionParams } from '@velora-dex/sdk';
import { Interface, type Result } from 'ethers/abi';
import { TypedDataEncoder } from 'ethers/hash';
import { dataSlice, toBeHex, toBigInt } from 'ethers/utils';

const BASIS_POINTS = 10_000n;

const ADDRESS_MASK = (1n << 160n) - 1n;

// The sale a Market transaction's calldata makes, as Augustus reads it.
interface VeloraMarketSale {
	srcToken: string;
	destToken: string;
	fromAmount: bigint;
	toAmount: bigint;
	beneficiary: string;
	partnerAndFee: bigint;
	// The amount Augustus' fee step measures the surplus from; an RFQ fill runs no fee step.
	quotedAmount?: bigint;
}

// `IAugustusRFQ.Order`, as far as the check reads it.
interface RfqOrderAssets {
	takerAsset: string;
	makerAsset: string;
}

const augustus = new Interface(VELORA_AUGUSTUS_SELL_ABI);

export const veloraRejectedError = (reason: string): VeloraSwapRejectedError =>
	new VeloraSwapRejectedError(`Velora swap rejected: ${reason}`);

const isSameAddress = ({ actual, expected }: { actual: string; expected: string }): boolean =>
	areAddressesEqual({ address1: actual, address2: expected, addressType: 'Eth' });

// A zero beneficiary is paid to the caller: the wallet, which signs the order or sends the
// transaction.
const isWalletBeneficiary = ({
	beneficiary,
	wallet
}: {
	beneficiary: string;
	wallet: string;
}): boolean =>
	isSameAddress({ actual: beneficiary, expected: wallet }) ||
	isSameAddress({ actual: beneficiary, expected: ZERO_ETH_ADDRESS });

const isSameHex = ({ actual, expected }: { actual: string; expected: string }): boolean =>
	actual.toLowerCase() === expected.toLowerCase();

// Velora quotes the partner fee in percent; the signed order and calldata carry whole basis points.
// The quote is read to a ten-thousandth of a basis point, which drops float noise (0.29 % is 29
// basis points, not 28.999…), and rounded down, so that a quote between two basis points allows the
// lower one.
const quotedFeeBasisPoints = (feePercent: number): bigint =>
	BigInt(Math.floor(Math.round(feePercent * 1_000_000) / 10_000));

const slippageExceeded = ({ signed, minimum }: { signed: bigint; minimum: bigint }): Error =>
	new Error(`Slippage exceeded. Velora returned ${signed}, expected at least ${minimum}.`);

/**
 * The minimum Velora signs for a quoted amount: the amount less the slippage in whole basis
 * points, rounded down. Computed on integers, as Velora does, so that it matches the signed minimum
 * to the unit.
 */
export const veloraMinimumAmount = ({
	amount,
	slippageBasisPoints
}: {
	amount: bigint;
	slippageBasisPoints: number;
}): bigint => (amount * (BASIS_POINTS - BigInt(slippageBasisPoints))) / BASIS_POINTS;

// `amount` of the order's token in the units of the token the bridge delivers: the settlement
// scales it by ten to the power of `scalingFactor` on the destination network.
const bridgeScaledAmount = ({
	amount,
	scalingFactor
}: {
	amount: bigint;
	scalingFactor: number;
}): bigint =>
	scalingFactor >= 0
		? amount * 10n ** BigInt(scalingFactor)
		: amount / 10n ** BigInt(-scalingFactor);

/**
 * Refuses a Delta route that does not sell the reviewed amount of the source token for the
 * destination token, on their networks. The order settles the route's origin step while the review
 * shows its destination step, so a same-chain route, which needs no bridge, must make both the same,
 * and a cross-chain route must carry a bridge the order format can encode, bridge to the destination
 * token and show no more than its origin step comes to once the bridge scales it.
 *
 * Run before the approval or permit, so that a refused route costs neither.
 */
export const assertVeloraDeltaRoute = ({
	route: { origin, destination, bridge },
	sourceTokenAddress,
	sourceChainId,
	destinationTokenAddress,
	destinationChainId,
	amount
}: {
	route: DeltaRoute;
	sourceTokenAddress: string;
	sourceChainId: bigint;
	destinationTokenAddress: string;
	destinationChainId: bigint;
	amount: bigint;
}) => {
	if (
		!isSameAddress({ actual: origin.input.token.address, expected: sourceTokenAddress }) ||
		BigInt(origin.input.token.chainId) !== sourceChainId ||
		BigInt(origin.input.amount) !== amount
	) {
		throw veloraRejectedError('the route does not sell the reviewed amount of the source token');
	}

	if (
		!isSameAddress({
			actual: destination.output.token.address,
			expected: destinationTokenAddress
		}) ||
		BigInt(destination.output.token.chainId) !== destinationChainId
	) {
		throw veloraRejectedError('the route does not buy the reviewed token');
	}

	if (sourceChainId !== destinationChainId) {
		if (isNullish(bridge)) {
			throw veloraRejectedError('the cross-chain route has no bridge');
		}

		// The order carrying this bridge is hashed only after the approval or permit, so a bridge
		// the order format cannot encode is refused here, before either.
		try {
			TypedDataEncoder.hashStruct(
				'Bridge',
				{ Bridge: VELORA_DELTA_ORDER_TYPES.Bridge },
				{ ...bridge.contractParams, destinationChainId }
			);
		} catch (_: unknown) {
			throw veloraRejectedError('the bridge cannot be signed');
		}

		const {
			contractParams: { outputToken, scalingFactor }
		} = bridge;

		if (!isSameAddress({ actual: outputToken, expected: destinationTokenAddress })) {
			throw veloraRejectedError('the bridge does not deliver the reviewed token');
		}

		if (
			BigInt(destination.output.amount) >
			bridgeScaledAmount({ amount: BigInt(origin.output.amount), scalingFactor })
		) {
			throw veloraRejectedError('the cross-chain route shows more than its bridge delivers');
		}

		return;
	}

	if (
		nonNullish(bridge) ||
		!isSameAddress({
			actual: origin.output.token.address,
			expected: destination.output.token.address
		}) ||
		BigInt(origin.output.amount) !== BigInt(destination.output.amount)
	) {
		throw veloraRejectedError('the same-chain route settles another amount than the one shown');
	}
};

/**
 * Refuses a built Delta order that is not the reviewed swap. It must be the wallet's sell order for
 * the route's origin step, paid to the wallet, carrying the permit OISY signed for it (or none), no
 * partner fee above the quoted one, the surplus terms Velora builds for OISY (no partner share, the
 * cap, measured from at least the route's origin output), and the route's own bridge, or none on a
 * same-chain route.
 *
 * The order is then hashed with OISY's own EIP-712 domain and types, so this is what gets signed.
 */
export const assertVeloraDeltaOrder = ({
	order,
	route: { origin, bridge },
	wallet,
	amount,
	permit,
	feePercent,
	destinationChainId
}: {
	order: DeltaAuctionOrder;
	route: DeltaRoute;
	wallet: string;
	amount: bigint;
	permit: string;
	feePercent: number;
	destinationChainId: bigint;
}) => {
	if (
		!isSameAddress({ actual: order.owner, expected: wallet }) ||
		!isWalletBeneficiary({ beneficiary: order.beneficiary, wallet })
	) {
		throw veloraRejectedError('the order is not paid to the wallet');
	}

	if (
		order.kind !== VELORA_DELTA_ORDER_KIND_SELL ||
		!isSameAddress({ actual: order.srcToken, expected: origin.input.token.address }) ||
		!isSameAddress({ actual: order.destToken, expected: origin.output.token.address }) ||
		BigInt(order.srcAmount) !== amount
	) {
		throw veloraRejectedError('the order does not sell the reviewed amount for the routed token');
	}

	if (!isSameHex({ actual: order.permit, expected: permit })) {
		throw veloraRejectedError('the order carries another permit');
	}

	if (
		(BigInt(order.partnerAndFee) & VELORA_DELTA_FEE_BPS_MASK) >
		quotedFeeBasisPoints(feePercent)
	) {
		throw veloraRejectedError('the order takes a partner fee above the quoted one');
	}

	if ((BigInt(order.partnerAndFee) & VELORA_DELTA_PARTNER_TAKES_SURPLUS_FLAG) !== ZERO) {
		throw veloraRejectedError('the order gives a partner the surplus');
	}

	if ((BigInt(order.partnerAndFee) & VELORA_DELTA_CAP_SURPLUS_FLAG) === ZERO) {
		throw veloraRejectedError('the order does not cap the surplus');
	}

	if (BigInt(order.expectedAmount) < BigInt(origin.output.amount)) {
		throw veloraRejectedError('the order measures the surplus from less than its route');
	}

	const expectedBridge = isNullish(bridge)
		? {
				protocolSelector: '0x00000000',
				destinationChainId: ZERO,
				outputToken: ZERO_ETH_ADDRESS,
				scalingFactor: 0,
				protocolData: '0x'
			}
		: { ...bridge.contractParams, destinationChainId };

	if (
		!isSameHex({
			actual: order.bridge.protocolSelector,
			expected: expectedBridge.protocolSelector
		}) ||
		BigInt(order.bridge.destinationChainId) !== expectedBridge.destinationChainId ||
		!isSameAddress({ actual: order.bridge.outputToken, expected: expectedBridge.outputToken }) ||
		order.bridge.scalingFactor !== expectedBridge.scalingFactor ||
		!isSameHex({ actual: order.bridge.protocolData, expected: expectedBridge.protocolData })
	) {
		throw veloraRejectedError('the order bridges other than the route');
	}
};

// `BalancerV2Utils._decodeBalancerV2Params`: Augustus reads the tokens of the vault call it
// forwards at fixed offsets, not through the vault's ABI, so they are read the same way here. The
// vault names native ETH by the zero address, Augustus by the placeholder.
const balancerV2Tokens = (vaultCall: string): Pick<VeloraMarketSale, 'srcToken' | 'destToken'> => {
	const args = dataSlice(vaultCall, 4);

	const word = (offset: number): string => dataSlice(args, offset, offset + 32);

	const token = (offset: number): string => {
		const address = dataSlice(word(offset), 12);

		return isSameAddress({ actual: address, expected: ZERO_ETH_ADDRESS })
			? SWAP_ETH_TOKEN_PLACEHOLDER
			: address;
	};

	const selector = dataSlice(vaultCall, 0, 4);

	if (isSameHex({ actual: selector, expected: VELORA_BALANCER_V2_SWAP_SELECTOR })) {
		return { srcToken: token(288), destToken: token(320) };
	}

	if (isSameHex({ actual: selector, expected: VELORA_BALANCER_V2_BATCH_SWAP_SELECTOR })) {
		const assetsOffset = Number(toBigInt(word(64)));
		const first = assetsOffset + 32;
		const last = assetsOffset + Number(toBigInt(word(assetsOffset))) * 32;

		// Kind 1, GIVEN_OUT, lists the assets from the destination back.
		return toBigInt(word(0)) === 1n
			? { srcToken: token(last), destToken: token(first) }
			: { srcToken: token(first), destToken: token(last) };
	}

	throw veloraRejectedError('the Balancer V2 call is not one Augustus reads');
};

const toMarketSale = ({ name, args }: { name: string; args: Result }): VeloraMarketSale => {
	if (name === 'swapExactAmountInOnBalancerV2') {
		const [balancerData, partnerAndFee, , vaultCall] = args;
		const { fromAmount, toAmount, quotedAmount, beneficiaryAndApproveFlag } =
			balancerData.toObject();

		return {
			...balancerV2Tokens(vaultCall),
			fromAmount,
			toAmount,
			beneficiary: toBeHex(beneficiaryAndApproveFlag & ADDRESS_MASK, 20),
			partnerAndFee,
			quotedAmount
		};
	}

	if (name === 'swapOnAugustusRFQTryBatchFill') {
		const [data, orders] = args;
		const { fromAmount, toAmount, wrapApproveDirection, beneficiary } = data.toObject();

		// Bits 0–1 wrap or unwrap native ETH, bit 3 buys an exact amount: OISY asks for neither.
		if ((Number(wrapApproveDirection) & 0b1011) !== 0) {
			throw veloraRejectedError('the RFQ fill wraps native ETH or buys an exact amount');
		}

		const assets: RfqOrderAssets[] = orders.map(
			(info: Result): RfqOrderAssets => info.toObject(true).order
		);
		const [first] = assets;

		if (
			isNullish(first) ||
			assets.some(
				({ takerAsset, makerAsset }) =>
					!isSameAddress({ actual: takerAsset, expected: first.takerAsset }) ||
					!isSameAddress({ actual: makerAsset, expected: first.makerAsset })
			)
		) {
			throw veloraRejectedError('the RFQ orders do not all trade the same tokens');
		}

		// Augustus sells the first order's taker asset for its maker asset.
		return {
			srcToken: first.takerAsset,
			destToken: first.makerAsset,
			fromAmount,
			toAmount,
			beneficiary,
			partnerAndFee: ZERO
		};
	}

	// The generic route takes the executor first; every other route starts with its swap data.
	const [swapData, partnerAndFee] = name === 'swapExactAmountIn' ? args.slice(1) : args;
	const { srcToken, destToken, fromAmount, toAmount, quotedAmount, beneficiary } =
		swapData.toObject();

	return { srcToken, destToken, fromAmount, toAmount, beneficiary, partnerAndFee, quotedAmount };
};

const decodeMarketSale = (data: string): VeloraMarketSale => {
	try {
		const transaction = augustus.parseTransaction({ data });

		if (isNullish(transaction)) {
			throw veloraRejectedError('the transaction calls an Augustus function OISY does not read');
		}

		return toMarketSale(transaction);
	} catch (err: unknown) {
		if (err instanceof VeloraSwapRejectedError) {
			throw err;
		}

		throw veloraRejectedError('the transaction calldata cannot be read');
	}
};

/**
 * Refuses a Market transaction that is not the reviewed swap: it must call the pinned Augustus on
 * the source network, send native ETH only when selling it, and sell exactly the reviewed amount of
 * the source token for the destination token, to the wallet, with no partner fee above the quoted
 * one, the surplus terms Velora builds for OISY (no partner share, the cap, measured from at least
 * the quoted amount) and at least the minimum the review states. Augustus pays out at least that
 * minimum or reverts.
 */
export const assertVeloraMarketTransaction = ({
	transaction: { to, chainId, value, data },
	augustusAddress,
	sourceChainId,
	srcToken,
	destToken,
	amount,
	isNativeSource,
	minimum,
	quotedAmount,
	feePercent,
	wallet
}: {
	transaction: TransactionParams;
	augustusAddress: string;
	sourceChainId: bigint;
	srcToken: string;
	destToken: string;
	amount: bigint;
	isNativeSource: boolean;
	minimum: bigint;
	quotedAmount: bigint;
	feePercent: number;
	wallet: string;
}) => {
	if (
		!isSameAddress({ actual: to, expected: augustusAddress }) ||
		BigInt(chainId) !== sourceChainId
	) {
		throw veloraRejectedError('the transaction does not call Augustus on the source network');
	}

	if (BigInt(value) !== (isNativeSource ? amount : ZERO)) {
		throw veloraRejectedError('the transaction sends another native amount than the swap');
	}

	const sale = decodeMarketSale(data);

	if (
		!isSameAddress({ actual: sale.srcToken, expected: srcToken }) ||
		!isSameAddress({ actual: sale.destToken, expected: destToken }) ||
		sale.fromAmount !== amount
	) {
		throw veloraRejectedError(
			'the transaction does not sell the reviewed amount for the reviewed token'
		);
	}

	if (!isWalletBeneficiary({ beneficiary: sale.beneficiary, wallet })) {
		throw veloraRejectedError('the transaction is not paid to the wallet');
	}

	if ((sale.partnerAndFee & VELORA_AUGUSTUS_FEE_BPS_MASK) > quotedFeeBasisPoints(feePercent)) {
		throw veloraRejectedError('the transaction takes a partner fee above the quoted one');
	}

	if (nonNullish(sale.quotedAmount)) {
		if ((sale.partnerAndFee & VELORA_AUGUSTUS_PARTNER_SURPLUS_FLAGS) !== ZERO) {
			throw veloraRejectedError('the transaction gives a partner the surplus');
		}

		if ((sale.partnerAndFee & VELORA_AUGUSTUS_CAP_SURPLUS_FLAG) === ZERO) {
			throw veloraRejectedError('the transaction does not cap the surplus');
		}

		if (sale.quotedAmount < quotedAmount) {
			throw veloraRejectedError('the transaction measures the surplus from less than the quote');
		}
	}

	if (sale.toAmount < minimum) {
		throw slippageExceeded({ signed: sale.toAmount, minimum });
	}
};
