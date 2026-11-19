import SettingsWalletConnectUncheckedSigning from '$lib/components/settings/SettingsWalletConnectUncheckedSigning.svelte';
import {
	SETTINGS_UNCHECKED_SIGNING_CONFIRM_BUTTON,
	SETTINGS_UNCHECKED_SIGNING_TIME_LEFT,
	SETTINGS_UNCHECKED_SIGNING_TOGGLE
} from '$lib/constants/test-ids.constants';
import { WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS } from '$lib/constants/wallet-connect.constants';
import * as walletConnectAnalytics from '$lib/services/wallet-connect-analytics.services';
import { screensStore } from '$lib/stores/screens.store';
import { walletConnectUncheckedSigningStore } from '$lib/stores/wallet-connect-unchecked-signing.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('SettingsWalletConnectUncheckedSigning', () => {
	const now = 1_700_000_000_000;

	const toggleOf = (getByTestId: (id: string) => HTMLElement): HTMLInputElement => {
		const input = getByTestId(SETTINGS_UNCHECKED_SIGNING_TOGGLE).querySelector('input');

		if (input === null) {
			throw new Error('The switch has no input');
		}

		return input;
	};

	beforeEach(() => {
		// Only the clock: the confirmation fades in and out on real timers.
		vi.useFakeTimers({ now, toFake: ['Date'] });

		vi.spyOn(walletConnectAnalytics, 'trackWalletConnectUncheckedSigning').mockImplementation(
			() => {}
		);

		screensStore.set('1.5lg');

		walletConnectUncheckedSigningStore.disable();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the switch off, with nothing about time left', () => {
		const { getByTestId, getByText, queryByTestId } = render(SettingsWalletConnectUncheckedSigning);

		expect(getByText(en.settings.text.allow_unchecked_signing)).toBeInTheDocument();
		expect(toggleOf(getByTestId).checked).toBeFalsy();
		expect(queryByTestId(SETTINGS_UNCHECKED_SIGNING_TIME_LEFT)).not.toBeInTheDocument();
	});

	it('asks before turning on, and stays off when the user cancels', async () => {
		const { getByTestId, getByText, queryByText } = render(SettingsWalletConnectUncheckedSigning);

		await fireEvent.click(toggleOf(getByTestId));

		expect(getByText(en.settings.text.unchecked_signing_confirm_title)).toBeInTheDocument();
		expect(getByText(en.settings.text.unchecked_signing_confirm_body)).toBeInTheDocument();
		expect(getByText(en.settings.text.unchecked_signing_confirm_scam)).toBeInTheDocument();

		await fireEvent.click(getByText(en.core.text.cancel));

		await waitFor(() => {
			expect(queryByText(en.settings.text.unchecked_signing_confirm_title)).not.toBeInTheDocument();
		});

		expect(toggleOf(getByTestId).checked).toBeFalsy();
		expect(get(walletConnectUncheckedSigningStore)).toBeUndefined();
		expect(walletConnectAnalytics.trackWalletConnectUncheckedSigning).not.toHaveBeenCalled();
	});

	it('turns on only once the user ticks that they could lose their funds', async () => {
		const { getByTestId, getByText } = render(SettingsWalletConnectUncheckedSigning);

		await fireEvent.click(toggleOf(getByTestId));

		const turnOn = getByTestId(SETTINGS_UNCHECKED_SIGNING_CONFIRM_BUTTON);

		expect(turnOn).toBeDisabled();

		await fireEvent.click(getByText(en.settings.text.unchecked_signing_confirm_checkbox));

		expect(turnOn).toBeEnabled();

		await fireEvent.click(turnOn);

		expect(get(walletConnectUncheckedSigningStore)).toBe(
			now + WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS
		);
		expect(toggleOf(getByTestId).checked).toBeTruthy();
		expect(getByTestId(SETTINGS_UNCHECKED_SIGNING_TIME_LEFT)).toHaveTextContent('5 minutes left');
		expect(
			walletConnectAnalytics.trackWalletConnectUncheckedSigning
		).toHaveBeenCalledExactlyOnceWith({ modifier: 'enable' });
	});

	it('asks again, unticked, every time it is turned on', async () => {
		const { getAllByTestId, getByTestId, getByText } = render(
			SettingsWalletConnectUncheckedSigning
		);

		await fireEvent.click(toggleOf(getByTestId));
		await fireEvent.click(getByText(en.settings.text.unchecked_signing_confirm_checkbox));
		await fireEvent.click(getByText(en.core.text.cancel));

		// Reopened at once, while the first confirmation may still be fading out.
		await fireEvent.click(toggleOf(getByTestId));

		const [turnOn] = getAllByTestId(SETTINGS_UNCHECKED_SIGNING_CONFIRM_BUTTON).slice(-1);

		expect(turnOn).toBeDisabled();
	});

	it('counts the time left down and turns itself off after 5 minutes', async () => {
		vi.useFakeTimers({ now, toFake: ['Date', 'setInterval', 'clearInterval'] });

		walletConnectUncheckedSigningStore.enable();

		const { getByTestId, queryByTestId } = render(SettingsWalletConnectUncheckedSigning);

		expect(getByTestId(SETTINGS_UNCHECKED_SIGNING_TIME_LEFT)).toHaveTextContent('5 minutes left');

		// Whole minutes rounded up, so a minute and a second in it still reads four.
		vi.advanceTimersByTime(61_000);
		await tick();

		expect(getByTestId(SETTINGS_UNCHECKED_SIGNING_TIME_LEFT)).toHaveTextContent('4 minutes left');

		vi.advanceTimersByTime(180_000);
		await tick();

		expect(getByTestId(SETTINGS_UNCHECKED_SIGNING_TIME_LEFT)).toHaveTextContent('59 seconds left');

		vi.advanceTimersByTime(59_000);
		await tick();

		expect(toggleOf(getByTestId).checked).toBeFalsy();
		expect(queryByTestId(SETTINGS_UNCHECKED_SIGNING_TIME_LEFT)).not.toBeInTheDocument();
	});

	it('turns off at once, without asking', async () => {
		walletConnectUncheckedSigningStore.enable();

		const { getByTestId, queryByText } = render(SettingsWalletConnectUncheckedSigning);

		await fireEvent.click(toggleOf(getByTestId));

		expect(get(walletConnectUncheckedSigningStore)).toBeUndefined();
		expect(toggleOf(getByTestId).checked).toBeFalsy();
		expect(queryByText(en.settings.text.unchecked_signing_confirm_title)).not.toBeInTheDocument();
	});
});
