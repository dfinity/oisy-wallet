interface FeeEstimateLevel {
	suggestedMaxPriorityFeePerGas: string;
	suggestedMaxFeePerGas: string;
	minWaitTimeEstimate: number;
	maxWaitTimeEstimate: number;
}

export interface GasFeeEstimate {
	low: FeeEstimateLevel;
	medium: FeeEstimateLevel;
	high: FeeEstimateLevel;
	estimatedBaseFee: string;
	networkCongestion: number;
	latestPriorityFeeRange: [string, string];
	historicalPriorityFeeRange: [string, string];
	historicalBaseFeeRange: [string, string];
	priorityFeeTrend: 'up' | 'down' | 'stable';
	baseFeeTrend: 'up' | 'down' | 'stable';
	version: string;
}
