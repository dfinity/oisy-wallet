import { testWithII } from '@dfinity/internet-identity-playwright';
import { FlowPage } from './utils/pages/send-and-receive-flow.page';

testWithII('receive and send icp', async ({ page, context, iiPage }) => {
	const flowPage = new FlowPage({ page, context, iiPage });


	await flowPage.waitForReady();
	await flowPage.receiveTokens();
	await flowPage.sendTokens();
	await flowPage.takeScreenshot();
});
