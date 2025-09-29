import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('NftActionButton', () => {
	const mockOnAction = vi.fn();

	const icon = 'icon';
	const label = 'Test label';

	const testId = 'test-id';

	const buttonSelector = `button[data-tid="${testId}"]`;

	it('should render the action button', async () => {
		const { container, getByText } = render(NftActionButton, {
			props: {
				icon: createRawSnippet(() => ({
					render: () => icon
				})),
				onclick: mockOnAction,
				label,
				testId
			}
		});

		expect(getByText(icon)).toBeInTheDocument();
		expect(getByText(label)).toBeInTheDocument();

		const button: HTMLButtonElement | null = container.querySelector(buttonSelector);

		expect(button).toBeInTheDocument();

		assertNonNullish(button);

		button.click();

		await waitFor(() => {
			expect(mockOnAction).toHaveBeenCalled();
		});
	});
});
