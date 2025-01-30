import {
	AMOUNT_DATA,
	AMOUNT_INPUT,
	DESTINATION_INPUT,
	IN_PROGRESS_MODAL,
	MAX_BUTTON,
	RECEIVE_TOKENS_MODAL_COPY_ICP_ACCOUNT_ID_BUTTON,
	RECEIVE_TOKENS_MODAL_DONE_BUTTON,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
	REVIEW_FORM_SEND_BUTTON,
	SEND_FORM_NEXT_BUTTON,
	SEND_TOKENS_MODAL_OPEN_BUTTON,
	TOKEN_CARD_ICP
} from '$lib/constants/test-ids.constants';
import { expect } from '@playwright/test';
import { LedgerTransferCommand } from '../../utils/commands/ledger-transfer.command';
import { createCommandRunner } from '../../utils/commands/runner';
import { HomepageLoggedIn, type HomepageLoggedInParams } from './homepage.page';

const commandRunner = createCommandRunner({ environment: 'localhost' });

export type FlowPageParams = HomepageLoggedInParams;

export class FlowPage extends HomepageLoggedIn {
	constructor({ page, iiPage, context }: FlowPageParams) {
		super({ page, iiPage, context });
	}

	async receiveTokens(): Promise<void> {
		await this.clickByTestId(TOKEN_CARD_ICP);
		await this.waitForByTestId(AMOUNT_DATA);
		expect(this.getBalance()).toHaveText('0.00');
		await this.clickByTestId(RECEIVE_TOKENS_MODAL_OPEN_BUTTON);
		const accountId = await this.clickCopyButtonByTestId(
			RECEIVE_TOKENS_MODAL_COPY_ICP_ACCOUNT_ID_BUTTON
		);
		expect(accountId).toBeTruthy();
		await commandRunner.exec({
			command: new LedgerTransferCommand({ amount: '10', recipient: accountId })
		});
		await this.clickByTestId(RECEIVE_TOKENS_MODAL_DONE_BUTTON);
		expect(this.getBalance()).toHaveText('10 ICP', { timeout: 30_000 });
	}

	async sendTokens(): Promise<void> {
		await this.clickByTestId(SEND_TOKENS_MODAL_OPEN_BUTTON);
		await this.clickByTestId(MAX_BUTTON);
		await this.setInputValueByTestId({
			testId: DESTINATION_INPUT,
			value: 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae'
		});
		await this.setInputValueByTestId({
			testId: AMOUNT_INPUT,
			value: '1'
		});
		await this.clickByTestId(SEND_FORM_NEXT_BUTTON);
		await this.clickByTestId(REVIEW_FORM_SEND_BUTTON);
		const progressModalExists = await this.elementExistsByTestId(IN_PROGRESS_MODAL);
		expect(progressModalExists).toBe(true);
		await this.waitForModalToDisappearByTestId(IN_PROGRESS_MODAL);
		const progressModalDoesNotExists = await this.elementExistsByTestId(IN_PROGRESS_MODAL);
		expect(progressModalDoesNotExists).toBe(false);
	}
}
