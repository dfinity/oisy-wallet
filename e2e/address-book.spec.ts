import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { AddressBookPage } from './utils/pages/address-book.page';
import {
	ADDRESS_BOOK_MODAL,
	CONTACT_CARD
} from '$lib/constants/test-ids.constants';

testWithII('should create a new contact', async ({ page, iiPage, isMobile }) => {
	const addressBookPage = new AddressBookPage({ page, iiPage, isMobile });

	// Wait for the page to be ready
	await addressBookPage.waitForReady();

	// Take a screenshot of the initial address book state
	await addressBookPage.takeScreenshot('address-book-initial');

	// Add a new contact
	const contactName = 'Test Contact';
	const contactAddress = 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae';
	await addressBookPage.addNewContact(contactName, contactAddress);

	// Verify the contact was created
	const contactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });
	await expect(contactCard).toBeVisible();
	await expect(contactCard).toContainText(contactName);

	// Take a screenshot of the address book with the new contact
	await addressBookPage.takeScreenshot('address-book-with-contact');
});

testWithII('should edit an existing contact', async ({ page, iiPage, isMobile })

testWithII('should edit an existing contact', async ({ page, iiPage, isMobile }) => {
	const addressBookPage = new AddressBookPage({ page, iiPage, isMobile });

	// Wait for the page to be ready
	await addressBookPage.waitForReady();

	// Add a new contact first
	const contactName = 'Edit Test Contact';
	const contactAddress = 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae';
	await addressBookPage.addNewContact(contactName, contactAddress);

	// Verify the contact was created
	const contactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });
	await expect(contactCard).toBeVisible();
	await expect(contactCard).toContainText(contactName);

	// Open the contact
	await addressBookPage.openContact(contactName);

	// Take a screenshot before editing
	await addressBookPage.takeScreenshot('contact-before-edi => ){
age = new AddressBookPage({ page, iiPage, isMobile });

	// Wait for the page to be ready
	await addressBookPage.waitForReady();

	// Add a new contact first
	const contactName = 'Edit Test Contact';
	const contactAddress = 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae';
	await addressBookPage.addNewContact(contactName, contactAddress);

	// Verify the contact was created first
	const contactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });
	await expect(contactCard).toBeVisible();
	await expect(contactCard).toContainText(contactName);

	// Open the contact
	await addressBookPage.openContact(contactName);

	// Take a screenshot before editing
	await addressBookPage.takeScreenshot('contact-before-edit');

	// Edit the contact
	const newContactName = 'Delete Updated Contact Name';
	await addressBookPage.editContact(newContactName);

	// Take a screenshot after editing
	await addressBookPage.takeScreenshot('contact-after-edit');

	// Return to the address book
	await addressBookPage.cancelAndReturnToAddressBook();

	// Verify the contact name was updated
	const updatedContactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });
	await expect(updatedContactCard).toBeVisible();
	await expect(updatedContactCard).toContainText(newContactName);
});

testWithII('should delete a contact', async ({ page, iiPage, isMobile }) => {
	const addressBookPage = new AddressBookPage({ page, iiPage, isMobile });

	// Wait for the page to be ready
	await addressBookPage.waitForReady();

	// Add a new contact first
	const contactName = 'Delete Test Contact';
	const contactAddress = 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae';
	await addressBookPage.addNewContact(contactName, contactAddress);

	// Verify the contact was created
	const contactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });
	await expect(contactCard).toBeVisible();
	await expect(contactCard).toContainText(contactName);

	// Take a screenshot before deletion
	await addressBookPage.takeScreenshot('before-contact-deletion');

	// Open the contact
	await addressBookPage.openContact(contactName);

	// Delete the contact
	await addressBookPage.deleteContact();

	// Take a screenshot after deletion
	await addressBookPage.takeScreenshot('after-contact-deletion');

	// Verify the contact was deleted (should not be visible anymore)
	const contactCards = await page.locator(`[data-tid="${CONTACT_CARD}"]`).all();
	let contactFound = false;
	
	for (const card of contactCards) {
		const text = await card.textContent();
		if (text && text.includes(contactName)) {
			contactFound = true;
			break;
		}
	}
	
	expect(contactFound).toBe(false);
});