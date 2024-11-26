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
import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { LedgerTransferCommand } from './utils/commands/ledger-transfer.command';
import { createCommandRunner } from './utils/commands/runner';
import { MODALS_VIEWPORT_WIDTH } from './utils/constants/e2e.constants';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

const SEND_TOKENS_MODAL_VIEWPORT_HEIGHT = 900;
let homepageLoggedIn: HomepageLoggedIn;

const commandRunner = createCommandRunner('localhost');

testWithII.beforeEach(async ({ page, iiPage, context }) => {
	homepageLoggedIn = new HomepageLoggedIn({
		page,
		context,
		iiPage,
		viewportSize: {
			width: MODALS_VIEWPORT_WIDTH,
			height: SEND_TOKENS_MODAL_VIEWPORT_HEIGHT
		}
	});

	await homepageLoggedIn.waitForReady();
});

testWithII('send and recieve icp', async () => {
	await homepageLoggedIn.clickBy({ testId: TOKEN_CARD_ICP });
	await homepageLoggedIn.waitForBy({ testId: AMOUNT_DATA });
	expect(homepageLoggedIn.getBalance()).toHaveText('0.00');
	await homepageLoggedIn.clickBy({ testId: RECEIVE_TOKENS_MODAL_OPEN_BUTTON });
	const accountId = await homepageLoggedIn.clickCopyButton({
		testId: RECEIVE_TOKENS_MODAL_COPY_ICP_ACCOUNT_ID_BUTTON
	});
	expect(accountId).toBeTruthy();
	const runnerAnswer = await commandRunner.exec(
		new LedgerTransferCommand({ amount: '10', recipient: accountId!! })
	);
	console.log('PMD', runnerAnswer);
	await homepageLoggedIn.clickBy({ testId: RECEIVE_TOKENS_MODAL_DONE_BUTTON });
	expect(homepageLoggedIn.getBalance()).toHaveText('10 ICP', { timeout: 30_000 });
	await homepageLoggedIn.clickBy({ testId: SEND_TOKENS_MODAL_OPEN_BUTTON });
	await homepageLoggedIn.clickBy({ testId: MAX_BUTTON });
	await homepageLoggedIn.setInputValueByTestId({
		testId: DESTINATION_INPUT,
		value: 'tjgkf-baw6u-7lmw2-cbwoi-omgia-jk4kg-yvfcw-jni6g-k7spl-552th-jae'
	});
	await homepageLoggedIn.setInputValueByTestId({ testId: AMOUNT_INPUT, value: '1' });
	await homepageLoggedIn.clickBy({ testId: SEND_FORM_NEXT_BUTTON });
	await homepageLoggedIn.clickBy({ testId: REVIEW_FORM_SEND_BUTTON });
	const progressModalExists = await homepageLoggedIn.elementExistsBy({ testId: IN_PROGRESS_MODAL });
	expect(progressModalExists).toBe(true);
	await homepageLoggedIn.waitForModalToDisappear({ testId: IN_PROGRESS_MODAL });
	const progressModalDoesNotExists = await homepageLoggedIn.elementExistsBy({
		testId: IN_PROGRESS_MODAL
	});
	expect(progressModalDoesNotExists).toBe(false);
});
