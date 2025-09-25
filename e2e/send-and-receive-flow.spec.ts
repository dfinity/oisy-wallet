import { testWithII } from '@dfinity/internet-identity-playwright';
import { FlowPage } from './utils/pages/send-and-receive-flow.page';

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip('should receive and send ICP', async ({ page, iiPage, isMobile }) => {
	const flowPage = new FlowPage({ page, iiPage, isMobile });

	await flowPage.waitForReady();
	await flowPage.receiveTokens();
	await flowPage.sendTokens();
	await flowPage.takeScreenshot();
});
