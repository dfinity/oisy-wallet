import BottomSheetTest from '$tests/lib/components/ui/BottomSheetTest.svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('BottomSheet component', () => {
	it('renders content when visible', () => {
		render(BottomSheetTest, {
			visible: true,
			contentTest: 'Hello content'
		});

		expect(screen.getByText('Hello content')).toBeInTheDocument();
	});

	it('does not render when visible is false', () => {
		render(BottomSheetTest, {
			visible: false,
			contentTest: 'Hidden content'
		});

		expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
	});

	it('renders footer if provided', () => {
		render(BottomSheetTest, {
			visible: true,
			contentTest: 'Main content',
			footerTest: 'Footer content'
		});

		expect(screen.getByText('Footer content')).toBeInTheDocument();
	});

	it('closes when close button is clicked', async () => {
		const { component } = render(BottomSheetTest, {
			visible: true,
			contentTest: 'Close me'
		});

		// simulate clicking the close button
		await fireEvent.click(screen.getByRole('button', { name: 'Close details' }));

		// check that visible changed to false
		expect(component.visible).toBeFalsy();
	});

	it('closes when backdrop is clicked', async () => {
		const { component } = render(BottomSheetTest, {
			visible: true,
			contentTest: 'Back content'
		});

		const backdrop = screen.getByTestId('backdrop');
		await fireEvent.click(backdrop);

		expect(component.visible).toBeFalsy();
	});
});
