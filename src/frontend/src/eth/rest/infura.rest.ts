import { INFURA_API_KEY, INFURA_GAS_REST_URL } from '$env/rest/infura.env';
import type { EthFeePriorities } from '$eth/types/fee';
import type { FeeEstimateLevel, GasFeeEstimate } from '$eth/types/infura';
import type { EthereumChainId } from '$eth/types/network';
import { EthFeePriority } from '$lib/enums/eth-fee-priority';
import { parseToken } from '$lib/utils/parse.utils';

export class InfuraGasRest {
	private readonly apiUrl = INFURA_GAS_REST_URL;

	constructor(private readonly chainId: EthereumChainId) {}

	// https://docs.metamask.io/services/reference/gas-api
	getSuggestedFeeData = async (): Promise<EthFeePriorities> => {
		const url = new URL(
			`${this.apiUrl}/${INFURA_API_KEY}/networks/${this.chainId.toString()}/suggestedGasFees`
		);

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Fetching gas data with Infura Gas API failed.`);
		}

		const { low, medium, high, estimatedBaseFee }: GasFeeEstimate = await response.json();

		// The Gas API's low / medium / high vocabulary stops here: nothing above the REST layer
		// should know the vendor's naming.
		const mapLevel = ({
			suggestedMaxFeePerGas,
			suggestedMaxPriorityFeePerGas
		}: FeeEstimateLevel) => ({
			maxFeePerGas: parseToken({ value: suggestedMaxFeePerGas, unitName: 'gwei' }),
			maxPriorityFeePerGas: parseToken({ value: suggestedMaxPriorityFeePerGas, unitName: 'gwei' })
		});

		return {
			baseFeePerGas: parseToken({ value: estimatedBaseFee, unitName: 'gwei' }),
			perPriority: {
				[EthFeePriority.SLOW]: mapLevel(low),
				[EthFeePriority.MEDIUM]: mapLevel(medium),
				[EthFeePriority.FAST]: mapLevel(high)
			}
		};
	};
}
