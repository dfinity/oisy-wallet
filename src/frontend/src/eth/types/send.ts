import type { EthereumNetwork } from '$eth/types/network';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import { SendStep } from '$lib/enums/steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';

export type SendParams = {
	progress: (step: SendStep) => void;
	lastProgressStep?: SendStep;
	token: Token;
	sourceNetwork: EthereumNetwork;
	targetNetwork?: Network | undefined;
	identity: OptionIdentity;
	minterInfo: OptionCertifiedMinterInfo;
};
