import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK,
	BSC_TESTNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import { CKERC20_FEE } from '$eth/constants/ckerc20.constants';
import { CKETH_FEE } from '$eth/constants/cketh.constants';
import { ERC20_FALLBACK_FEE } from '$eth/constants/erc20.constants';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraErc20IcpProviders } from '$eth/providers/infura-erc20-icp.providers';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { infuraProviders, type InfuraProvider } from '$eth/providers/infura.providers';
import { InfuraGasRest } from '$eth/rest/infura.rest';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthFeePerGas, EthFeePriorities } from '$eth/types/fee';
import type { GetFeeData } from '$eth/types/infura';
import type { EthereumChainId, EthereumNetwork } from '$eth/types/network';
import { isDestinationContractAddress } from '$eth/utils/send.utils';
import { OP_STACK_UNSIGNED_TX_SIZE } from '$evm/base/constants/base.constants';
import {
	BSC_MIN_MAX_FEE_PER_GAS,
	BSC_MIN_MAX_PRIORITY_FEE_PER_GAS
} from '$evm/bsc/constants/bsc.constants';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import { EthFeePriority } from '$lib/enums/eth-fee-priority';
import type { Network, NetworkId } from '$lib/types/network';
import type { TransactionFeeData } from '$lib/types/transaction';
import { maxBigInt } from '$lib/utils/bigint.utils';
import { consoleWarn } from '$lib/utils/console.utils';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import { nonNullish } from '@dfinity/utils';

const BSC_CHAIN_IDS: EthereumChainId[] = [BSC_MAINNET_NETWORK.chainId, BSC_TESTNET_NETWORK.chainId];

// Every OP-stack chain OISY supports. Arbitrum is not one of them: its own L1 cost is folded into
// the gas the transaction reports, so `gasLimit * maxFeePerGas` already covers it.
const OP_STACK_CHAIN_IDS: EthereumChainId[] = [BASE_NETWORK.chainId, BASE_SEPOLIA_NETWORK.chainId];

// Deliberately not best-effort. Swallowing a failure here would leave the ceiling at
// `maxFeePerGas * gas` on a chain that charges more than that, which is precisely what let "Max"
// offer an unminable amount, and it would do so silently: the quote would look affordable and the
// transaction would never be included. Letting it throw surfaces the problem and retries it, and
// the call shares a provider with the rest of the fee data, so there is little for it to fail on
// alone. `undefined` here means the chain has no such fee, never that we failed to read it.
const getL1DataFee = async ({
	chainId,
	provider
}: {
	chainId: EthereumChainId;
	provider: InfuraProvider;
}): Promise<bigint | undefined> =>
	OP_STACK_CHAIN_IDS.includes(chainId)
		? await provider.getL1FeeUpperBound(OP_STACK_UNSIGNED_TX_SIZE)
		: undefined;

const getGasFeeFloor = (
	chainId: EthereumChainId
): { maxFeePerGas: bigint | null; maxPriorityFeePerGas: bigint | null } =>
	BSC_CHAIN_IDS.includes(chainId)
		? {
				maxFeePerGas: BSC_MIN_MAX_FEE_PER_GAS,
				maxPriorityFeePerGas: BSC_MIN_MAX_PRIORITY_FEE_PER_GAS
			}
		: { maxFeePerGas: null, maxPriorityFeePerGas: null };

// The Gas API is a best-effort enhancement: it does not cover every chain we support
// (Arbitrum Sepolia answers 400 "'421614' is not a supported chain id.") and it can be down.
// Everything it adds sits on top of the provider's own quote, so losing it only makes the estimate
// coarser and must never block a send. Without the base fee, `estimatedGasFee` falls back to the
// max fee, which overstates the cost rather than hiding it.
const getSuggestedFeeDataBestEffort = async (
	chainId: EthereumChainId
): Promise<EthFeePriorities | undefined> => {
	const { getSuggestedFeeData } = new InfuraGasRest(chainId);

	try {
		return await getSuggestedFeeData();
	} catch (err: unknown) {
		consoleWarn(err);
	}
};

export const getEthFeeData = ({
	to,
	helperContractAddress
}: GetFeeData & {
	helperContractAddress: OptionEthAddress;
}): bigint => {
	if (isDestinationContractAddress({ destination: to, contractAddress: helperContractAddress })) {
		return CKETH_FEE;
	}

	return ETH_BASE_FEE;
};

export const getErc20FeeData = async ({
	targetNetwork,
	sourceNetwork: { id: sourceNetworkId },
	contract,
	amount,
	...rest
}: GetFeeData & {
	contract: Erc20Token;
	amount: bigint;
	sourceNetwork: EthereumNetwork;
	targetNetwork: Network | undefined;
}): Promise<bigint> => {
	try {
		const targetNetworkId: NetworkId | undefined = targetNetwork?.id;

		const { getFeeData } = isNetworkIdICP(targetNetworkId)
			? infuraErc20IcpProviders(targetNetworkId as NetworkId)
			: infuraErc20Providers(targetNetworkId ?? sourceNetworkId);
		const fee = await getFeeData({ ...rest, contract, amount });

		const isResearchCoin = contract.symbol === 'RSC' && contract.name === 'ResearchCoin';

		// The cross-chain team recommended adding 10% to the fee to provide some buffer for when the transaction is effectively executed.
		// However, according to our observations, we noticed that ERC20 transactions require even more fees. That is why we actually add 50%.
		// Note that originally we added 25% but, after facing some issues with transferring Pepe on busy network, we decided to enhance the allowance further.
		// Additionally, for some particular tokens (RSC), the returned estimated by infura fee is too low. Short-term solution: increase the fee manually for RSC by 150%.
		// TODO: discuss the fee estimation issue with the cross-chain team and decide how can we properly calculate the max gas
		const feeBuffer = isResearchCoin ? (fee * 15n) / 10n : fee / 2n;

		return fee + feeBuffer;
	} catch (err: unknown) {
		// We silence the error on purpose.
		// The queries above often produce errors on mainnet, even when all parameters are correctly set.
		// Additionally, it's possible that the queries are executed with inaccurate parameters, such as when a user enters an incorrect address or an address that is not supported by the selected function (e.g., an ICP account identifier on the Ethereum network rather than for the burn contract).
		consoleWarn(err);

		return ERC20_FALLBACK_FEE;
	}
};

export const getCkErc20FeeData = async ({
	erc20HelperContractAddress,
	to,
	...rest
}: GetFeeData & {
	contract: Erc20Token;
	amount: bigint;
	sourceNetwork: EthereumNetwork;
	erc20HelperContractAddress: OptionEthAddress;
}): Promise<bigint> => {
	const estimateGasForApprove = await getErc20FeeData({
		to,
		targetNetwork: undefined,
		...rest
	});

	const targetCkErc20Helper = isDestinationContractAddress({
		destination: to,
		contractAddress: erc20HelperContractAddress
	});

	if (targetCkErc20Helper) {
		return estimateGasForApprove + CKERC20_FEE;
	}

	return estimateGasForApprove;
};

export const getEthFeeDataWithProvider = async ({
	networkId,
	chainId,
	from,
	to,
	priority = EthFeePriority.NORMAL
}: {
	networkId: NetworkId;
	chainId: bigint;
	from: EthAddress;
	to: EthAddress;
	priority?: EthFeePriority;
}): Promise<{
	feeData: Omit<TransactionFeeData, 'gas'>;
	// Undefined where the Gas API does not cover the chain: the provider's quote is then the only
	// sample there is, so there are no priorities to choose between.
	priorities: EthFeePriorities | undefined;
	provider: InfuraProvider;
	params: GetFeeData;
}> => {
	const params: GetFeeData = {
		to: mapAddressStartsWith0x(to),
		from: mapAddressStartsWith0x(from)
	};

	const provider = infuraProviders(networkId);
	const { getFeeData } = provider;

	const { maxFeePerGas, maxPriorityFeePerGas, ...feeDataRest } = await getFeeData();

	const suggested = await getSuggestedFeeDataBestEffort(chainId);

	// Flat, priority-independent and not refunded: it belongs to the transaction, not to a tier.
	const l1Fee = await getL1DataFee({ chainId, provider });

	const { maxFeePerGas: floorMaxFeePerGas, maxPriorityFeePerGas: floorMaxPriorityFeePerGas } =
		getGasFeeFloor(chainId);

	// The provider's own quote and the network floor are lower bounds on what will actually be
	// accepted, so they apply to every priority, not only the selected one. Applying them once
	// after selection would let a slow choice fall below what the chain relays.
	const applyFloors = ({
		maxFeePerGas: priorityMaxFeePerGas,
		maxPriorityFeePerGas: priorityMaxPriorityFeePerGas
	}: EthFeePerGas): EthFeePerGas => ({
		maxFeePerGas:
			maxBigInt(maxBigInt(maxFeePerGas, priorityMaxFeePerGas), floorMaxFeePerGas) ?? null,
		maxPriorityFeePerGas:
			maxBigInt(
				maxBigInt(maxPriorityFeePerGas, priorityMaxPriorityFeePerGas),
				floorMaxPriorityFeePerGas
			) ?? null
	});

	const priorities: EthFeePriorities | undefined = nonNullish(suggested)
		? {
				baseFeePerGas: suggested.baseFeePerGas,
				perPriority: {
					[EthFeePriority.SLOW]: applyFloors(suggested.perPriority[EthFeePriority.SLOW]),
					[EthFeePriority.NORMAL]: applyFloors(suggested.perPriority[EthFeePriority.NORMAL]),
					[EthFeePriority.FAST]: applyFloors(suggested.perPriority[EthFeePriority.FAST])
				}
			}
		: undefined;

	// With no sample to price the tiers against, the floors still apply: they are what the chain
	// accepts, not what the Gas API suggested.
	const feeData = {
		...feeDataRest,
		...(priorities?.perPriority[priority] ??
			applyFloors({ maxFeePerGas: null, maxPriorityFeePerGas: null })),
		baseFeePerGas: priorities?.baseFeePerGas ?? null,
		l1Fee
	};

	return { feeData, priorities, provider, params };
};
