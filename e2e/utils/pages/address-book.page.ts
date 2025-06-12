import {
	ADDRESS_BOOK_ADD_CONTACT_BUTTON,
	ADDRESS_BOOK_CONTACT_FORM,
	ADDRESS_BOOK_CONTACT_NAME_INPUT,
	ADDRESS_BOOK_MODAL,
	ADDRESS_BOOK_SAVE_BUTTON,
	ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
	NAVIGATION_MENU,
	NAVIGATION_MENU_ADDRESS_BOOK_BUTTON,
	CONTACT_CARD,
	CONTACT_CARD_BUTTON,
	CONTACT_HEADER_EDIT_BUTTON,
	CONTACT_EDIT_DELETE_CONTACT_BUTTON,
	ADDRESS_BOOK_CANCEL_BUTTON,
	CONTACT_CARD,
	CONTACT_CARD_BUTTON,
	CONTACT_HEADER_EDIT_BUTTON,
	CONTACT_EDIT_DELETE_CONTACT_BUTTON,
	ADDRESS_BOOK_CANCEL_BUTTON
} from '$lib/constants/test-ids.constants';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

export type AddressBookPageParams = HomepageLoggedInParams;

export class AddressBookPage extends HomepageLoggedIn {
	constructor(params: AddressBookPageParams) {
		super(params);
	}

	override async extendWaitForReady(): Promise<void> {
		// Open the navigation menu
		await this.clickByTestId({ testId: NAVIGATION_MENU });
		
		// Click on the address book button
		await this.clickByTestId({ testId: NAVIGATION_MENU_ADDRESS_BOOK_BUTTON });
		
		// Wait for the address book modal to appear
		await this.waitForByTestId({ testId: ADDRESS_BOOK_MODAL });
		
		await this.waitForLoadState();
	}

	async addNewContact(name: string, address: string): Promise<void> {
		// Click on the add contact button
		await this.clickByTestId({ testId: ADDRESS_BOOK_ADD_CONTACT_BUTTON });
		
		// Wait for the contact form to appear
		await this.waitForByTestId({ testId: ADDRESS_BOOK_CONTACT_FORM });
		
		// Fill in the contact name
		await this.setInputValueByTestId({
			testId: ADDRESS_BOOK_CONTACT_NAME_INPUT,
			value: name
		});
		
		// Click save to create the contact
		await this.clickByTestId({ testId: ADDRESS_BOOK_SAVE_BUTTON });
		
		// Now we should be on the contact details page, add an address
		await this.waitForByTestId({ testId: ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT });
		
		// Fill in the address
		await this.setInputValueByTestId({
			testId: ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
			value: address
		});
		
		// Save the address
		await this.clickByTestId({ testId: ADDRESS_BOOK_SAVE_BUTTON });
	}
	
	async openContact(contactName: string): Promise<void> {
		// Find the contact card with the given name
		const contactCards = await this.page.locator(`[data-tid="${CONTACT_CARD}"]`).all();
		
		for (const card of contactCards) {
			const text = await card.textContent();
			if (text && text.includes(contactName)) {
				// Click on the contcontact card button
						await card.locator(`[data-tid="${CONTACT_CARD_BUTTON}"]`).click();
				break;card.locator(`[data-tid="${CONTACT_CARD_BUTTON}"]`).click();
				break;
			}
		}
		
		// Wait for the contact details to load
			}
		}
		
		// Wait for the edit details to load
		await this.waitForLoadState();
	}
		
	async editContact(newName: string): Promise<void> {
		// Click on the edit button
		await this.clickByTestId({ testId: CONTACT_HEADER_EDIT_BUTTON });ctName: string): Promise<void> {
		// Find the contact card with the given name
		const contactCards = await this.page.locator(`[data-tid="${CONTACT_CARD}"]`).all();
		
		for (const card of contactCards) {
			const text = await card.textContent();
			if (text && text.includes(contactName)) {
		
		 Wait for the edit form to appear
		await this.waitForByTestId({ testId: ADDRESS_BOOK_CONTACT_NAME_INPUT });
	}
	
	async cancelAndReturnToAddressBook(): Promise<void> {
		// Click on the cancel button to return to the input and set the new name
		await this.page.locator(`[data-tid="${ADDRESS_BOOK_CONTACT_NAME_INPUT}"]`).clear();
		await this.clickByTestId({ testId: ADDRESS_BOOK_CONTACT_NAME_INPUT,
			value: newName
		});
		
		// Save the changes
		await this.clickByTestId({ testId: ADDRESS_BOOK_ADD_CONTACT_BUTTON });
		
		// Wait for the changes to be applied
		await this.waitForLoadState();
	}
	
	async deleteContact(): Promise<void> {
		// Click on the edit button
		await this.clickByTestId({ testId: CONTACT_HEADER_EDIT_BUTTON });
		
		// Wait for the delete contact button book book to load
		await this.waitForByTestId({ testId: CONTACT_EDIT_DELETE_CONTACT_BUTTON });
		
		// Confirm deletion by clicking the delete button again
		await this.clickByTestId({ testId: CONTACT_EDIT_DELETE_CONTACT_BUTTON });
		
		// Wait for the deletion to complete and return to the address book
		await this.waitForByTestId({ testId: ADDRESS_BOOK_ADD_CONTACT_BUTTON });
	}
	
	async cancelAndReturnToAddressBook(): Promise<void> {
		// Click on the cancel button to return to the address book
		await this.clickByTestId({ testId: ADDRESS_BOOK_CANCEL_BUTTON });
		
		// Wait for the address book to load
		await this.waitForByTestId({ testId: ADDRESS_BOOK_ADD_CONTACT_BUTTON });
	}
}