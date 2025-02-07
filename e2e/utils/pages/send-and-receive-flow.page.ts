import {
	AMOUNT_DATA,
	AMOUNT_INPUT,
	DESTINATION_INPUT,
	IN_PROGRESS_MODAL,
	MAX_BUTTON,
	RECEIVE_TOKENS_MODAL_ADDRESS_LABEL,
	RECEIVE_TOKENS_MODAL_DONE_BUTTON,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
	REVIEW_FORM_SEND_BUTTON,
	SEND_FORM_NEXT_BUTTON,
	SEND_TOKENS_MODAL_OPEN_BUTTON,
	TOKEN_CARD
} from '$lib/constants/test-ids.constants';
import { expect } from '@playwright/test';
import { LedgerTransferCommand } from '../commands/ledger-transfer.command';
import { createCommandRunner } from '../commands/runner';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

const commandRunner = createCommandRunner();

export type FlowPageParams = HomepageLoggedInParams;

export class FlowPage extends HomepageLoggedIn {
	constructor({ page, iiPage }: FlowPageParams) {
		super({ page, iiPage });
	}

	async receiveTokens(): Promise<void> {
		await this.clickByTestId({ testId: `${TOKEN_CARD}-ICP-ICP` });
		await this.waitForByTestId({ testId: AMOUNT_DATA });
		expect(this.getBalanceLocator()).toHaveText('0.00');
		await this.clickByTestId({ testId: RECEIVE_TOKENS_MODAL_OPEN_BUTTON });
		const accountId = await this.getAccountIdByTestId(RECEIVE_TOKENS_MODAL_ADDRESS_LABEL);
		expect(accountId).toBeTruthy();
		await commandRunner.exec({
			command: new LedgerTransferCommand({ amount: '10', recipient: accountId })
		});
		await this.clickByTestId({ testId: RECEIVE_TOKENS_MODAL_DONE_BUTTON });
		expect(this.getBalanceLocator()).toHaveText('10 ICP', { timeout: 30_000 });
	}

	async sendTokens(): Promise<void> {
		await this.clickByTestId({ testId: SEND_TOKENS_MODAL_OPEN_BUTTON });
		await this.clickByTestId({ testId: MAX_BUTTON });
		await this.setInputValueByTestId({
			testId: DESTINATION_INPUT,
			value: 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae'
		});
		await this.setInputValueByTestId({
			testId: AMOUNT_INPUT,
			value: '1'
		});
		await this.clickByTestId({ testId: SEND_FORM_NEXT_BUTTON });
		await this.clickByTestId({ testId: REVIEW_FORM_SEND_BUTTON });
		const progressModalExists = await this.isVisibleByTestId(IN_PROGRESS_MODAL);
		expect(progressModalExists).toBe(true);
		await this.waitForModal({ modalTestId: IN_PROGRESS_MODAL, state: 'detached' });
		const progressModalDoesNotExists = await this.isVisibleByTestId(IN_PROGRESS_MODAL);
		expect(progressModalDoesNotExists).toBe(false);
		await this.mockSelectorAll({
			selector: '[data-tid="receive-tokens-modal-transaction-timestamp"]'
		});
	}
}
