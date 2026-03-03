import StakeProviderContainer from '$lib/components/stake/StakeProviderContainer.svelte';
import en from '$tests/mocks/i18n.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('StakeProviderContainer', () => {
	const pageTitle = 'pageTitle';
	const pageDescription = 'pageDescription';
	const props = {
		content: createMockSnippet('content'),
		pageTitle,
		pageDescription
	};

	it('renders data correctly if maxApy is not provided', () => {
		const { getByTestId, container, getByText } = render(StakeProviderContainer, {
			props
		});

		expect(getByTestId('content')).toBeInTheDocument();
		expect(container).toHaveTextContent(pageTitle);
		expect(() => getByText(en.stake.text.max_apy_label)).toThrowError();
	});

	it('renders data correctly if maxApy is provided', () => {
		const { getByTestId, container, getByText } = render(StakeProviderContainer, {
			props: {
				...props,
				maxApy: 10
			}
		});

		expect(getByTestId('content')).toBeInTheDocument();
		expect(container).toHaveTextContent(pageTitle);
		expect(getByText(en.stake.text.max_apy_label)).toBeInTheDocument();
	});
});
