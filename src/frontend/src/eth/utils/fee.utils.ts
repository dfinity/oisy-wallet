import { ZERO } from '$lib/constants/app.constants';
import type { TransactionFeeData } from '$lib/types/transaction';
import { isNullish } from '@dfinity/utils';

export const maxGasFee = ({
	maxFeePerGas,
	gas: estimatedGasFee
}: TransactionFeeData): bigint | undefined =>
	isNullish(maxFeePerGas) ? undefined : maxFeePerGas * estimatedGasFee;

export const minGasFee = ({
	maxPriorityFeePerGas,
	gas: estimatedGasFee
}: TransactionFeeData): bigint => (maxPriorityFeePerGas ?? ZERO) * estimatedGasFee;
