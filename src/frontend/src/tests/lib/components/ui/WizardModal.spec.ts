import WizardModal from '$lib/components/ui/WizardModal.svelte';
import type { WizardSteps } from '$lib/types/wizard';
import { createMockSnippet, mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('WizardModal', () => {
	const steps: WizardSteps<string> = [{ name: 'first', title: 'First' }];

	const baseProps = { steps, title: createMockSnippet('wizard-title'), children: mockSnippet };

	it('should render the header action before the close button', () => {
		const { getByTestId } = render(WizardModal, {
			props: { ...baseProps, headerRight: createMockSnippet('wizard-header-action') }
		});

		expect(getByTestId('wizard-header-action').nextElementSibling).toBe(getByTestId('close-modal'));
	});

	it('should render no header action by default', () => {
		const { getByTestId } = render(WizardModal, { props: baseProps });

		expect(getByTestId('close-modal').matches(':first-child')).toBeTruthy();
	});
});
