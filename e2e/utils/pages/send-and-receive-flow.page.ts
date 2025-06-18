import {
	AMOUNT_DATA,
	DESTINATION_INPUT,
	IN_PROGRESS_MODAL,
	MAX_BUTTON,
	RECEIVE_TOKENS_MODAL,
	RECEIVE_TOKENS_MODAL_DONE_BUTTON,
	RECEIVE_TOKENS_MODAL_ICP_SECTION,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
	REVIEW_FORM_SEND_BUTTON,
	SEND_FORM_DESTINATION_NEXT_BUTTON,
	SEND_FORM_NEXT_BUTTON,
	SEND_TOKENS_MODAL,
	SEND_TOKENS_MODAL_OPEN_BUTTON,
	TOKEN_CARD,
	TOKEN_INPUT_CURRENCY_TOKEN,
	ADDRESS_BOOK_MODAL_BUTTON,
	CONTACT_CARD,
	CONTACT_CARD_BUTTON,
	ADDRESS_LIST_ITEM_BUTTON,
	ADDRESS_BOOK_MODAL_BUTTON,
	CONTACT_CARD,
	CONTACT_CARD_BUTTON,
	ADDRESS_LIST_ITEM_BUTTON
} from '$lib/constants/test-ids.constants';
import { expect } from '@playwright/test';
import { LedgerTransferCommand } from '../commands/ledger-transfer.command';
import { createCommandRunner } from '../commands/runner';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

const commandRunner = createCommandRunner();

export type FlowPageParams = HomepageLoggedInParams;

export class FlowPage extends HomepageLoggedIn {
	constructor(params: FlowPageParams) {
		super(params);
	}

	async receiveTokens(): Promise<void> {
		await this.clickByTestId({ testId: `${TOKEN_CARD}-ICP-ICP` });
		await this.waitForByTestId({ testId: AMOUNT_DATA });

		await expect(this.getBalanceLocator()).toHaveText('0 ICP');

		await this.waitForModal({
			modalOpenButtonTestId: RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
			modalTestId: RECEIVE_TOKENS_MODAL
		});
		const accountId = await this.getAccountIdByTestId(RECEIVE_TOKENS_MODAL_ICP_SECTION);

		expect(accountId).toBeTruthy();

		await commandRunner.exec({
			command: new LedgerTransferCommand({ amount: '10', recipient: accountId })
		});
		await this.clickByTestId({ testId: RECEIVE_TOKENS_MODAL_DONE_BUTTON });

		await expect(this.getBalanceLocator()).toHaveText('10 ICP', { timeout: 30_000 });
	}

	async sendTokens(): Promise<void> {
		await this.clickByTestId({ testId: SEND_TOKENS_MODAL_OPEN_BUTTON });
		await this.waitForModal({
			modalOpenButtonTestId: SEND_TOKENS_MODAL_OPEN_BUTTON,
			modalTestId: SEND_TOKENS_MODAL
		});
		await this.setInputValueByTestId({
			testId: DESTINATION_INPUT,
			value: 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae'
		});
		await this.clickByTestId({ testId: SEND_FORM_DESTINATION_NEXT_BUTTON });
		await this.clickByTestId({ testId: MAX_BUTTON });
		await this.setInputValueByTestId({
			testId: TOKEN_INPUT_CURRENCY_TOKEN,
			value: '1'
		});
		await this.clickByTestId({ testId: SEND_FORM_NEXT_BUTTON });
		await this.clickByTestId({ testId: REVIEW_FORM_SEND_BUTTON });
		const progressModalExists = await this.isVisibleByTestId(IN_PROGRESS_MODAL);

		expect(progressModalExists).toBeTruthy();

		await this.waitForByTestId({
			testId: IN_PROGRESS_MODAL,
			options: { state: 'detached' }
		});
		const progressModalDoesNotExists = await this.isVisibleByTestId(IN_PROGRESS_MODAL);

		expect(progressModalDoesNotExists).toBeFalsy();

		await this.mockSelectorAll({
			selector: '[data-tid="receive-tokens-modal-transaction-timestamp"]'
		});
	}
	
	async sendTokensToContact(contactName: string, amount: string = '1'): Promise<void> {
		// Open the send tokens modal
		await this.clickByTestId({ testId: SEND_TOKENS_MODAL_OPEN_BUTTON });
		await this.waitForModal({
			modalOpenButtonTestId: SEND_TOKENS_MODAL_OPEN_BUTTON,
			modalTestId: SEND_TOKENS_MODAL
		});
		
		// Click on the address book button to select a contact
		await this.clickByTestId({ testId: ADDRESS_BOOK_MODAL_BUTTON });
		
		// Wait for the address book modal to appear
		await this.waitForByTestId({ testId: CONTACT_CARD });
		
		// Find and select the contact with the given name
		const contactCards = await this.page.locator(`[data-tid="${CONTACT_CARD}"]`).all();
		
		for (const card of contactCards) {
			const text = await card.textContent();
			if (text && text.includes(contactName)) {
				// Click on the contact card button
				await card.locator(`[data-tid="${CONTACT_CARD_BUTTON}"]`).click();
				break;
			}
		}
		
		// Select the address from the contact
		await this.clickByTestId({ testId: ADDRESS_LIST_ITEM_BUTTON });
		
		// Continue with the send flow
		await this.clickByTestId({ testId: SEND_FORM_DESTINATION_NEXT_BUTTON });
		
		// Set the amount
		await this.setInputValueByTestId({
			testId: TOKEN_INPUT_CURRENCY_TOKEN,
			value: amount
		});
		
		// Continue to review
		await this.clickByTestId({ testId: SEND_FORM_NEXT_BUTTON });
		
		// Send the tokens
		await this.clickByTestId({ testId: REVIEW_FORM_SEND_BUTTON });
		
		// Wait for the transaction to complete
		const progressModalExists = await this.isVisibleByTestId(IN_PROGRESS_MODAL);
		expect(progressModalExists).toBeTruthy();
		
		await this.waitForByTestId({
			testId: IN_PROGRESS_MODAL,
			options: { state: 'detached' }
		});
		
		const progressModalDoesNotExists = await this.isVisibleByTestId(IN_PROGRESS_MODAL);
		expect(progressModalDoesNotExists).toBeFalsy();
		
		await this.mockSelectorAll({
			selector: '[data-tid="receive-tokens-modal-transaction-timestamp"]'
		});
	}
	
	async sendTokensToContact(contactName: string, amount: string = '1'): Promise<void> {
		// Open the send tokens modal
		await this.clickByTestId({ testId: SEND_TOKENS_MODAL_OPEN_BUTTON });
		await this.waitForModal({
			modalOpenButtonTestId: SEND_TOKENS_MODAL_OPEN_BUTTON,
			modalTestId: SEND_TOKENS_MODAL
		});
		
		// Click on the address book button to select a contact
		await this.clickByTestId({ testId: ADDRESS_BOOK_MODAL_BUTTON });
		
		// Wait for the address book modal to appear
		await this.waitForByTestId({ testId: CONTACT_CARD });
		
		// Find and select the contact with the given name
		const contactCards = await this.page.locator(`[data-tid="${CONTACT_CARD}"]`).all();
		
		for (const card of contactCards) {
			const text = await card.textContent();
			if (text && text.includes(contactName)) {
				// Click on the contact card button
				await card.locator(`[data-tid="${CONTACT_CARD_BUTTON}"]`).click();
				break;
			}
		}
		
		// Select the address from the contact
		await this.clickByTestId({ testId: ADDRESS_LIST_ITEM_BUTTON });
		
		// Continue with the send flow
		await this.clickByTestId({ testId: SEND_FORM_DESTINATION_NEXT_BUTTON });
		
		// Set the amount
		await this.setInputValueByTestId({
			testId: TOKEN_INPUT_CURRENCY_TOKEN,
			value: amount
		});
		
		// Continue to review
		await this.clickByTestId({ testId: SEND_FORM_NEXT_BUTTON });
		
		// Send the tokens
		await this.clickByTestId({ testId: REVIEW_FORM_SEND_BUTTON });
		
		// Wait for the transaction to complete
		const progressModalExists = await this.isVisibleByTestId(IN_PROGRESS_MODAL);
		expect(progressModalExists).toBeTruthy();
		
		await this.waitForByTestId({
			testId: IN_PROGRESS_MODAL,
			options: { state: 'detached' }
		});
		
		const progressModalDoesNotExists = await this.isVisibleByTestId(IN_PROGRESS_MODAL);
		expect(progressModalDoesNotExists).toBeFalsy();
		
		await this.mockSelectorAll({
			selector: '[data-tid="receive-tokens-modal-transaction-timestamp"]'
		});
	}
}
