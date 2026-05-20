import type { AddTokenData } from '$icp-eth/types/add-token';
import type { WizardStepsManageTokens } from '$lib/enums/wizard-steps';
import type { Network } from '$lib/types/network';

export interface ManageTokensData {
	initialSearch?: string;
	message?: string;
	initialNetwork?: Network;
	initialTokenData?: Partial<AddTokenData>;
	initialStep?: WizardStepsManageTokens;
}
