import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
import { modalStore } from '$lib/stores/modal.store';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$lib/derived/address.derived', async () => {
	const { writable } = await import('svelte/store');
	return {
		ethAddressNotLoaded: writable(false),
		solAddressMainnetNotLoaded: writable(false)
	};
});

describe('WalletConnect', () => {
	const openSessionsSpy = vi
		.spyOn(modalStore, 'openWalletConnectSessions')
		.mockImplementation(() => {});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render WalletConnect button', () => {
		const { container } = render(WalletConnect);

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
	});

	it('should render WalletConnect icon', () => {
		const { container } = render(WalletConnect);

		const svg = container.querySelector('svg');

		expect(svg).toBeInTheDocument();
	});

	it('should open wallet connect sessions modal on click', async () => {
		const { container } = render(WalletConnect);

		const button = container.querySelector('button');

		expect(button).not.toBeNull();

		assertNonNullish(button);

		await fireEvent.click(button);

		expect(openSessionsSpy).toHaveBeenCalledExactlyOnceWith(expect.any(Symbol));
	});

	it('should not be disabled when addresses are loaded', () => {
		const { container } = render(WalletConnect);

		const button = container.querySelector('button');

		expect(button).not.toBeDisabled();
	});
});
