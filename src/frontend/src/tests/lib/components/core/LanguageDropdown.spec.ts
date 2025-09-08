import { LANGUAGES, SUPPORTED_LANGUAGES } from '$env/i18n';
import LanguageDropdown from '$lib/components/core/LanguageDropdown.svelte';
import { TRACK_CHANGE_LANGUAGE } from '$lib/constants/analytics.contants';
import { LANGUAGE_DROPDOWN } from '$lib/constants/test-ids.constants';
import { currentLanguage } from '$lib/derived/i18n.derived';
import { Languages } from '$lib/enums/languages';
import { trackEvent } from '$lib/services/analytics.services';
import type { TrackEventParams } from '$lib/types/analytics';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LanguageDropdown', () => {
	beforeEach(() => {
		vi.mock('$lib/services/analytics.services.ts', () => ({
			trackEvent: vi.fn()
		}));
	});

	it('should render the language dropdown', () => {
		const { container } = render(LanguageDropdown, {});

		expect(container.querySelector('.lang-selector')).toBeInTheDocument();
	});

	it('should display the current language', () => {
		const { container } = render(LanguageDropdown, {});

		expect(container.querySelector('.dropdown-button')).toContainHTML(
			LANGUAGES[get(currentLanguage) as keyof typeof LANGUAGES]
		);
	});

	it('should render all supported languages', async () => {
		const { container, getByTestId } = render(LanguageDropdown, {});

		const dropdownBtn = container.querySelector('.dropdown-button');

		expect(dropdownBtn).toBeInTheDocument();

		await fireEvent.click(dropdownBtn as Element);

		await waitFor(() => {
			expect(getByTestId(LANGUAGE_DROPDOWN)).toBeInTheDocument();
		});

		SUPPORTED_LANGUAGES.forEach(([, language]) => {
			expect(getByTestId(LANGUAGE_DROPDOWN)).toContainHTML(LANGUAGES[language]);
		});
	});

	it('should change the language on clicking a different language', async () => {
		const { container, getByTestId } = render(LanguageDropdown, {});

		const dropdownBtn = container.querySelector('.dropdown-button');

		expect(dropdownBtn).toBeInTheDocument();

		await fireEvent.click(dropdownBtn as Element);

		await waitFor(() => {
			expect(getByTestId(LANGUAGE_DROPDOWN)).toBeInTheDocument();
		});

		const dropdown = getByTestId(LANGUAGE_DROPDOWN);
		const items = Array.from(dropdown.querySelectorAll('*'));

		for (const item of items) {
			if (item.textContent?.trim() === LANGUAGES[Languages.GERMAN]) {
				await fireEvent.click(item.children[0]); // select first child because that is where onclick is defined
				break;
			}
		}

		expect(container.querySelector('.dropdown-button')).toContainHTML(LANGUAGES[Languages.GERMAN]);
	});

	it('should call plausible trackEvent when language is changed', async () => {
		const { container, getByTestId } = render(LanguageDropdown, {});

		const dropdownBtn = container.querySelector('.dropdown-button');

		expect(dropdownBtn).toBeInTheDocument();

		await fireEvent.click(dropdownBtn as Element);

		await waitFor(() => {
			expect(getByTestId(LANGUAGE_DROPDOWN)).toBeInTheDocument();
		});

		const dropdown = getByTestId(LANGUAGE_DROPDOWN);
		const items = Array.from(dropdown.querySelectorAll('*'));

		for (const item of items) {
			if (item.textContent?.trim() === LANGUAGES[Languages.GERMAN]) {
				await fireEvent.click(item.children[0]); // select first child because that is where onclick is defined
				break;
			}
		}

		expect(trackEvent).toHaveBeenCalledWith({
			name: TRACK_CHANGE_LANGUAGE,
			metadata: {
				language: Languages.GERMAN,
				source: 'landing-page'
			}
		} as TrackEventParams);
	});
});
