import {render, waitFor} from "@testing-library/svelte";
import Transactions from "$lib/components/transactions/Transactions.svelte";
import {modalStore} from "$lib/stores/modal.store";
import {get} from "svelte/store";
import {mockPage} from "$tests/mocks/page.store.mock";
import {ICP_TOKEN} from "$env/tokens/tokens.icp.env";
import {ICP_NETWORK_SYMBOL} from "$env/networks/networks.env";
import {MANAGE_TOKENS_MODAL_CLOSE} from "$lib/constants/test-ids.constants";
import * as appNavigation from '$app/navigation';

describe('Transactions', () => {
    const timeout = 7000;
    const mockGoTo = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        modalStore.close();
        mockPage.reset();

        vi.spyOn(appNavigation, 'goto').mockImplementation(mockGoTo);

        Object.defineProperty(window, 'navigator', {
            writable: true,
            value: {
                userAgentData: {
                    mobile: false
                }
            }
        });
    });

    it('should open the manage token modal if a disabled token is used', async () => {
        mockPage.mock({ token: 'WaterNeuron', network: ICP_NETWORK_SYMBOL });

        render(Transactions);

        await waitFor(
            () => {
                expect(get(modalStore)).toBeDefined();
                expect(get(modalStore)?.type).toBe('manage-tokens');
            },
            { timeout }
        );
    });

    it('should not open the manage token modal if a not supported token is used', async () => {
        mockPage.mock({ token: 'WaterGlas', network: ICP_NETWORK_SYMBOL });

        render(Transactions);

        await new Promise<void> ((resolve) =>
            setTimeout(
                () => {
                    expect(get(modalStore)).toBeNull();
                    resolve();
                },
                timeout
            )
        );
    });

    it('should not open the manage token modal if an enabled token is used', async () => {
        mockPage.mock({ token: ICP_TOKEN.name, network: ICP_NETWORK_SYMBOL });

        render(Transactions);

        await new Promise<void> ((resolve) =>
            setTimeout(
                () => {
                    expect(get(modalStore)).toBeNull();
                    resolve();
                },
                timeout
            )
        );
    });

    it('should redirect the user to the activity page if the modal gets closed', async () => {
        mockPage.mock({ token: 'WaterNeuron', network: ICP_NETWORK_SYMBOL });

        const { container } = render(Transactions);

        await waitFor(
            () => {
                expect(get(modalStore)).toBeDefined();
                expect(get(modalStore)?.type).toBe('manage-tokens');

                const button: HTMLButtonElement | null = container.querySelector(
                    `button[data-tid='${MANAGE_TOKENS_MODAL_CLOSE}']`
                );

                button?.click();

                expect(mockGoTo).toHaveBeenCalledWith('/');
            },
            { timeout }
        );
    });
}, 60000);