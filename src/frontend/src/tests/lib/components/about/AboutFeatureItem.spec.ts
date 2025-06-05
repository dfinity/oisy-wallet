import AboutFeatureItem from '$lib/components/about/AboutFeatureItem.svelte';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render } from '@testing-library/svelte';

describe('AboutFeatureItem', () => {
	const mockTitle = 'Test Title';
	const mockDescription = 'Test Description';

	it('should render title and description', () => {
		const { getByText } = render(AboutFeatureItem, {
			props: {
				title: mockTitle,
				description: mockDescription,
				icon: () => ''
			}
		});

		expect(getByText(mockTitle)).toBeInTheDocument();
		expect(getByText(mockDescription)).toBeInTheDocument();
	});

	it('should apply replaceOisyPlaceholders to title and description', () => {
		const titleWithPlaceholder = 'Hello {{oisy}}';
		const descriptionWithPlaceholder = 'Welcome to {{oisy}}';

		const { getByText } = render(AboutFeatureItem, {
			props: {
				title: titleWithPlaceholder,
				description: descriptionWithPlaceholder,
				icon: () => ''
			}
		});

		expect(getByText(replaceOisyPlaceholders(titleWithPlaceholder))).toBeInTheDocument();
		expect(getByText(replaceOisyPlaceholders(descriptionWithPlaceholder))).toBeInTheDocument();
	});
});
