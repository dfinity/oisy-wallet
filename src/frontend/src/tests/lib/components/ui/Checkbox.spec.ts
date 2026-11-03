import CheckboxTest from '$tests/lib/components/ui/CheckboxTest.svelte';
import { fireEvent, render } from '@testing-library/svelte';

const LABEL = 'Enable testnets';
const TEST_ID = 'checkbox-row';

describe('Checkbox', () => {
	it('exposes one checkbox, named by its label, and no button', () => {
		const { getAllByRole, getByRole, queryByRole } = render(CheckboxTest, {
			label: LABEL,
			checked: false
		});

		expect(getAllByRole('checkbox')).toHaveLength(1);
		expect(getByRole('checkbox', { name: LABEL })).toBeInTheDocument();
		expect(queryByRole('button')).toBeNull();
	});

	it('is named by a label rendered outside it', () => {
		const { getByRole } = render(CheckboxTest, {
			label: LABEL,
			checked: false,
			labelOutside: true
		});

		expect(getByRole('checkbox', { name: LABEL })).toBeInTheDocument();
	});

	it.each([true, false])('exposes checked: %s', (checked) => {
		const { getByRole } = render(CheckboxTest, { label: LABEL, checked });

		expect(getByRole('checkbox', { name: LABEL, checked })).toBeInTheDocument();
	});

	it('takes keyboard focus itself, so Space toggles it natively', () => {
		const { getByRole } = render(CheckboxTest, { label: LABEL, checked: false });
		const checkbox = getByRole('checkbox');

		expect(checkbox).not.toHaveAttribute('tabindex');

		checkbox.focus();

		expect(checkbox).toHaveFocus();
	});

	it.each(['box', 'label', 'row'] as const)(
		'calls onChange once on a click on the %s',
		async (target) => {
			const onChange = vi.fn();
			const { getByRole, getByTestId, getByText } = render(CheckboxTest, {
				label: LABEL,
				checked: false,
				testId: TEST_ID,
				onChange
			});
			const element = {
				box: getByRole('checkbox'),
				label: getByText(LABEL),
				row: getByTestId(TEST_ID)
			}[target];

			await fireEvent.click(element);

			expect(onChange).toHaveBeenCalledOnce();
		}
	);

	it('toggles on Enter without letting Enter submit a form', async () => {
		const onChange = vi.fn();
		const { getByRole } = render(CheckboxTest, { label: LABEL, checked: false, onChange });

		const notCancelled = await fireEvent.keyDown(getByRole('checkbox'), { code: 'Enter' });

		expect(notCancelled).toBeFalsy();
		expect(onChange).toHaveBeenCalledOnce();
	});

	it('ignores other keys, leaving Space to the native input', async () => {
		const onChange = vi.fn();
		const { getByRole } = render(CheckboxTest, { label: LABEL, checked: false, onChange });

		await fireEvent.keyDown(getByRole('checkbox'), { code: 'Space' });

		expect(onChange).not.toHaveBeenCalled();
	});

	it('is disabled and ignores clicks when disabled', async () => {
		const onChange = vi.fn();
		const { getByRole, getByTestId } = render(CheckboxTest, {
			label: LABEL,
			checked: false,
			disabled: true,
			testId: TEST_ID,
			onChange
		});

		expect(getByRole('checkbox')).toBeDisabled();

		await fireEvent.click(getByTestId(TEST_ID));

		expect(onChange).not.toHaveBeenCalled();
	});
});
