import NotesUnlocking from '$lib/components/notes/NotesUnlocking.svelte';
import { OISY_NOTES_DOCS_URL } from '$lib/constants/oisy.constants';
import { NOTES_UNLOCKING } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('NotesUnlocking', () => {
	it('shows the unlocking title and subtitle', () => {
		const { getByTestId, getByText } = render(NotesUnlocking);

		expect(getByTestId(NOTES_UNLOCKING)).toBeInTheDocument();
		expect(getByText(en.notes.text.unlocking_title)).toBeInTheDocument();
		expect(getByText(en.notes.text.unlocking_subtitle)).toBeInTheDocument();
	});

	it('reassures with the end-to-end encryption privacy notice', () => {
		const { getByRole } = render(NotesUnlocking);

		const learnMore = getByRole('link', { name: en.core.text.learn_more });

		expect(learnMore).toBeInTheDocument();
		expect(learnMore).toHaveAttribute('href', OISY_NOTES_DOCS_URL);
	});
});
