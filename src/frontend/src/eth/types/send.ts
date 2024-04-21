import type { EthereumNetwork } from '$eth/types/network';
import { SendStep } from '$lib/enums/steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import type { Token } from '$lib/types/token';
import type { MinterInfo } from '@dfinity/cketh';

export type SendParams = {
	progress: (step: SendStep) => void;
	lastProgressStep?: SendStep;
	token: Token;
	sourceNetwork: EthereumNetwork;
	targetNetwork?: Network | undefined;
	identity: OptionIdentity;
	minterInfo: CertifiedData<MinterInfo> | undefined | null;
};
