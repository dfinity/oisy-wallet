import { addTokenSteps } from '$lib/constants/steps.constants';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';

describe('steps.constants', () => {
	describe('addTokenSteps', () => {
		it('should return the correct steps with expected text and state', () => {
			const steps = addTokenSteps(en);

			expect(steps).toEqual([
				{
					step: ProgressStepsAddToken.INITIALIZATION,
					text: en.tokens.text.initializing,
					state: 'in_progress'
				},
				{
					step: ProgressStepsAddToken.SAVE,
					text: en.tokens.import.text.saving,
					state: 'next'
				},
				{
					step: ProgressStepsAddToken.UPDATE_UI,
					text: en.tokens.text.updating_ui,
					state: 'next'
				}
			]);
		});
	});
});
