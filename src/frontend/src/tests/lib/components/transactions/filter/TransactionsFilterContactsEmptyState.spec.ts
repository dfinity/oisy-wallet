import TransactionsFilterContactsEmptyState from '$lib/components/transactions/filter/TransactionsFilterContactsEmptyState.svelte';
import { TRANSACTIONS_FILTER_CONTACTS_EMPTY_CTA } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TransactionsFilterContactsEmptyState', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the no-contacts-yet line', () => {
		const { getByText } = render(TransactionsFilterContactsEmptyState);

		expect(getByText(get(i18n).transaction.filter.contacts_empty_title)).toBeInTheDocument();
	});

	it('renders the OISY-protects-you lockup and description', () => {
		const { getByText } = render(TransactionsFilterContactsEmptyState);

		expect(
			getByText(replaceOisyPlaceholders(get(i18n).core.text.oisy_protects_you))
		).toBeInTheDocument();
		// The description sits between the OISY-protects-you <strong> and the
		// Learn more <a> inside the same <p>, so the paragraph's full text is
		// "<oisy lockup> <description> <learn more>". Use a partial match
		// against the i18n value so the test stays in sync with the copy.
		expect(
			getByText(get(i18n).transaction.filter.contacts_empty_description, { exact: false })
		).toBeInTheDocument();
	});

	it('renders a Learn more link pointing to the protected-contacts docs', () => {
		const { getByRole } = render(TransactionsFilterContactsEmptyState);

		const link = getByRole('link', { name: get(i18n).core.text.learn_more });

		expect(link).toHaveAttribute(
			'href',
			'https://docs.oisy.com/introduction/oisy-keeps-you-protected#contacts'
		);
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'external noopener noreferrer');
	});

	it('renders the CTA button that opens the address book', async () => {
		const openSpy = vi.spyOn(modalStore, 'openAddressBook');

		const { getByTestId } = render(TransactionsFilterContactsEmptyState);

		const cta = getByTestId(TRANSACTIONS_FILTER_CONTACTS_EMPTY_CTA);

		expect(cta).toHaveTextContent(get(i18n).transaction.filter.contacts_empty_cta);

		await fireEvent.click(cta);

		expect(openSpy).toHaveBeenCalledOnce();
	});
});
