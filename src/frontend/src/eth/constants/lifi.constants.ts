import { ChainId } from '@lifi/sdk';

// The LI.FI Diamond functions OISY decodes or calls, with their structs as deployed: taken from the
// facet sources in https://github.com/lifinance/contracts and checked on 2026-10-19 against each
// pinned Diamond's `DiamondLoupe.facetAddress`, and against real quote calldata. A quote calling any
// other function is refused before it is decoded.

// `ILiFi.BridgeData`
const BRIDGE_DATA =
	'tuple(bytes32 transactionId, string bridge, string integrator, address referrer, address sendingAssetId, address receiver, uint256 minAmount, uint256 destinationChainId, bool hasSourceSwaps, bool hasDestinationCall)';

// `LibSwap.SwapData`
const SWAP_DATA =
	'tuple(address callTo, address approveTo, address sendingAssetId, address receivingAssetId, uint256 fromAmount, bytes callData, bool requiresDeposit)';

// `AcrossFacetV4.AcrossV4Data` (facet 1.0.0)
const ACROSS_V4_DATA =
	'tuple(bytes32 receiverAddress, bytes32 refundAddress, bytes32 sendingAssetId, bytes32 receivingAssetId, uint256 outputAmount, uint128 outputAmountMultiplier, bytes32 exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityParameter, bytes message)';

// `NEARIntentsFacet.NEARIntentsData` (facet 3.0.0)
const NEAR_INTENTS_DATA =
	'tuple(bytes32 nonEVMReceiver, bytes32 destinationAsset, address depositAddress, bytes32 quoteId, uint256 deadline, uint256 minAmountOut, address refundRecipient, bytes signature)';

const GENERIC_SWAP_HEAD =
	'bytes32 _transactionId, string _integrator, string _referrer, address _receiver, uint256 _minAmountOut';

// `GenericSwapFacetV3`: every function a same-chain route calls.
export const LIFI_GENERIC_SWAP_ABI = [
	`function swapTokensSingleV3ERC20ToERC20(${GENERIC_SWAP_HEAD}, ${SWAP_DATA} _swapData)`,
	`function swapTokensSingleV3ERC20ToNative(${GENERIC_SWAP_HEAD}, ${SWAP_DATA} _swapData)`,
	`function swapTokensSingleV3NativeToERC20(${GENERIC_SWAP_HEAD}, ${SWAP_DATA} _swapData)`,
	`function swapTokensMultipleV3ERC20ToERC20(${GENERIC_SWAP_HEAD}, ${SWAP_DATA}[] _swapData)`,
	`function swapTokensMultipleV3ERC20ToNative(${GENERIC_SWAP_HEAD}, ${SWAP_DATA}[] _swapData)`,
	`function swapTokensMultipleV3NativeToERC20(${GENERIC_SWAP_HEAD}, ${SWAP_DATA}[] _swapData)`
];

export const LIFI_ACROSS_V4_ABI = [
	`function startBridgeTokensViaAcrossV4(${BRIDGE_DATA} _bridgeData, ${ACROSS_V4_DATA} _acrossData)`,
	`function swapAndStartBridgeTokensViaAcrossV4(${BRIDGE_DATA} _bridgeData, ${SWAP_DATA}[] _swapData, ${ACROSS_V4_DATA} _acrossData)`
];

export const LIFI_NEAR_INTENTS_ABI = [
	`function startBridgeTokensViaNEARIntents(${BRIDGE_DATA} _bridgeData, ${NEAR_INTENTS_DATA} _nearData)`,
	`function swapAndStartBridgeTokensViaNEARIntents(${BRIDGE_DATA} _bridgeData, ${SWAP_DATA}[] _swapData, ${NEAR_INTENTS_DATA} _nearData)`
];

// `FeeForwarder.FeeDistribution` (2.0.0)
const FEE_DISTRIBUTION = 'tuple(address recipient, uint256 amount)';

// `FeeForwarder`, which LI.FI's fee collection calls as the first swap of a route.
export const LIFI_FEE_FORWARDER_ABI = [
	`function forwardERC20Fees(address _token, ${FEE_DISTRIBUTION}[] _distributions)`,
	`function forwardNativeFees(${FEE_DISTRIBUTION}[] _distributions)`
];

export const LIFI_WHITELIST_MANAGER_ABI = [
	'function isContractSelectorWhitelisted(address _contract, bytes4 _selector) view returns (bool)'
];

// `LiFiData.NON_EVM_ADDRESS`: `bridgeData.receiver` of a route to a non-EVM chain, whose receiver is
// in the facet's own data instead.
export const LIFI_NON_EVM_ADDRESS = '0x11f111f111f111F111f111f111F111f111f111F1';

// `SwapperV2.APPROVE_TO_ONLY_SELECTOR`: an `approveTo` other than the swap's `callTo` must be
// whitelisted under this selector, rather than under the call's.
export const LIFI_APPROVE_TO_ONLY_SELECTOR = '0xffffffff';

// LI.FI's fee, in basis points of the amount: what every captured route forwards (2026-10-19), and
// OISY charges none on top. A route may forward no more; if LI.FI raises it, its routes are refused
// rather than charged more than was quoted.
export const LIFI_FEE_BPS = 25n;

// `AcrossFacetV4.MULTIPLIER_BASE`: the facet pays `minAmount * outputAmountMultiplier` over this.
export const LIFI_ACROSS_MULTIPLIER_BASE = 10n ** 18n;

// How far ahead an Across deposit's fill deadline may be, after which an unfilled deposit is
// refunded: LI.FI sets it 2.5 h ahead in every live quote, while the SpokePools accept up to 6 h
// (`fillDeadlineBuffer`, read on Arbitrum, Base and Robinhood Chain, 2026-10-20). The margin covers
// the quote's age and a client clock off by minutes.
export const LIFI_ACROSS_MAX_FILL_DEADLINE_SECONDS = 3n * 60n * 60n;

// The wrapped native token of Across's SpokePool on each destination chain: what its
// `wrappedNativeToken()` answered on 2026-10-20, at the SpokePools of LI.FI's `config/across.json`
// (the same tokens as its `config/networks.json`). The SpokePool unwraps it for a wallet
// recipient, whatever was asked for, so it is both how Across pays out a native coin and a token
// Across can never pay out as itself. A chain without an entry gets no payout through Across.
export const LIFI_ACROSS_WRAPPED_NATIVE: Partial<Record<number, string>> = {
	[ChainId.ETH]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
	[ChainId.ARB]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
	[ChainId.BAS]: '0x4200000000000000000000000000000000000006',
	[ChainId.POL]: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
	[ChainId.BSC]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
	// Robinhood Chain
	[ChainId.OUT]: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73'
};

// The asset NEAR Intents names for any chain's native coin, EVM or Solana, in `destinationAsset`.
export const LIFI_NEAR_INTENTS_NATIVE_ASSET = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
