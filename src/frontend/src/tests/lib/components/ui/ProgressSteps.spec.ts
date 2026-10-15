import ProgressSteps from '$lib/components/ui/ProgressSteps.svelte';
import type { ProgressStep } from '$lib/types/progress-step';
import { render } from '@testing-library/svelte';

describe('ProgressSteps', () => {
	it.each(['completed', 'failed'] as const)(
		'cross-fades progress to %s without unmounting the spinner',
		async (state) => {
			const step: ProgressStep = { step: 'send', text: 'Send', state: 'in_progress' };
			const { container, rerender } = render(ProgressSteps, { steps: [step] });
			const spinner = container.querySelector('.spinner');
			const layers = container.querySelectorAll('.layer');

			expect(layers).toHaveLength(4);
			expect(layers[0]).toHaveAttribute('aria-hidden', 'false');

			await rerender({ steps: [{ ...step, state }] });

			expect(container.querySelector('.spinner')).toBe(spinner);
			expect(layers[0]).toHaveAttribute('aria-hidden', 'true');
			expect(layers[1]).toHaveAttribute('aria-hidden', 'false');
			expect(layers[2]).toHaveAttribute('aria-hidden', String(state === 'failed'));
			expect(layers[3]).toHaveAttribute('aria-hidden', String(state !== 'failed'));
		}
	);
});
