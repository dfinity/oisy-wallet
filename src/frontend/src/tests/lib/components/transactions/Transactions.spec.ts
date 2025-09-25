import * as appNavigation from '$app/navigation';
import { ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import Transactions from '$lib/components/transactions/Transactions.svelte';
import { BUTTON_MODAL_CLOSE } from '$lib/constants/test-ids.constants';
import { modalStore } from '$lib/stores/modal.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('Transactions', () => {
	const timeout = 12000;
	const mockGoTo = vi.fn();

	beforeEach(() => {
		vi.useFakeTimers();
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

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should open the manage token modal if a disabled token is used', async () => {
		mockPage.mock({ token: 'WaterNeuron', network: ICP_NETWORK_SYMBOL });

		render(Transactions);

		await vi.advanceTimersByTimeAsync(timeout);
		await vi.runOnlyPendingTimersAsync();

		expect(get(modalStore)).toBeDefined();
		expect(get(modalStore)?.type).toBe('manage-tokens');
	});

	it('should not open the manage token modal if a not supported token is used', async () => {
		mockPage.mock({ token: 'WaterGlas', network: ICP_NETWORK_SYMBOL });

		render(Transactions);

		await vi.advanceTimersByTimeAsync(timeout);
		await vi.runOnlyPendingTimersAsync();

		expect(get(modalStore)).toBeNull();
	});

	it('should not open the manage token modal if an enabled token is used', async () => {
		mockPage.mock({ token: ICP_TOKEN.name, network: ICP_NETWORK_SYMBOL });

		render(Transactions);

		await vi.advanceTimersByTimeAsync(timeout);
		await vi.runOnlyPendingTimersAsync();

		expect(get(modalStore)).toBeNull();
	});

	it('should redirect the user to the activity page if the modal gets closed', async () => {
		mockPage.mock({ token: 'WaterNeuron', network: ICP_NETWORK_SYMBOL });

		const { container } = render(Transactions);

		await vi.advanceTimersByTimeAsync(timeout);
		await vi.runOnlyPendingTimersAsync();

		expect(get(modalStore)).toBeDefined();
		expect(get(modalStore)?.type).toBe('manage-tokens');

		const button: HTMLButtonElement | null = container.querySelector(
			`button[data-tid='${BUTTON_MODAL_CLOSE}']`
		);

		button?.click();

		expect(mockGoTo).toHaveBeenCalledWith('/');
	});

	it('should not redirect the user if the modal gets closed and pageToken is nonNullish', async () => {
		mockPage.mock({ token: 'WaterNeuron', network: ICP_NETWORK_SYMBOL });

		const { container } = render(Transactions);

		await vi.advanceTimersByTimeAsync(timeout);
		await vi.runOnlyPendingTimersAsync();

		expect(get(modalStore)).toBeDefined();
		expect(get(modalStore)?.type).toBe('manage-tokens');

		const button: HTMLButtonElement | null = container.querySelector(
			`button[data-tid='${BUTTON_MODAL_CLOSE}']`
		);

		mockPage.mock({ token: ICP_TOKEN.name, network: ICP_NETWORK_SYMBOL });

		button?.click();

		expect(mockGoTo).not.toHaveBeenCalled();
	});

	it('should redirect the user to the activity page if token does not exist', async () => {
		mockPage.mock({ token: 'UNKNOWN', network: ICP_NETWORK_SYMBOL });

		render(Transactions);

		await vi.advanceTimersByTimeAsync(timeout);
		await vi.runOnlyPendingTimersAsync();

		expect(get(modalStore)).toBeNull();

		expect(mockGoTo).toHaveBeenCalledWith('/');
	});
});
