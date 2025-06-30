import { LANGUAGES } from '$env/i18n';
import LanguageDropdown from '$lib/components/core/LanguageDropdown.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LanguageDropdown', () => {
	it('should render the language dropdown', async () => {
		const { container } = render(LanguageDropdown, {});

		expect(container.querySelector('.lang-selector')).toBeInTheDocument();
	});

	it('should display the current language', async () => {
		const { container } = render(LanguageDropdown, {});

		expect(container.querySelector('.dropdown-button')).toContainHTML(
			LANGUAGES[get(i18n).lang as keyof typeof LANGUAGES]
		);
	});
});
