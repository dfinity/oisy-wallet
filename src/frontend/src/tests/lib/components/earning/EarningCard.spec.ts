import EarningCard from '$lib/components/earning/EarningCard.svelte';
import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockProviderUi } from '$tests/mocks/providers-ui.mock';
import { render } from '@testing-library/svelte';

describe('EarningCard', () => {
	const props = {
		provider: mockProviderUi
	};

	it('should render the provider logo', () => {
		const { getByAltText } = render(EarningCard, { props });

		expect(
			getByAltText(replacePlaceholders(en.core.alt.logo, { $name: mockProviderUi.name }))
		).toBeInTheDocument();
	});

	it('should render the provider title', () => {
		const { getByText } = render(EarningCard, { props });

		expect(
			getByText(resolveText({ i18n: en, path: mockProviderUi.cardTitle }))
		).toBeInTheDocument();
	});
});
