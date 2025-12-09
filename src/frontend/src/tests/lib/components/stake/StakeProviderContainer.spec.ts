import StakeProviderContainer from '$lib/components/stake/StakeProviderContainer.svelte';
import { StakeProvider } from '$lib/types/stake';
import en from '$tests/mocks/i18n.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('StakeProviderContainer', () => {
	const pageTitle = 'pageTitle';
	const props = {
		content: createMockSnippet('content'),
		provider: StakeProvider.GLDT,
		pageTitle
	};

	it('renders data correctly if currentApy is not provided', () => {
		const { getByTestId, container, getByText } = render(StakeProviderContainer, {
			props
		});

		expect(getByTestId('content')).toBeInTheDocument();
		expect(container).toHaveTextContent(pageTitle);
		expect(() => getByText(en.stake.text.current_apy_label)).toThrow();
	});

	it('renders data correctly if currentApy is provided', () => {
		const { getByTestId, container, getByText } = render(StakeProviderContainer, {
			props: {
				...props,
				currentApy: 10
			}
		});

		expect(getByTestId('content')).toBeInTheDocument();
		expect(container).toHaveTextContent(pageTitle);
		expect(getByText(en.stake.text.current_apy_label)).toBeInTheDocument();
	});
});
