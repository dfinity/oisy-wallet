import { SendStep } from '$lib/enums/steps';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { BigNumber } from '@ethersproject/bignumber';

export interface TransferParams {
	from: string;
	to: string;
	amount: BigNumber;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
	data?: string;
}

export interface SendParams {
	progress: (step: SendStep) => void;
	lastProgressStep?: SendStep;
	token: Token;
	network?: Network | undefined;
}
