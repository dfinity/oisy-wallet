import TransactionMenu from '$lib/components/transactions/TransactionMenu.svelte';
import {
	TRANSACTION_MENU,
	TRANSACTION_MENU_HIDDEN_TRANSACTIONS,
	TRANSACTION_MENU_POPOVER
} from '$lib/constants/test-ids.constants';
import { modalStore } from '$lib/stores/modal.store';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('TransactionMenu', () => {
	const menuButtonSelector = `button[data-tid="${TRANSACTION_MENU}"]`;
	const menuPopoverSelector = `div[data-tid="${TRANSACTION_MENU_POPOVER}"]`;
	const menuItemHiddenTransactionsSelector = `button[data-tid="${TRANSACTION_MENU_HIDDEN_TRANSACTIONS}"]`;

	beforeEach(() => {
		modalStore.close();
	});

	it('should not render menu items', () => {
		const { container } = render(TransactionMenu);

		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);
		expect(menuButton).toBeInTheDocument();

		const menuPopover: HTMLDivElement | null = container.querySelector(menuPopoverSelector);
		expect(menuPopover).not.toBeInTheDocument();

		const menuItemHiddenTransactionsButton: HTMLButtonElement | null = container.querySelector(
			menuItemHiddenTransactionsSelector
		);
		expect(menuItemHiddenTransactionsButton).not.toBeInTheDocument();
	});

	it('should display and hide menu items', async () => {
		const { container } = render(TransactionMenu);

		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);
		expect(menuButton).toBeInTheDocument();

		let menuPopover: HTMLDivElement | null = container.querySelector(menuPopoverSelector);
		expect(menuPopover).not.toBeInTheDocument();

		let menuItemHiddenTransactionsButton: HTMLButtonElement | null = container.querySelector(
			menuItemHiddenTransactionsSelector
		);
		expect(menuItemHiddenTransactionsButton).not.toBeInTheDocument();

		await waitFor(() => menuButton?.click());

		menuPopover = container.querySelector(menuPopoverSelector);
		expect(menuPopover).toBeInTheDocument();

		menuItemHiddenTransactionsButton = container.querySelector(menuItemHiddenTransactionsSelector);
		expect(menuItemHiddenTransactionsButton).toBeInTheDocument();

		await waitFor(() => {
			menuPopover?.click();

			menuPopover = container.querySelector(menuPopoverSelector);
			expect(menuPopover).not.toBeInTheDocument();

			menuItemHiddenTransactionsButton = container.querySelector(
				menuItemHiddenTransactionsSelector
			);
			expect(menuItemHiddenTransactionsButton).not.toBeInTheDocument();
		});
	});

	it('should open hidden transactions modal', async () => {
		const { container } = render(TransactionMenu);

		const menuButton: HTMLButtonElement | null = container.querySelector(menuButtonSelector);
		expect(menuButton).toBeInTheDocument();

		await waitFor(() => menuButton?.click());

		const menuItemHiddenTransactionsButton: HTMLButtonElement | null = container.querySelector(
			menuItemHiddenTransactionsSelector
		);
		expect(menuItemHiddenTransactionsButton).toBeInTheDocument();

		await waitFor(() => menuItemHiddenTransactionsButton?.click());

		expect(get(modalStore)?.type).toBe('hidden-transactions');
	});
});
