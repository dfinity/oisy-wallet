import { ADDRESS_BOOK_NETWORK_SELECT } from '$lib/constants/test-ids.constants';
import { testWithII } from '@dfinity/internet-identity-playwright';
import { AddressBookPage, type NetworkType } from './utils/pages/address-book.page';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

const createTestContact = (network: NetworkType = 'ICP') => ({
	name: `Test ${network} Contact ${Math.random().toString(36).substring(2, 8)}`,
	address: `${network.toLowerCase()}-address-${Math.random().toString(36).substring(2, 10)}`,
	alias: `Test ${network} Alias`,
	network
});

const TEST_CONTACT_ICP = createTestContact('ICP');
const TEST_CONTACT_ETH = createTestContact('ETH');
const TEST_CONTACT_BTC = createTestContact('BTC');

testWithII('should open and close address book', async ({ page, iiPage }) => {
	const homepage = new HomepageLoggedIn({ page, iiPage });
	const addressBook = new AddressBookPage({ page });

	// Authenticate and navigate to the app
	await homepage.waitForAuthentication();
	await homepage.waitForLoggedInIndicator();

	// Open address book
	await addressBook.open();

	// Verify the address book is open
	await addressBook.waitForAddressBookModal();

	// Close the address book
	await addressBook.close();

	// Verify the address book is closed
	await expect(page.locator('[data-tid="address-book-modal"]')).not.toBeVisible();
});

testWithII('should create and verify a new ICP contact', async ({ page, iiPage }) => {
	const homepage = new HomepageLoggedIn({ page, iiPage });
	const addressBook = new AddressBookPage({ page });

	// Authenticate and navigate to the app
	await homepage.waitForAuthentication();
	await homepage.waitForLoggedInIndicator();

	// Open address book
	await addressBook.open();

	// Add a new contact
	await addressBook.clickAddContact();

	// Fill in contact details
	await addressBook.fillContactForm({
		name: TEST_CONTACT_ICP.name,
		address: TEST_CONTACT_ICP.address,
		alias: TEST_CONTACT_ICP.alias,
		network: 'ICP'
	});

	// Save the contact
	await addressBook.saveContact();

	// Verify the contact was created by searching for it
	await addressBook.searchContact(TEST_CONTACT_ICP.name);
	await addressBook.verifyContactExists(TEST_CONTACT_ICP.name, 'ICP');

	// Clean up
	await addressBook.close();
});

testWithII(
	'should create and verify contacts with different networks',
	async ({ page, iiPage }) => {
		const homepage = new HomepageLoggedIn({ page, iiPage });
		const addressBook = new AddressBookPage({ page });

		// Authenticate and navigate to the app
		await homepage.waitForAuthentication();
		await homepage.waitForLoggedInIndicator();

		// Open address book
		await addressBook.open();

		// Test with ETH contact
		await addressBook.clickAddContact();
		await addressBook.fillContactForm({
			name: TEST_CONTACT_ETH.name,
			address: TEST_CONTACT_ETH.address,
			alias: TEST_CONTACT_ETH.alias,
			network: 'ETH'
		});
		await addressBook.saveContact();

		// Test with BTC contact
		await addressBook.clickAddContact();
		await addressBook.fillContactForm({
			name: TEST_CONTACT_BTC.name,
			address: TEST_CONTACT_BTC.address,
			alias: TEST_CONTACT_BTC.alias,
			network: 'BTC'
		});
		await addressBook.saveContact();

		// Verify contacts exist with their respective networks
		await addressBook.searchContact(TEST_CONTACT_ETH.name);
		await addressBook.verifyContactExists(TEST_CONTACT_ETH.name, 'ETH');

		await addressBook.searchContact(TEST_CONTACT_BTC.name);
		await addressBook.verifyContactExists(TEST_CONTACT_BTC.name, 'BTC');

		// Clean up
		await addressBook.close();
	}
);

testWithII('should show empty state for non-existent contacts', async ({ page, iiPage }) => {
	const homepage = new HomepageLoggedIn({ page, iiPage });
	const addressBook = new AddressBookPage({ page });
	const nonExistentName = `Non-Existent-Contact-${  Math.random().toString(36).substring(2, 10)}`;

	// Authenticate and navigate to the app
	await homepage.waitForAuthentication();
	await homepage.waitForLoggedInIndicator();

	// Open address book
	await addressBook.open();

	// Search for a non-existent contact
	await addressBook.searchContact(nonExistentName);

	// Verify the empty state is shown
	await addressBook.verifyNoContactsMessage();

	// Clean up
	await addressBook.close();
});

testWithII('should use ICP as default network when none specified', async ({ page, iiPage }) => {
	const homepage = new HomepageLoggedIn({ page, iiPage });
	const addressBook = new AddressBookPage({ page });
	const testContact = createTestContact('ICP');

	// Authenticate and navigate to the app
	await homepage.waitForAuthentication();
	await homepage.waitForLoggedInIndicator();

	// Open address book
	await addressBook.open();

	// Add a new contact without specifying network (should default to ICP)
	await addressBook.clickAddContact();
	await addressBook.fillContactForm({
		name: testContact.name,
		address: testContact.address,
		alias: testContact.alias
		// network not specified, should default to ICP
	});

	// Verify the network select has 'ICP' selected by default
	const networkSelect = page.locator(`[data-tid="${ADDRESS_BOOK_NETWORK_SELECT}"]`);

	await expect(networkSelect).toHaveValue('ICP');

	// Save the contact
	await addressBook.saveContact();

	// Verify the contact was created with ICP network
	await addressBook.searchContact(testContact.name);
	await addressBook.verifyContactExists(testContact.name, 'ICP');

	// Clean up
	await addressBook.close();
});

testWithII('should cancel contact creation', async ({ page, iiPage }) => {
	const homepage = new HomepageLoggedIn({ page, iiPage });
	const addressBook = new AddressBookPage({ page });

	// Authenticate and navigate to the app
	await homepage.waitForAuthentication();
	await homepage.waitForLoggedInIndicator();

	// Open address book
	await addressBook.open();

	// Start adding a contact
	await addressBook.clickAddContact();

	// Fill in some details but cancel
	await addressBook.fillContactForm({
		name: 'Cancel Me',
		address: 'cancel-address-123'
	});

	// Cancel the operation
	await addressBook.cancelContactForm();

	// Verify we're back to the main address book view
	await addressBook.waitForAddressBookModal();

	// Clean up
	await addressBook.close();
});
