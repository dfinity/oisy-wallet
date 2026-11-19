// What OISY signs for Velora, as the contracts verify it. The Delta order's EIP-712 domain and
// types are those of the pinned Delta contract (`Portikus` 2.0.0); a Delta order is hashed with
// them, never with the ones the API returns. The Augustus v6.2 functions are taken from its verified
// source (Sourcify, checked on 2026-10-23) and against real Velora calldata; a Market transaction
// calling any other function is refused before it is decoded.

export const VELORA_DELTA_EIP712_DOMAIN = {
	name: 'Portikus',
	version: '2.0.0'
};

export const VELORA_DELTA_ORDER_TYPES = {
	Order: [
		{ name: 'owner', type: 'address' },
		{ name: 'beneficiary', type: 'address' },
		{ name: 'srcToken', type: 'address' },
		{ name: 'destToken', type: 'address' },
		{ name: 'srcAmount', type: 'uint256' },
		{ name: 'destAmount', type: 'uint256' },
		{ name: 'expectedAmount', type: 'uint256' },
		{ name: 'deadline', type: 'uint256' },
		{ name: 'kind', type: 'uint8' },
		{ name: 'nonce', type: 'uint256' },
		{ name: 'partnerAndFee', type: 'uint256' },
		{ name: 'permit', type: 'bytes' },
		{ name: 'metadata', type: 'bytes' },
		{ name: 'bridge', type: 'Bridge' }
	],
	Bridge: [
		{ name: 'protocolSelector', type: 'bytes4' },
		{ name: 'destinationChainId', type: 'uint256' },
		{ name: 'outputToken', type: 'address' },
		{ name: 'scalingFactor', type: 'int8' },
		{ name: 'protocolData', type: 'bytes' }
	]
};

// `OrderKind.Sell`: OISY only sells a given amount.
export const VELORA_DELTA_ORDER_KIND_SELL = 0;

// The low byte of a Delta order's `partnerAndFee`: the partner fee in basis points
// (`FeeManagerLib.FEE_IN_BASIS_POINTS_MASK` of the settlement modules).
export const VELORA_DELTA_FEE_BPS_MASK = 0xffn;

// `FeeManagerLib` splits what a Delta fill brings above the order's `expectedAmount`: half goes to
// Velora, the other half to the partner when `PARTNER_TAKES_SURPLUS_MASK` is set, and
// `CAP_SURPLUS_MASK` caps the split at 1 % of `expectedAmount`.
export const VELORA_DELTA_PARTNER_TAKES_SURPLUS_FLAG = 0x100n;
export const VELORA_DELTA_CAP_SURPLUS_FLAG = 0x200n;

// `AugustusFees.FEE_PERCENT_IN_BASIS_POINTS_MASK`
export const VELORA_AUGUSTUS_FEE_BPS_MASK = 0x3fffn;

// `AugustusFees` takes what a Market fill brings above the calldata's `quotedAmount` for Velora,
// shares it with the partner on `IS_TAKE_SURPLUS_MASK` or `IS_REFERRAL_MASK`, and
// `IS_CAP_SURPLUS_MASK` caps it at 1 % of `quotedAmount`.
export const VELORA_AUGUSTUS_PARTNER_SURPLUS_FLAGS = (1n << 95n) | (1n << 94n);
export const VELORA_AUGUSTUS_CAP_SURPLUS_FLAG = 1n << 92n;

const SWAP_DATA_HEAD =
	'address srcToken, address destToken, uint256 fromAmount, uint256 toAmount, uint256 quotedAmount, bytes32 metadata';

const RFQ_ORDER =
	'tuple(uint256 nonceAndMeta, uint128 expiry, address makerAsset, address takerAsset, address maker, address taker, uint256 makerAmount, uint256 takerAmount)';

// Augustus v6.2: every function that sells an exact amount, OISY's only swap side.
export const VELORA_AUGUSTUS_SELL_ABI = [
	`function swapExactAmountIn(address executor, tuple(${SWAP_DATA_HEAD}, address beneficiary) swapData, uint256 partnerAndFee, bytes permit, bytes executorData)`,
	`function swapExactAmountInOnUniswapV2(tuple(${SWAP_DATA_HEAD}, address beneficiary, bytes pools) uniData, uint256 partnerAndFee, bytes permit)`,
	`function swapExactAmountInOnUniswapV3(tuple(${SWAP_DATA_HEAD}, address beneficiary, bytes pools) uniData, uint256 partnerAndFee, bytes permit)`,
	`function swapExactAmountInOnCurveV1(tuple(uint256 curveData, uint256 curveAssets, ${SWAP_DATA_HEAD}, address beneficiary) curveV1Data, uint256 partnerAndFee, bytes permit)`,
	`function swapExactAmountInOnCurveV2(tuple(uint256 curveData, uint256 i, uint256 j, address poolAddress, ${SWAP_DATA_HEAD}, address beneficiary) curveV2Data, uint256 partnerAndFee, bytes permit)`,
	'function swapExactAmountInOnBalancerV2(tuple(uint256 fromAmount, uint256 toAmount, uint256 quotedAmount, bytes32 metadata, uint256 beneficiaryAndApproveFlag) balancerData, uint256 partnerAndFee, bytes permit, bytes data)',
	`function swapOnAugustusRFQTryBatchFill(tuple(uint256 fromAmount, uint256 toAmount, uint8 wrapApproveDirection, bytes32 metadata, address beneficiary) data, tuple(${RFQ_ORDER} order, bytes signature, uint256 takerTokenFillAmount, bytes permitTakerAsset, bytes permitMakerAsset)[] orders, bytes permit)`
];

// The Balancer V2 vault calls `swapExactAmountInOnBalancerV2` forwards, by the selector
// `BalancerV2Utils._decodeBalancerV2Params` reads its tokens for.
export const VELORA_BALANCER_V2_SWAP_SELECTOR = '0x52bbbe29';
export const VELORA_BALANCER_V2_BATCH_SWAP_SELECTOR = '0x945bcec9';
