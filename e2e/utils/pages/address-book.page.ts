import {
	ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
	ADDRESS_BOOK_ADD_CONTACT_BUTTON,
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_CONTACT_FORM,
	ADDRESS_BOOK_CONTACT_NAME_INPUT,
	ADDRESS_BOOK_MODAL,
	ADDRESS_BOOK_SAVE_BUTTON,
	CONTACT_CARD,
	CONTACT_CARD_BUTTON,
	CONTACT_EDIT_DELETE_CONTACT_BUTTON,
	CONTACT_HEADER_EDIT_BUTTON,
	NAVIGATION_MENU_ADDRESS_BOOK_BUTTON
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type AddressBookPageParams = HomepageLoggedInParams;

export class AddressBookPage extends HomepageLoggedIn {
	constructor(params: AddressBookPageParams) {
		super(params);
	}

	// Navigate to Address Book from the homepage and wait until it is ready
	override async extendWaitForReady(): Promise<void> {
		await this.clickMenuItem({ menuItemTestId: NAVIGATION_MENU_ADDRESS_BOOK_BUTTON });
		await this.waitForByTestId({ testId: ADDRESS_BOOK_MODAL });
		await this.waitForLoadState();
	}

	// Create a new contact and add an address to it
	async addNewContact({ name, address }: { name: string; address: string }): Promise<void> {
		await this.clickByTestId({ testId: ADDRESS_BOOK_ADD_CONTACT_BUTTON });
		await this.waitForByTestId({ testId: ADDRESS_BOOK_CONTACT_FORM });

		await this.setInputValueByTestId({
			testId: ADDRESS_BOOK_CONTACT_NAME_INPUT,
			value: name
		});

		await this.clickByTestId({ testId: ADDRESS_BOOK_SAVE_BUTTON });

		// Add first address on the contact details screen
		await this.waitForByTestId({ testId: ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT });
		await this.setInputValueByTestId({
			testId: ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
			value: address
		});

		await this.clickByTestId({ testId: ADDRESS_BOOK_SAVE_BUTTON });
		await this.waitForLoadState();
	}

	// Open a contact by its displayed name
	async openContact(contactName: string): Promise<void> {
		const contactCards = await this.getLocatorByTestId({ testId: CONTACT_CARD }).all();
		for (const card of contactCards) {
			const text = await card.textContent();
			if (text && text.includes(contactName)) {
				await card.locator(`[data-tid="${CONTACT_CARD_BUTTON}"]`).click();
				break;
			}
		}
		await this.waitForLoadState();
	}

	// Edit the currently opened contact's name
	async editContact(newName: string): Promise<void> {
		await this.clickByTestId({ testId: CONTACT_HEADER_EDIT_BUTTON });
		await this.waitForByTestId({ testId: ADDRESS_BOOK_CONTACT_NAME_INPUT });

		const nameInput = this.getLocatorByTestId({ testId: ADDRESS_BOOK_CONTACT_NAME_INPUT });
		await nameInput.fill('');
		await nameInput.fill(newName);

		await this.clickByTestId({ testId: ADDRESS_BOOK_SAVE_BUTTON });
		await this.waitForLoadState();
	}

	// Delete the currently opened contact
	async deleteContact(): Promise<void> {
		await this.clickByTestId({ testId: CONTACT_HEADER_EDIT_BUTTON });
		await this.waitForByTestId({ testId: CONTACT_EDIT_DELETE_CONTACT_BUTTON });
		await this.clickByTestId({ testId: CONTACT_EDIT_DELETE_CONTACT_BUTTON });
		await this.waitForByTestId({ testId: ADDRESS_BOOK_ADD_CONTACT_BUTTON });
	}

	// Close contact view and go back to the address book list
	async cancelAndReturnToAddressBook(): Promise<void> {
		await this.clickByTestId({ testId: ADDRESS_BOOK_CANCEL_BUTTON });
		await this.waitForByTestId({ testId: ADDRESS_BOOK_ADD_CONTACT_BUTTON });
	}
}
