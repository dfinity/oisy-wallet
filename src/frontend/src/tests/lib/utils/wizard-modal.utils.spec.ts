import type { WizardStepsSend } from '$lib/enums/wizard-steps';
import { goToWizardSendStep } from '$lib/utils/wizard-modal.utils';
import { type WizardModal, type WizardSteps } from '@dfinity/gix-components';

const mockModal = {
	set: vi.fn()
};

describe('goToWizardStep', () => {
	const mockSteps: WizardSteps = [
		{ name: 'step1', title: 'Step 1' },
		{ name: 'step2', title: 'Step 2' },
		{ name: 'step3', title: 'Step 3' },
		{ name: 'step4', title: 'Step 4' }
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should set the modal to the correct step number for each step', () => {
		mockSteps.forEach((step, index) => {
			mockModal.set.mockClear();
			goToWizardSendStep({
				modal: mockModal as unknown as WizardModal,
				steps: mockSteps,
				stepName: step.name as WizardStepsSend
			});

			expect(mockModal.set).toHaveBeenCalledWith(index);
		});
	});

	it('should set the modal to 0 if step name is not found', () => {
		goToWizardSendStep({
			modal: mockModal as unknown as WizardModal,
			steps: mockSteps,
			stepName: 'nonExistentStep' as WizardStepsSend
		});

		expect(mockModal.set).toHaveBeenCalledWith(0);
	});
});
