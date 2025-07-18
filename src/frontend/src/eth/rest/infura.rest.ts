import { INFURA_API_KEY, INFURA_GAS_REST_URL } from '$env/rest/infura.env';
import type { GasFeeEstimate } from '$eth/types/infura';
import type { EthereumChainId } from '$eth/types/network';
import { parseToken } from '$lib/utils/parse.utils';
import type { FeeData } from 'ethers/providers';

export class InfuraGasRest {
	private readonly apiUrl = INFURA_GAS_REST_URL;

	constructor(private readonly chainId: EthereumChainId) {}

	// https://docs.metamask.io/services/reference/gas-api
	getSuggestedFeeData = async (): Promise<
		Pick<FeeData, 'maxFeePerGas' | 'maxPriorityFeePerGas'>
	> => {
		const url = new URL(
			`${this.apiUrl}/${INFURA_API_KEY}/networks/${this.chainId.toString()}/suggestedGasFees`
		);

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Fetching gas data with Infura Gas API failed.`);
		}

		const {
			medium: { suggestedMaxPriorityFeePerGas, suggestedMaxFeePerGas }
		}: GasFeeEstimate = await response.json();

		return {
			maxFeePerGas: parseToken({ value: suggestedMaxFeePerGas, unitName: 'gwei' }),
			maxPriorityFeePerGas: parseToken({ value: suggestedMaxPriorityFeePerGas, unitName: 'gwei' })
		};
	};
}
