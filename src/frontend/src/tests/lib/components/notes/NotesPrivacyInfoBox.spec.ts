import NotesPrivacyInfoBox from '$lib/components/notes/NotesPrivacyInfoBox.svelte';
import { OISY_NOTES_DOCS_URL } from '$lib/constants/oisy.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('NotesPrivacyInfoBox', () => {
	it('shows the end-to-end encryption notice with a bold lead and a Learn more link', () => {
		const { container, getByRole } = render(NotesPrivacyInfoBox);

		// The lead sentence is bold.
		expect(container.querySelector('strong')?.textContent?.trim()).toBe(
			en.notes.text.encrypted_lead
		);

		// Lead + body render together.
		expect(container).toHaveTextContent(
			`${en.notes.text.encrypted_lead} ${en.notes.text.encrypted_info.trim()}`
		);

		const learnMore = getByRole('link', { name: en.core.text.learn_more });

		expect(learnMore).toBeInTheDocument();
		// Points at the notes docs page, not the docs root.
		expect(learnMore).toHaveAttribute('href', OISY_NOTES_DOCS_URL);
	});
});
