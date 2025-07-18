import { testWithII } from '@dfinity/internet-identity-playwright';
import { FlowPage } from './utils/pages/send-and-receive-flow.page';

testWithII('should receive and send ICP', async ({ page, iiPage, isMobile }) => {
	const flowPage = new FlowPage({ page, iiPage, isMobile });

	await flowPage.waitForReady();
	await flowPage.receiveTokens();
	await flowPage.sendTokens();
	await flowPage.takeScreenshot();
});
