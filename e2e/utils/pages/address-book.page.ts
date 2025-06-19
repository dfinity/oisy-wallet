import {
	ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
	ADDRESS_BOOK_ADDRESS_ALIAS_INPUT,
	ADDRESS_BOOK_ADD_CONTACT_BUTTON,
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_CONTACT_NAME_INPUT,
	ADDRESS_BOOK_MODAL,
	ADDRESS_BOOK_NETWORK_SELECT,
	ADDRESS_BOOK_SAVE_BUTTON,
	ADDRESS_BOOK_SEARCH_CONTACT_INPUT,
	BUTTON_MODAL_CLOSE,
	NAVIGATION_MENU,
	NAVIGATION_MENU_ADDRESS_BOOK_BUTTON,
	NAVIGATION_MENU_BUTTON
} from '$lib/constants/test-ids.constants';
import { expect, type Locator, type Page, type ViewportSize } from '@playwright/test';
import { Homepage } from './homepage.page';

// Supported networks for address book
export const SUPPORTED_NETWORKS = ['ICP', 'BTC', 'ETH'] as const;
export type NetworkType = (typeof SUPPORTED_NETWORKS)[number];

interface AddressBookPageParams {
	page: Page;
	viewportSize?: ViewportSize;
	isMobile?: boolean;
}

export class AddressBookPage extends Homepage {
	constructor(params: AddressBookPageParams) {
		super(params);
	}

	// Helper method to get a locator by test ID
	protected getByTestId(testId: string): Locator {
		return this.page.locator(`[data-tid="${testId}"]`);
	}

	// Implement abstract methods from Homepage
	protected override async extendWaitForReady(): Promise<void> {
		// No additional waiting needed for address book
		await Promise.resolve();
	}

	// Override waitForReady to ensure the page is fully loaded
	public override async waitForReady(): Promise<void> {
		await super.waitForReady();
		await this.waitForAddressBookModal();
	}

	// Helper to wait for navigation menu to be ready
	private async waitForNavigationMenu(): Promise<void> {
		await this.page.waitForSelector(`[data-tid="${NAVIGATION_MENU}"]`, { state: 'visible' });
	}

	/**
	 * Opens the address book modal from the navigation menu
	 */
	async open(): Promise<void> {
		// Wait for navigation menu to be ready
		await this.waitForNavigationMenu();

		// Click the navigation menu button
		await this.getByTestId(NAVIGATION_MENU_BUTTON).click();

		// Click the address book button in the navigation
		await this.getByTestId(NAVIGATION_MENU_ADDRESS_BOOK_BUTTON).click();

		// Wait for the address book modal to be visible
		await this.waitForAddressBookModal();
	}

	/**
	 * Waits for the address book modal to be visible
	 * @param timeout Timeout in milliseconds (default: 10 seconds)
	 */
	async waitForAddressBookModal(timeout = 10000): Promise<void> {
		const modal = this.getByTestId(ADDRESS_BOOK_MODAL);

		await expect(modal).toBeVisible({ timeout });
	}

	/**
	 * Clicks the 'Add Contact' button in the address book
	 */
	async clickAddContact(): Promise<void> {
		const addButton = this.getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON);
		await addButton.click();
		await this.waitForContactForm();
	}

	/**
	 * Waits for the contact form to be visible
	 * @param timeout Timeout in milliseconds (default: 5 seconds)
	 */
	async waitForContactForm(timeout = 5000): Promise<void> {
		await this.page.waitForSelector(`[data-tid="${ADDRESS_BOOK_CONTACT_NAME_INPUT}"]`, {
			state: 'visible',
			timeout
		});
	}

	/**
	 * Fills out the contact form with the provided details
	 * @param name Contact name (required)
	 * @param address Contact address (required)
	 * @param alias Contact alias (optional)
	 * @param network Network type (default: 'ICP')
	 */
	async fillContactForm({
		name,
		address,
		alias,
		network = 'ICP' as NetworkType
	}: {
		name: string;
		address: string;
		alias?: string;
		network?: NetworkType;
	}): Promise<void> {
		// Fill in the contact name
		const nameInput = this.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await nameInput.fill(name);

		await expect(nameInput).toHaveValue(name);

		// Fill in the address
		const addressInput = this.getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		await addressInput.fill(address);

		await expect(addressInput).toHaveValue(address);

		// Select the network
		const networkSelect = this.getByTestId(ADDRESS_BOOK_NETWORK_SELECT);
		await networkSelect.selectOption(network);

		await expect(networkSelect).toHaveValue(network);

		// Fill in the alias if provided
		if (alias) {
			const aliasInput = this.getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);
			await aliasInput.fill(alias);

			await expect(aliasInput).toHaveValue(alias);
		}
	}

	/**
	 * Clicks the save button to create/update a contact
	 */
	async saveContact(): Promise<void> {
		const saveButton = this.getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await saveButton.click();
		// Wait for the address book to be back in the main view
		await this.waitForAddressBookModal();
	}

	/**
	 * Clicks the cancel button to discard contact form changes
	 */
	async cancelContactForm(): Promise<void> {
		const cancelButton = this.getByTestId(ADDRESS_BOOK_CANCEL_BUTTON);
		await cancelButton.click();
		// Wait for the contact form to be hidden
		await this.page.waitForSelector(
			`[data-tid="${ADDRESS_BOOK_CONTACT_NAME_INPUT}"][aria-hidden="true"]`,
			{ state: 'hidden' }
		);
	}

	/**
	 * Searches for a contact in the address book
	 * @param searchTerm The search term to look for
	 */
	async searchContact({ searchTerm }: { searchTerm: string }): Promise<void> {
		const searchInput = this.getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await searchInput.fill(searchTerm);

		await expect(searchInput).toHaveValue(searchTerm);

		// Wait for search to complete (debounce time + rendering)
		await this.page.waitForTimeout(1000);
	}

	/**
	 * Verifies that a contact with the given name exists in the address book
	 * @param contactName The name of the contact to verify
	 * @param network The network of the contact to verify (optional)
	 * @param timeout Timeout in milliseconds (default: 5 seconds)
	 * @throws Will throw an error if the contact is not found
	 */
	async verifyContactExists({
		contactName,
		network,
		timeout = 5000
	}: {
		contactName: string;
		network?: NetworkType;
		timeout?: number;
	}): Promise<void> {
		// First try the more specific selector with network if provided
		if (network) {
			const networkSelector = `[data-tid^="address-book-contact-"]:has-text("${contactName}")[data-network="${network.toLowerCase()}"]`;
			const networkContactLocator = this.page.locator(networkSelector);

			try {
				await expect(networkContactLocator).toBeVisible({ timeout });

				return;
			} catch (_error) {
				// Fall through to more generic selector
			}
		}

		// Try the generic contact selector
		try {
			// Look for a contact with the given name in the list
			const contactLocator = this.page
				.locator('[data-tid^="contact-"],[data-tid^="address-book-contact-"]', {
					hasText: contactName
				})
				.first();

			await expect(contactLocator).toBeVisible({ timeout });
		} catch (_error) {
			throw new Error(`Contact with name "${contactName}" not found in the address book`);
		}
	}

	/**
	 * Verifies that the 'no contacts' message is displayed
	 * @param timeout Timeout in milliseconds (default: 3 seconds)
	 * @throws Will throw an error if the message is not found
	 */
	async verifyNoContactsMessage(timeout = 3000): Promise<void> {
		// Check for empty state message or no results message
		const emptyState = this.page.locator('text=No contacts found,text=No results found').first();
		try {
			await expect(emptyState).toBeVisible({ timeout });
		} catch (_error) {
			throw new Error('Expected to find no contacts message, but it was not visible');
		}
	}

	/**
	 * Closes the address book modal
	 */
	async close(): Promise<void> {
		const closeButton = this.getByTestId(BUTTON_MODAL_CLOSE);
		await closeButton.click();

		// Wait for the modal to be hidden
		await expect(this.getByTestId(ADDRESS_BOOK_MODAL)).not.toBeVisible();
	}
}
