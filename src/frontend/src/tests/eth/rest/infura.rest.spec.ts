import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY, INFURA_GAS_REST_URL } from '$env/rest/infura.env';
import { InfuraGasRest } from '$eth/rest/infura.rest';
import { parseToken } from '$lib/utils/parse.utils';
import type { FeeData } from 'ethers/providers';

global.fetch = vi.fn();

vi.mock(import('$env/rest/infura.env'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		INFURA_API_KEY: 'test-api-key'
	};
});

describe('infura.rest', () => {
	describe('InfuraGasRest', () => {
		const { chainId } = ETHEREUM_NETWORK;

		const mockApiResponse = {
			low: {
				suggestedMaxPriorityFeePerGas: '0.05',
				suggestedMaxFeePerGas: '24.086058416',
				minWaitTimeEstimate: 15000,
				maxWaitTimeEstimate: 30000
			},
			medium: {
				suggestedMaxPriorityFeePerGas: '0.1',
				suggestedMaxFeePerGas: '32.548678862',
				minWaitTimeEstimate: 15000,
				maxWaitTimeEstimate: 45000
			},
			high: {
				suggestedMaxPriorityFeePerGas: '0.3',
				suggestedMaxFeePerGas: '41.161299308',
				minWaitTimeEstimate: 15000,
				maxWaitTimeEstimate: 60000
			},
			estimatedBaseFee: '24.036058416',
			networkCongestion: 0.7143,
			latestPriorityFeeRange: ['0.1', '20'],
			historicalPriorityFeeRange: ['0.007150439', '113'],
			historicalBaseFeeRange: ['19.531410688', '36.299069766'],
			priorityFeeTrend: 'down',
			baseFeeTrend: 'down'
		};

		const expectedFeeData: Pick<FeeData, 'maxFeePerGas' | 'maxPriorityFeePerGas'> = {
			maxFeePerGas: parseToken({ value: '32.548678862', unitName: 'gwei' }),
			maxPriorityFeePerGas: parseToken({ value: '0.1', unitName: 'gwei' })
		};

		it('should fetch suggested fee data correctly', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => mockApiResponse
			} as unknown as Response);

			const mockFetch = vi.mocked(fetch);

			const infuraRest = new InfuraGasRest(chainId);

			const result = await infuraRest.getSuggestedFeeData();

			const urlString = mockFetch.mock.calls[0][0].toString();

			expect(fetch).toHaveBeenCalledOnce();
			expect(urlString).toBe(
				`${INFURA_GAS_REST_URL}/${INFURA_API_KEY}/networks/${chainId}/suggestedGasFees`
			);

			expect(result).toEqual(expectedFeeData);
		});

		it('should throw an error if the API call fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false
			} as unknown as Response);

			const infuraRest = new InfuraGasRest(chainId);

			await expect(infuraRest.getSuggestedFeeData()).rejects.toThrow(
				'Fetching gas data with Infura Gas API failed.'
			);
		});
	});
});
