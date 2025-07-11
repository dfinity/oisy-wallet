import type { EthereumNetwork } from '$eth/types/network';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import type { ProgressStepsSend } from '$lib/enums/progress-steps';
import type { EthAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { TransferParams } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';

export interface SendParams {
	progress: (step: ProgressStepsSend) => void;
	lastProgressStep?: ProgressStepsSend;
	token: Token;
	sourceNetwork: EthereumNetwork;
	targetNetwork?: Network | undefined;
	identity: OptionIdentity;
	minterInfo?: OptionCertifiedMinterInfo;
}

export type ApproveParams = Omit<TransferParams, 'maxPriorityFeePerGas' | 'maxFeePerGas'> &
	Omit<SendParams, 'targetNetwork' | 'lastProgressStep'> &
	RequiredTransactionFeeData;

export type SignAndApproveParams = Omit<ApproveParams, 'from' | 'to' | 'progress' | 'minterInfo'> &
	Partial<Pick<SendParams, 'progress'>> & {
		nonce: number;
		spender: EthAddress;
	};
