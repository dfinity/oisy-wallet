import { LANGUAGES, SUPPORTED_LANGUAGES } from '$env/i18n';
import LanguageDropdown from '$lib/components/core/LanguageDropdown.svelte';
import { TRACK_CHANGE_LANGUAGE } from '$lib/constants/analytics.constants';
import { LANGUAGE_DROPDOWN } from '$lib/constants/test-ids.constants';
import { currentLanguage } from '$lib/derived/i18n.derived';
import { Languages } from '$lib/enums/languages';
import { trackEvent } from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { screensStore } from '$lib/stores/screens.store';
import type { TrackEventParams } from '$lib/types/analytics';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LanguageDropdown', () => {
	beforeEach(async () => {
		vi.mock('$lib/services/analytics.services.ts', () => ({
			trackEvent: vi.fn()
		}));

		await i18n.switchLang(Languages.ENGLISH);
	});

	it('should render the language dropdown', () => {
		const { container } = render(LanguageDropdown, {});

		expect(container.querySelector('.lang-selector')).toBeInTheDocument();
	});

	it('is named by the current language and described by what it does', () => {
		const { getByRole } = render(LanguageDropdown, {});

		const trigger = getByRole('button', { name: LANGUAGES[Languages.ENGLISH] });

		expect(trigger).not.toHaveAttribute('aria-label');
		expect(trigger).toHaveAccessibleDescription(get(i18n).core.alt.switch_language);
	});

	it('names its popover by what the trigger does', async () => {
		screensStore.set('lg');

		const { getByRole } = render(LanguageDropdown, {});

		await fireEvent.click(getByRole('button', { name: LANGUAGES[Languages.ENGLISH] }));

		await waitFor(() => {
			expect(getByRole('dialog', { name: get(i18n).core.alt.switch_language })).toBeInTheDocument();
		});
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

		await waitFor(() => {
			expect(container.querySelector('.dropdown-button')).toContainHTML(
				LANGUAGES[Languages.GERMAN]
			);
		});
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

	it('shows and announces the open state on its trigger', async () => {
		const { container } = render(LanguageDropdown, {});

		const dropdownBtn = container.querySelector('.dropdown-button');

		assertNonNullish(dropdownBtn);

		expect(dropdownBtn).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(dropdownBtn);

		await waitFor(() => {
			expect(dropdownBtn).toHaveClass('opened');
			expect(dropdownBtn).toHaveAttribute('aria-expanded', 'true');
		});
	});
});
