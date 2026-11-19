import LiquidiumSelectTokenForm from '$lib/components/liquidium/LiquidiumSelectTokenForm.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('LiquidiumSelectTokenForm', () => {
	it('shows the select-token prompt with a disabled review action', () => {
		const { getByText, getByRole } = render(LiquidiumSelectTokenForm, {
			props: { onSelectToken: () => {}, onClose: () => {} }
		});

		expect(getByText(en.tokens.text.select_token)).toBeInTheDocument();
		expect(getByRole('button', { name: en.send.text.review })).toBeDisabled();
	});

	it('opens the token picker when the input is clicked', async () => {
		const onSelectToken = vi.fn();

		const { getByText } = render(LiquidiumSelectTokenForm, {
			props: { onSelectToken, onClose: () => {} }
		});

		await fireEvent.click(getByText(en.tokens.text.select_token));

		expect(onSelectToken).toHaveBeenCalled();
	});

	it('renders the top banner above the input', () => {
		const { getByTestId } = render(LiquidiumSelectTokenForm, {
			props: {
				onSelectToken: () => {},
				onClose: () => {},
				topBanner: createRawSnippet(() => ({
					render: () => `<span data-tid="top-banner">Top banner content</span>`
				}))
			}
		});

		expect(getByTestId('top-banner')).toBeInTheDocument();
	});

	it('renders form-specific children below the input', () => {
		const { getByTestId } = render(LiquidiumSelectTokenForm, {
			props: {
				onSelectToken: () => {},
				onClose: () => {},
				children: createRawSnippet(() => ({
					render: () => `<span data-tid="child-body">Child body content</span>`
				}))
			}
		});

		expect(getByTestId('child-body')).toBeInTheDocument();
	});
});
