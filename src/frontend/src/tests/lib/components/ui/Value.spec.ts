import Value from '$lib/components/ui/Value.svelte';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('Value', () => {
	const createTextSnippet = (text: string) =>
		createRawSnippet(() => ({
			render: () => `<span>${text}</span>`
		}));

	const label = 'Spender';
	const content = '0x0000000000000000000000000000000000000000';

	const props = {
		label: createTextSnippet(label),
		content: createTextSnippet(content)
	};

	// Queried by role and accessible name rather than by text: a `<label for>` pointing at a
	// non-labelable element renders correctly while announcing the value unnamed, so only the
	// accessibility tree can tell the regression apart from the fix.
	it('should expose the label as the accessible name of the value', () => {
		const { getByRole } = render(Value, { props });

		expect(getByRole('definition', { name: label })).toHaveTextContent(content);
	});

	it('should expose the accessible name when rendered as a div', () => {
		const { getByRole } = render(Value, { props: { ...props, element: 'div' as const } });

		expect(getByRole('definition', { name: label })).toHaveTextContent(content);
	});

	it('should expose the accessible name when a ref is provided', () => {
		const { getByRole } = render(Value, { props: { ...props, ref: 'spender' } });

		expect(getByRole('definition', { name: label })).toHaveTextContent(content);
	});

	it('should give each instance its own label association', () => {
		const { getByRole } = render(Value, { props });
		const { getByRole: getBySecondRole } = render(Value, {
			props: {
				label: createTextSnippet('Operator'),
				content: createTextSnippet('0x1')
			}
		});

		expect(getByRole('definition', { name: label })).toHaveTextContent(content);
		expect(getBySecondRole('definition', { name: 'Operator' })).toHaveTextContent('0x1');
	});
});
