import AddressBookModal from '$lib/components/address-book/AddressBookModal.svelte';
import { ADDRESS_BOOK_MODAL, MODAL_TITLE } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render, screen } from '@testing-library/svelte';

describe('AddressBookModal', () => {
	it('should render the address book step initially', () => {
		render(AddressBookModal);

		expect(screen.getByTestId(ADDRESS_BOOK_MODAL)).toBeInTheDocument();
		expect(screen.getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
	});
});
