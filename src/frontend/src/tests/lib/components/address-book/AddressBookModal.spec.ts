import AddressBookModal from '$lib/components/address-book/AddressBookModal.svelte';
import { ADDRESS_BOOK_MODAL, MODAL_TITLE } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('AddressBookModal', () => {
	it('should render the address book step initially', () => {
		const { getByTestId } = render(AddressBookModal);

		expect(getByTestId(ADDRESS_BOOK_MODAL)).toBeInTheDocument();
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
	});
});
