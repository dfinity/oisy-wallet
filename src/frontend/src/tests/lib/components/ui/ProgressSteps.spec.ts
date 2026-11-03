import ProgressSteps from '$lib/components/ui/ProgressSteps.svelte';
import { i18n } from '$lib/stores/i18n.store';
import type { ProgressStep } from '$lib/types/progress-step';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('ProgressSteps', () => {
	const steps: [ProgressStep, ...ProgressStep[]] = [
		{ step: 'init', text: 'Initializing', state: 'completed' },
		{ step: 'send', text: 'Sending', state: 'in_progress' },
		{ step: 'reload', text: 'Refreshing', state: 'next' }
	];

	// The same run with the "Sending" step moved to another state.
	const withState = (state: ProgressStep['state']): [ProgressStep, ...ProgressStep[]] =>
		steps.map((step) => (step.step === 'send' ? { ...step, state } : step)) as [
			ProgressStep,
			...ProgressStep[]
		];

	afterEach(() => {
		vi.useRealTimers();
	});

	it('marks only the running step as current', () => {
		const { getByText } = render(ProgressSteps, { steps });

		expect(getByText('Sending').closest('li')).toHaveAttribute('aria-current', 'step');
		expect(getByText('Initializing').closest('li')).not.toHaveAttribute('aria-current');
		expect(getByText('Refreshing').closest('li')).not.toHaveAttribute('aria-current');
	});

	it('names each state for screen readers without drawing a badge', () => {
		const { getByText } = render(ProgressSteps, { steps });
		const { progress } = get(i18n);

		const state = (label: string) => getByText(label).closest('li')?.querySelector('.state');

		expect(state('Initializing')).toHaveTextContent(progress.completed);
		expect(state('Initializing')).toHaveClass('sr-only');
		expect(state('Sending')).toHaveTextContent(progress.in_progress);
		expect(state('Sending')).toHaveClass('sr-only');

		// Not started yet, so it says nothing rather than claiming a state.
		expect(state('Refreshing')).toBeNull();
	});

	it('writes out a failed step', () => {
		const { getByText, container } = render(ProgressSteps, { steps: withState('failed') });

		const tag = getByText('Sending').closest('li')?.querySelector('.state');

		expect(tag).toHaveTextContent(get(i18n).progress.failed);
		expect(tag).not.toHaveClass('sr-only');
		expect(container.querySelector('[aria-current]')).toBeNull();
	});

	it('swaps the marker when the step changes state', async () => {
		const { getByText, rerender } = render(ProgressSteps, { steps });

		const marker = () => getByText('Sending').closest('li')?.querySelector('.marker');

		expect(marker()?.querySelector('.arc')).not.toBeNull();
		expect(marker()?.querySelector('.badge')).toBeNull();

		await rerender({ steps: withState('completed') });

		expect(marker()?.querySelector('.arc')).toBeNull();
		expect(marker()?.querySelector('.badge')).not.toBeNull();
	});

	it('keeps each label in the document once', () => {
		// The glint copies the label through CSS, so text queries still find a single node.
		const { getAllByText } = render(ProgressSteps, { steps });

		expect(getAllByText('Sending')).toHaveLength(1);
	});

	it('announces the running step once the steps settle', async () => {
		vi.useFakeTimers();

		const { getByRole } = render(ProgressSteps, { steps });

		expect(getByRole('status')).toHaveTextContent('');

		await vi.advanceTimersByTimeAsync(500);
		await tick();

		expect(getByRole('status')).toHaveTextContent(
			replacePlaceholders(get(i18n).progress.step_of, {
				$step: 'Sending',
				$current: '2',
				$total: '3'
			})
		);
	});

	it('announces where the run failed', async () => {
		vi.useFakeTimers();

		const { getByRole } = render(ProgressSteps, { steps: withState('failed') });

		await vi.advanceTimersByTimeAsync(500);
		await tick();

		expect(getByRole('status')).toHaveTextContent(
			replacePlaceholders(get(i18n).progress.failed_at, { $step: 'Sending' })
		);
	});

	it('does not announce a step that is replaced before it settles', async () => {
		vi.useFakeTimers();

		const { getByRole, rerender } = render(ProgressSteps, { steps });

		await vi.advanceTimersByTimeAsync(200);
		await rerender({ steps: withState('completed') });
		await vi.advanceTimersByTimeAsync(500);
		await tick();

		expect(getByRole('status')).toHaveTextContent('');
	});
});
