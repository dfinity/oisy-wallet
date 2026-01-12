import * as authEnv from '$env/auth.env';
import InternetIdentityBanner from '$lib/components/core/InternetIdentityBanner.svelte';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('InternetIdentityBanner', () => {
	it('renders the banenr if feature flag is set to 2.0', () => {
		vi.spyOn(authEnv, 'PRIMARY_INTERNET_IDENTITY_VERSION', 'get').mockImplementation(() => '2.0');

		const { getByText } = render(InternetIdentityBanner);

		expect(
			getByText(replaceOisyPlaceholders(en.core.info.internet_identity_banner_first_part))
		).toBeInTheDocument();
	});

	it('does not render the banner if feature flag is not set to 2.0', () => {
		vi.spyOn(authEnv, 'PRIMARY_INTERNET_IDENTITY_VERSION', 'get').mockImplementation(() => '1.0');

		const { getByText } = render(InternetIdentityBanner);

		expect(() =>
			getByText(replaceOisyPlaceholders(en.core.info.internet_identity_banner_first_part))
		).toThrowError();
	});
});
