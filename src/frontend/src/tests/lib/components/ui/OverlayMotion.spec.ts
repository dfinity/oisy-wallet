import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
import Modal from '$lib/components/ui/Modal.svelte';
import Popover from '$lib/components/ui/Popover.svelte';
import { toastsStore } from '$lib/stores/toasts.store';
import { backdrop, fade, fly, scale, slide } from '$lib/utils/transitions.utils';
import ToastsTest from '$tests/lib/components/ui/ToastsTest.svelte';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';
import { cubicIn, cubicOut } from 'svelte/easing';

vi.mock('$lib/utils/transitions.utils', () => ({
	backdrop: vi.fn(() => ({})),
	fade: vi.fn(() => ({})),
	fly: vi.fn(() => ({})),
	scale: vi.fn(() => ({})),
	slide: vi.fn(() => ({}))
}));

describe('overlay motion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		toastsStore.reset();
	});

	it.each([
		{ position: 'top', y: -16 },
		{ position: 'bottom', y: 16 }
	] as const)(
		'moves a $position toast a short distance both ways without an exit delay',
		async ({ position, y }) => {
			const id = toastsStore.show({ level: 'info', text: 'Test', position });
			render(ToastsTest, { props: { position }, intro: true });

			await waitFor(() =>
				expect(fly).toHaveBeenCalledWith(expect.anything(), { y }, { direction: 'in' })
			);
			toastsStore.hide(id);
			await waitFor(() =>
				expect(fly).toHaveBeenCalledWith(expect.anything(), { y }, { direction: 'out' })
			);
		}
	);

	it('clears a modal panel before its backdrop and only fades its container on entry', async () => {
		const { rerender } = render(Modal, {
			props: { visible: true, children: mockSnippet },
			intro: true
		});

		await waitFor(() =>
			expect(fade).toHaveBeenCalledWith(
				expect.anything(),
				{ duration: 125, easing: cubicOut },
				{ direction: 'in' }
			)
		);

		expect(fade).toHaveBeenCalledWith(expect.anything(), { duration: 25 }, { direction: 'in' });
		expect(backdrop).toHaveBeenCalledWith(
			expect.anything(),
			{ duration: 75, easing: cubicOut, blur: 4 },
			{ direction: 'in' }
		);

		await rerender({ visible: false });
		await waitFor(() =>
			expect(fade).toHaveBeenCalledWith(
				expect.anything(),
				{ duration: 125, easing: cubicIn },
				{ direction: 'out' }
			)
		);

		expect(backdrop).toHaveBeenCalledWith(
			expect.anything(),
			{ duration: 150, easing: cubicIn, blur: 4 },
			{ direction: 'out' }
		);
	});

	it('grows a popover from 96% and dismisses it faster', async () => {
		const { rerender } = render(Popover, { props: { visible: true }, intro: true });

		await waitFor(() =>
			expect(scale).toHaveBeenCalledWith(
				expect.anything(),
				{ duration: 150, easing: cubicOut, start: 0.96, delay: 25 },
				{ direction: 'in' }
			)
		);

		expect(fade).toHaveBeenCalledWith(expect.anything(), { duration: 25 }, { direction: 'in' });

		await rerender({ visible: false });
		await waitFor(() =>
			expect(scale).toHaveBeenCalledWith(
				expect.anything(),
				{ duration: 100, easing: cubicIn, start: 0.96 },
				{ direction: 'out' }
			)
		);
	});

	it('opens a sheet in 250 ms and closes it in 200 ms', async () => {
		const { rerender } = render(BottomSheet, {
			props: { visible: true, content: mockSnippet },
			intro: true
		});

		await waitFor(() =>
			expect(slide).toHaveBeenCalledWith(
				expect.anything(),
				{ axis: 'y', duration: 250, easing: cubicOut },
				{ direction: 'in' }
			)
		);
		await rerender({ visible: false });
		await waitFor(() =>
			expect(slide).toHaveBeenCalledWith(
				expect.anything(),
				{ axis: 'y', duration: 200, easing: cubicIn },
				{ direction: 'out' }
			)
		);
	});
});
