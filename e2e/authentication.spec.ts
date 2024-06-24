import { testWithII } from '@dfinity/internet-identity-playwright';

const testUrl = '/';

testWithII('should sign-in', async ({ page, iiPage }) => {
	await page.goto(testUrl);

	await iiPage.signInWithNewIdentity();
});
