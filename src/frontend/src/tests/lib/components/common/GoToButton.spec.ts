import GoToButton from '$lib/components/common/GoToButton.svelte';
import { render } from '@testing-library/svelte';

describe('GoToButton', () => {
	const props = { label: 'Go to X', testId: 'go-to-x', onclick: vi.fn() };

	it('should render the label', () => {
		const { getByText } = render(GoToButton, props);

		expect(getByText(props.label)).toBeInTheDocument();
	});

	it('should render the icon', () => {
		const { container } = render(GoToButton, props);

		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('should call onclick when clicked', () => {
		const onclick = vi.fn();
		const { getByTestId } = render(GoToButton, { ...props, onclick });

		(getByTestId(props.testId) as HTMLButtonElement).click();

		expect(onclick).toHaveBeenCalledOnce();
	});
});
