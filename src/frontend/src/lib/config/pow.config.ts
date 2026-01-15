import { ProgressStepsPowProtectorLoader } from '$lib/enums/progress-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { NonEmptyArray } from '$lib/types/utils';
import type { ProgressStep } from '@dfinity/gix-components';

export const powProtectorSteps = ({ i18n }: WizardStepsParams): NonEmptyArray<ProgressStep> => [
	{
		step: ProgressStepsPowProtectorLoader.REQUEST_CHALLENGE,
		text: i18n.pow_protector.text.request_challenge,
		state: 'completed'
	},
	{
		step: ProgressStepsPowProtectorLoader.SOLVE_CHALLENGE,
		text: i18n.pow_protector.text.solve_challenge,
		state: 'completed'
	},
	{
		step: ProgressStepsPowProtectorLoader.GRANT_CYCLES,
		text: i18n.pow_protector.text.grant_cycles,
		state: 'completed'
	}
];
