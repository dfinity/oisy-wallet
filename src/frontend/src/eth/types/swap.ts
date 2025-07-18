import type { EthereumNetwork } from '$eth/types/network';
import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';

export interface SwapParams {
	progress: (step: ProgressStepsSwap) => void;
	lastProgressStep?: ProgressStepsSwap;
	token: Token;
	sourceNetwork: EthereumNetwork;
	targetNetwork?: Network | undefined;
	identity: OptionIdentity;
}
