import type { EthereumNetwork } from '$eth/types/network';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import type { ProgressStepsSend, ProgressStepsSwap } from '$lib/enums/progress-steps';
import type { EthAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { TransferParams } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';

export type ProgressStep = ProgressStepsSend | ProgressStepsSwap;

type ProgressStepsEnum = typeof ProgressStepsSend | typeof ProgressStepsSwap;

interface WithProgress {
	progress?: (step: ProgressStep) => void;
	progressSteps?: ProgressStepsEnum;
}

export interface SendParams extends WithProgress {
	lastProgressStep?: ProgressStepsSend;
	token: Token;
	sourceNetwork: EthereumNetwork;
	targetNetwork?: Network | undefined;
	identity: OptionIdentity;
	minterInfo?: OptionCertifiedMinterInfo;
}

export type ApproveParams = Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	Omit<SendParams, 'targetNetwork' | 'lastProgressStep' | 'progress'> &
	RequiredTransactionFeeData &
	Omit<WithProgress, 'progressSteps'> & {
		shouldSwapWithApproval?: boolean;
	};

export type SignAndApproveParams = Omit<
	ApproveParams,
	'from' | 'to' | 'minterInfo' | 'progress'
> & {
	nonce: number;
	spender: EthAddress;
} & Omit<WithProgress, 'progressSteps'>;
