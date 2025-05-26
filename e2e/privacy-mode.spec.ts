import {testWithII} from "@dfinity/internet-identity-playwright";
import {FlowPage} from "./utils/pages/send-and-receive-flow.page";
import {HomepageLoggedIn} from "./utils/pages/homepage.page";
import {NAVIGATION_ITEM_ACTIVITY} from "$lib/constants/test-ids.constants";

// testWithII('should display privacy mode on homepage', async ({ page, iiPage, isMobile }) => {
//     const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage, isMobile });
//
//     await homepageLoggedIn.waitForReady();
//
//     await homepageLoggedIn.activatePrivacyMode();
//
//     await homepageLoggedIn.clickTokenGroupCard({tokenSymbol: 'ETH', networkSymbol: 'ETH'});
//
//     await homepageLoggedIn.takeScreenshot({ freezeCarousel: true });
// });

testWithII('should display privacy mode on activity page', async ({ page, iiPage, isMobile }) => {
    const flowPage = new FlowPage({ page, iiPage, isMobile });

    await flowPage.waitForReady();

    await flowPage.receiveTokens();

    // await flowPage.sendTokens();

    await flowPage.navigateToActivity();

    await flowPage.takeScreenshot();
});