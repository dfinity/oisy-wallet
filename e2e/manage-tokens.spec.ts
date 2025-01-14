import { testWithII } from '@dfinity/internet-identity-playwright';
import { expect } from '@playwright/test';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

let homepageLoggedIn: HomepageLoggedIn;

testWithII.beforeEach(async ({ page, iiPage }) => {
	homepageLoggedIn = new HomepageLoggedIn({
		page,
		iiPage,
	});

	await homepageLoggedIn.waitForReady();
});

testWithII('enable ICRC token', async () => {
  // enable the Token in the list
  await homepageLoggedIn.activateTestnetSettings();
  await homepageLoggedIn.toggleTokenInList('ckSepoliaETH', 'Internet Computer');
  await expect(homepageLoggedIn.getTokenCardLocator('ckSepoliaETH')).toBeVisible();
  await homepageLoggedIn.waitForLoadState();
  await homepageLoggedIn.setCarouselFirstSlide();
	await homepageLoggedIn.takeScreenshot();
  });

testWithII('disable ICRC token', async () => {
  //disable the Token in the list
  await homepageLoggedIn.activateTestnetSettings();
  await homepageLoggedIn.toggleTokenInList('ckSepoliaETH', 'Internet Computer');
  await expect(homepageLoggedIn.getTokenCardLocator('ckSepoliaETH')).toBeVisible();
  await homepageLoggedIn.waitForLoadState();
  await homepageLoggedIn.toggleTokenInList('ckSepoliaETH', 'Internet Computer');
  await expect(homepageLoggedIn.getTokenCardLocator('ckSepoliaETH')).not.toBeVisible();
  await homepageLoggedIn.setCarouselFirstSlide();
	await homepageLoggedIn.takeScreenshot();
  });

testWithII('enable ERC20 token', async () => {
  // enable the Token in the list
  await homepageLoggedIn.activateTestnetSettings();
  await homepageLoggedIn.toggleTokenInList('SHIB', 'Ethereum');
  await expect(homepageLoggedIn.getTokenCardLocator('SHIB')).toBeVisible();
  await homepageLoggedIn.waitForLoadState();
  await homepageLoggedIn.setCarouselFirstSlide();
	await homepageLoggedIn.takeScreenshot();
  });
  
testWithII('disable ERC20 token', async () => {
  //disable the Token in the list
  await homepageLoggedIn.activateTestnetSettings();
  await homepageLoggedIn.toggleTokenInList('SHIB', 'Ethereum');
  await expect(homepageLoggedIn.getTokenCardLocator('SHIB')).toBeVisible();
  await homepageLoggedIn.waitForLoadState();
  await homepageLoggedIn.toggleTokenInList('SHIB', 'Ethereum');
  await expect(homepageLoggedIn.getTokenCardLocator('SHIB')).not.toBeVisible();
  await homepageLoggedIn.setCarouselFirstSlide();
	await homepageLoggedIn.takeScreenshot();
  });

testWithII('enable SepoliaERC20 token', async () => {
  // enable the Token in the list
  await homepageLoggedIn.activateTestnetSettings();
  await homepageLoggedIn.toggleTokenInList('USDC', 'Sepolia');
  await expect(homepageLoggedIn.getTokenCardLocator('USDC')).toBeVisible();
  await homepageLoggedIn.waitForLoadState();
  await homepageLoggedIn.setCarouselFirstSlide();
	await homepageLoggedIn.takeScreenshot();
  });

testWithII('disable SepoliaERC20 token', async () => {
  //disable the Token in the list
  await homepageLoggedIn.activateTestnetSettings();
  await homepageLoggedIn.toggleTokenInList('USDC', 'Sepolia');
  await expect(homepageLoggedIn.getTokenCardLocator('USDC')).toBeVisible();
  await homepageLoggedIn.waitForLoadState();
  await homepageLoggedIn.toggleTokenInList('USDC', 'Sepolia');
  await expect(homepageLoggedIn.getTokenCardLocator('USDC')).not.toBeVisible();
  await homepageLoggedIn.setCarouselFirstSlide();
	await homepageLoggedIn.takeScreenshot();
  });