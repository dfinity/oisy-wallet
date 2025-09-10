import DelayedTooltip from '$lib/components/ui/DelayedTooltip.svelte';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('DelayedTooltip', () => {
	const testId = mockSnippetTestId;
	const children = mockSnippet;

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	it('renders children content', async () => {
		render(DelayedTooltip, {
			props: { text: 'Tooltip text', children }
		});

		await tick();

		expect(screen.getByTestId(testId)).toBeInTheDocument();
		expect(screen.getByText('Mock Snippet')).toBeInTheDocument();
	});

	it('does not show tooltip before delay completes', async () => {
		render(DelayedTooltip, {
			props: { text: 'Tooltip text', delay: 1600, children }
		});

		const content = screen.getByTestId(testId);
		await fireEvent.mouseEnter(content);

		vi.advanceTimersByTime(400);
		await tick();
		await Promise.resolve();

		expect(document.querySelector('[role="tooltip"]')).toBeNull();
	});

	it('cancels pending tooltip if mouse leaves before delay', async () => {
		render(DelayedTooltip, {
			props: { text: 'Tooltip text', delay: 1600, children }
		});

		const content = screen.getByTestId(testId);
		await fireEvent.mouseEnter(content);
		vi.advanceTimersByTime(500);
		await fireEvent.mouseLeave(content);

		vi.advanceTimersByTime(1100);
		await tick();
		await Promise.resolve();

		expect(document.querySelector('[role="tooltip"]')).toBeNull();
	});

	it('renders without children', async () => {
		render(DelayedTooltip, {
			props: { text: 'Tooltip text' }
		});

		await tick();

		expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
	});
});
