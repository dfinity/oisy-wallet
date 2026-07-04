import NotesPrivacyInfoBox from '$lib/components/notes/NotesPrivacyInfoBox.svelte';
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

		expect(getByRole('link', { name: en.core.text.learn_more })).toBeInTheDocument();
	});
});
