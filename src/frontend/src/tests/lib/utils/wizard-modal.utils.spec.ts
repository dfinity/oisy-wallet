import type { WizardStepsSend } from '$lib/enums/wizard-steps';
import type { WizardModal, WizardSteps } from '$lib/types/wizard';
import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

const mockModal = {
	set: vi.fn()
};

describe('wizard-modal.utils', () => {
	describe('goToWizardStep', () => {
		const mockSteps: WizardSteps<WizardStepsSend> = [
			{ name: 'step1', title: 'Step 1' },
			{ name: 'step2', title: 'Step 2' },
			{ name: 'step3', title: 'Step 3' },
			{ name: 'step4', title: 'Step 4' }
		] as unknown as WizardSteps<WizardStepsSend>;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should set the modal to the correct step number for each step', () => {
			mockSteps.forEach((step, index) => {
				mockModal.set.mockClear();
				goToWizardStep({
					modal: mockModal as unknown as WizardModal<WizardStepsSend>,
					steps: mockSteps,
					stepName: step.name
				});

				expect(mockModal.set).toHaveBeenCalledWith(index);
			});
		});

		it('should set the modal to 0 if step name is not found', () => {
			goToWizardStep({
				modal: mockModal as unknown as WizardModal<WizardStepsSend>,
				steps: mockSteps,
				stepName: 'nonExistentStep' as WizardStepsSend
			});

			expect(mockModal.set).toHaveBeenCalledWith(0);
		});
	});
});
