import type { EthereumNetwork } from '$eth/types/network';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';

export type SendParams = {
	progress: (step: ProgressStepsSend) => void;
	lastProgressStep?: ProgressStepsSend;
	token: Token;
	sourceNetwork: EthereumNetwork;
	targetNetwork?: Network | undefined;
	identity: OptionIdentity;
	minterInfo: OptionCertifiedMinterInfo;
};
