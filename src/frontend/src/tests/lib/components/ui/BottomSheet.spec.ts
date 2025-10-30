import { bottomSheetOpenStore } from '$lib/stores/ui.store';
import BottomSheetTest from '$tests/lib/components/ui/BottomSheetTest.svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('BottomSheet component', () => {
	it('renders content when visible', () => {
		render(BottomSheetTest, {
			visible: true,
			contentTest: 'Hello content'
		});

		expect(screen.getByText('Hello content')).toBeInTheDocument();
		expect(get(bottomSheetOpenStore)).toBe(true);
	});

	it('does not render when visible is false', () => {
		render(BottomSheetTest, {
			visible: false,
			contentTest: 'Hidden content'
		});

		expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
		expect(get(bottomSheetOpenStore)).toBe(false);
	});

	it('renders footer if provided', () => {
		render(BottomSheetTest, {
			visible: true,
			contentTest: 'Main content',
			footerTest: 'Footer content'
		});

		expect(screen.getByText('Footer content')).toBeInTheDocument();
		expect(get(bottomSheetOpenStore)).toBe(true);
	});

	it('closes when close button is clicked and updates store', async () => {
		const { component } = render(BottomSheetTest, {
			visible: true,
			contentTest: 'Close me'
		});

		expect(get(bottomSheetOpenStore)).toBe(true);

		await fireEvent.click(screen.getByRole('button', { name: /close details/i }));

		// verify that visible is now false
		expect(component.visible).toBe(false);

		// store should reflect that change
		expect(get(bottomSheetOpenStore)).toBe(false);
	});

	it('closes when backdrop is clicked and updates store', async () => {
		const { component } = render(BottomSheetTest, {
			visible: true,
			contentTest: 'Back content'
		});

		expect(get(bottomSheetOpenStore)).toBe(true);

		const backdrop = screen.getByTestId('backdrop');
		await fireEvent.click(backdrop);

		expect(component.visible).toBe(false);
		expect(get(bottomSheetOpenStore)).toBe(false);
	});

	it('store toggles correctly when visibility changes programmatically', async () => {
		const { rerender } = render(BottomSheetTest, {
			visible: false,
			contentTest: 'Dynamic toggle'
		});

		expect(get(bottomSheetOpenStore)).toBe(false);

		await rerender({ visible: true });
		expect(get(bottomSheetOpenStore)).toBe(true);

		await rerender({ visible: false });
		expect(get(bottomSheetOpenStore)).toBe(false);
	});
});
