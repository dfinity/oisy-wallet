import InternetIdentityBanner from '$lib/components/core/InternetIdentityBanner.svelte';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('InternetIdentityBanner', () => {
	it('renders the banner', () => {
		const { getByText } = render(InternetIdentityBanner);

		expect(
			getByText(replaceOisyPlaceholders(en.core.info.internet_identity_banner_first_part))
		).toBeInTheDocument();
	});
});
