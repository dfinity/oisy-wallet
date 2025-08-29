import { CONTACT_CARD, IN_PROGRESS_MODAL } from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { AddressBookPage } from './utils/pages/address-book.page';
import { FlowPage } from './utils/pages/send-and-receive-flow.page';

// Scenario 1
testWithII('should send tokens to a contact', async ({ page, iiPage, isMobile }) => {
	// First, create a contact
	const addressBookPage = new AddressBookPage({ page, iiPage, isMobile });
	await addressBookPage.waitForReady();

	const contactName = 'Payment Recipient';
	const contactAddress = 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae';
	await addressBookPage.addNewContact({ name: contactName, address: contactAddress });

	// Verify the contact was created
	const contactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });

	await expect(contactCard).toBeVisible();
	await expect(contactCard).toContainText(contactName);

	// Close the address book modal
	await addressBookPage.cancelAndReturnToAddressBook();

	// Now, send tokens to the contact
	const flowPage = new FlowPage({ page, iiPage, isMobile });

	// First receive some tokens to have a balance
	await flowPage.receiveTokens();

	// Take a screenshot before sending
	await flowPage.takeScreenshot('before-sending-to-contact');

	// Send tokens to the contact
	await flowPage.sendTokensToContact(contactName, '0.1');

	// Take a screenshot after sending
	await flowPage.takeScreenshot('after-sending-to-contact');

	// Verify the transaction was successful (progress modal should be gone)
	const progressModalVisible = await flowPage.isVisibleByTestId(IN_PROGRESS_MODAL);

	expect(progressModalVisible).toBe(false);
});

// Scenario 2 (duplicate test retained as-is per original file)
testWithII('should send tokens to a contact', async ({ page, iiPage, isMobile }) => {
	// First, create a contact
	const addressBookPage = new AddressBookPage({ page, iiPage, isMobile });
	await addressBookPage.waitForReady();

	const contactName = 'Payment Recipient';
	const contactAddress = 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae';
	await addressBookPage.addNewContact({ name: contactName, address: contactAddress });

	// Verify the contact was created
	const contactCard = addressBookPage.getLocatorByTestId({ testId: CONTACT_CARD });

	await expect(contactCard).toBeVisible();
	await expect(contactCard).toContainText(contactName);

	// Close the address book modal
	await addressBookPage.cancelAndReturnToAddressBook();

	// Now, send tokens to the contact
	const flowPage = new FlowPage({ page, iiPage, isMobile });

	// First receive some tokens to have a balance
	await flowPage.receiveTokens();

	// Take a screenshot before sending
	await flowPage.takeScreenshot('before-sending-to-contact');

	// Send tokens to the contact
	await flowPage.sendTokensToContact(contactName, '0.1');

	// Take a screenshot after sending
	await flowPage.takeScreenshot('after-sending-to-contact');

	// Verify the transaction was successful (progress modal should be gone)
	const progressModalVisible = await flowPage.isVisibleByTestId(IN_PROGRESS_MODAL);

	expect(progressModalVisible).toBe(false);
});
