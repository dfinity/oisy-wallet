import type { CkEthHelperContractAddressData } from '$eth/stores/cketh.store';
import { SendStep } from '$lib/enums/steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';

export interface SendParams {
	progress: (step: SendStep) => void;
	lastProgressStep?: SendStep;
	token: Token;
	network?: Network | undefined;
	identity: OptionIdentity;
	ckEthHelperContractAddress: CkEthHelperContractAddressData;
}
