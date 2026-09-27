import type { EthAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import type { ProgressStepsSend, ProgressStepsSwap } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { TransferParams } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';
import { errorDetailToString } from '$lib/utils/error.utils';

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
	identity: NullishIdentity;
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

// An error an EVM send raised that also says what became of its transaction. The original error
// travels as the cause, and its text as the message, so a flow that only shows the error reads
// exactly what it did before.
class EthSendOutcomeError extends Error {
	constructor(cause: unknown) {
		super(errorDetailToString(cause), { cause });
	}
}

// The nonce could not be read, so the transaction that needed it was never signed, let alone sent.
export class EthNonceReadError extends EthSendOutcomeError {}

// Every provider failed the submission without saying anything about the transaction, so whether
// the network received it is unknown.
export class EthSubmissionUnconfirmedError extends EthSendOutcomeError {}
