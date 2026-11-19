import InProgress from '$lib/components/ui/InProgress.svelte';
import { i18n } from '$lib/stores/i18n.store';
import type { ProgressSteps } from '$lib/types/progress-steps';
import InProgressTest from '$tests/lib/components/ui/InProgressTest.svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('InProgress', () => {
	const steps: ProgressSteps = [
		{ step: 'init', text: 'Initializing', state: 'in_progress' },
		{ step: 'send', text: 'Sending', state: 'next' },
		{ step: 'reload', text: 'Refreshing', state: 'next' }
	];

	const state = ({ container, label }: { container: HTMLElement; label: string }) =>
		[...container.querySelectorAll('.step')]
			.find((step) => step.textContent?.includes(label))
			?.querySelector('.state')
			?.textContent?.trim();

	it('marks the steps before the current one as completed', () => {
		const { container } = render(InProgress, { progressStep: 'send', steps });
		const { progress } = get(i18n);

		expect(state({ container, label: 'Initializing' })).toBe(progress.completed);
		expect(state({ container, label: 'Sending' })).toBe(progress.in_progress);
		expect(state({ container, label: 'Refreshing' })).toBeUndefined();
	});

	it('shows a failed step even when the current step stays the same', async () => {
		// Through a host: `rerender` replaces every prop at once, which would hide the bug.
		const { container, getByRole } = render(InProgressTest, {
			props: { progressStep: 'send', steps }
		});

		await fireEvent.click(getByRole('button', { name: 'fail' }));

		expect(state({ container, label: 'Sending' })).toBe(get(i18n).progress.failed);
	});
});
