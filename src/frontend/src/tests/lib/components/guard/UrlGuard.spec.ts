import {render} from "@testing-library/svelte";
import UrlGuard from "$lib/components/guard/UrlGuard.svelte";
import {loading} from "$lib/stores/loader.store";
import {mockPage} from "$tests/mocks/page.store.mock";
import {mockAuthStore} from "$tests/mocks/auth.mock";
import {setReferrer} from "$lib/api/reward.api";
import {mockIdentity} from "$tests/mocks/identity.mock";
import * as rewardService from "$lib/services/reward.services";
import * as navUtils from "$lib/utils/nav.utils";
import {removeSearchParam} from "$lib/utils/nav.utils";

describe('UrlGuard', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockPage.reset();
    });

    describe('Referrer', () => {
        let setReferrerSpy: any;
        let removeSearchParamSpy: any;

        beforeEach(() => {
            loading.set(false);
            mockAuthStore();

            setReferrerSpy = vi.spyOn(rewardService, 'setReferrer').mockImplementation(vi.fn());
            removeSearchParamSpy = vi.spyOn(navUtils, 'removeSearchParam').mockImplementation(vi.fn());
        });

        it('should establish connection between user and referrer', async () => {
            const referrerCode = 123456;
            const referrerUrl = new URL(`http://localhost:5173/?referrer=${referrerCode}`);

            mockPage.mockUrl(referrerUrl);

            render(UrlGuard);

            await vi.waitFor(() => {
                expect(setReferrerSpy).toHaveBeenCalledWith({
                    identity: mockIdentity,
                    referrerCode
                });

                expect(removeSearchParamSpy).toHaveBeenCalledWith({
                    url: referrerUrl,
                    searchParam: 'referrer'
                });
            });
        });

        it('should just remove search param if referral code is invalid', async () => {
            const referrerCode = 'abcdef';
            const referrerUrl = new URL(`http://localhost:5173/?referrer=${referrerCode}`);

            mockPage.mockUrl(referrerUrl);

            render(UrlGuard);

            await vi.waitFor(() => {
                expect(setReferrerSpy).not.toHaveBeenCalled();

                expect(removeSearchParamSpy).toHaveBeenCalledWith({
                    url: referrerUrl,
                    searchParam: 'referrer'
                });
            });
        });

        it('should do nothing if no referrer search param is provided', async () => {
            const referrerUrl = new URL(`http://localhost:5173/`);

            mockPage.mockUrl(referrerUrl);

            render(UrlGuard);

            await vi.waitFor(() => {
                expect(setReferrerSpy).not.toHaveBeenCalled();
                expect(removeSearchParamSpy).not.toHaveBeenCalled();
            });
        });
    });
});