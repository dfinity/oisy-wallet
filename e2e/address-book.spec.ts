import { CONTACT_CARD } from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { AddressBookPage } from './utils/pages/address-book.page';

// Helper
const CONTACT_ADDRESS = 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae';

// Create
testWithII('should create a new contact', async ({ page, iiPage, isMobile }) => {
	const addressBookPage = new AddressBookPage({ page, iiPage, isMobile });

	await addressBookPage.waitForReady();
	await addressBookPage.takeScreenshot('address-book-initial');

	const contactName = 'Test Contact';
	await addressBookPage.addNewContact({ name: contactName, address: CONTACT_ADDRESS });

	const contactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });

	await expect(contactCard).toBeVisible();
	await expect(contactCard).toContainText(contactName);

	await addressBookPage.takeScreenshot('address-book-with-contact');
});

// Edit
testWithII('should edit an existing contact', async ({ page, iiPage, isMobile }) => {
	const addressBookPage = new AddressBookPage({ page, iiPage, isMobile });

	await addressBookPage.waitForReady();

	const contactName = 'Edit Test Contact';
	await addressBookPage.addNewContact({ name: contactName, address: CONTACT_ADDRESS });

	const contactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });

	await expect(contactCard).toBeVisible();
	await expect(contactCard).toContainText(contactName);

	await addressBookPage.openContact(contactName);
	await addressBookPage.takeScreenshot('contact-before-edit');

	const newContactName = 'Updated Contact Name';
	await addressBookPage.editContact(newContactName);
	await addressBookPage.takeScreenshot('contact-after-edit');

	await addressBookPage.cancelAndReturnToAddressBook();

	const updatedContactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });

	await expect(updatedContactCard).toBeVisible();
	await expect(updatedContactCard).toContainText(newContactName);
});

// Delete
testWithII('should delete a contact', async ({ page, iiPage, isMobile }) => {
	const addressBookPage = new AddressBookPage({ page, iiPage, isMobile });

	await addressBookPage.waitForReady();

	const contactName = 'Delete Test Contact';
	await addressBookPage.addNewContact({ name: contactName, address: CONTACT_ADDRESS });

	const contactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });

	await expect(contactCard).toBeVisible();
	await expect(contactCard).toContainText(contactName);

	await addressBookPage.takeScreenshot('before-contact-deletion');
	await addressBookPage.openContact(contactName);
	await addressBookPage.deleteContact();
	await addressBookPage.takeScreenshot('after-contact-deletion');

	// Verify not present anymore
	const cards = await page.locator(`[data-tid="${CONTACT_CARD}"]`).all();
	let found = false;
	for (const card of cards) {
		const text = await card.textContent();
		if (text && text.includes(contactName)) {
			found = true;
			break;
		}
	}

	expect(found).toBe(false);
});