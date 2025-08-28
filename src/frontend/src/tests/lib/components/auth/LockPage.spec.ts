import LockPage from '$lib/components/auth/LockPage.svelte';
import * as authServices from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { authLocked } from '$lib/stores/locked.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LockPage', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.spyOn(authLocked, 'unlock');

		// Mock the imports
		vi.mock('$lib/services/auth.services', () => ({
			signIn: vi.fn(),
			signOut: vi.fn()
		}));
	});

	it('should render with correct structure', () => {
		const { getByText, getByRole } = render(LockPage);

		// Check logo is present - using the actual aria-label from your component
		expect(getByRole('link', { name: 'Go to the OISY Wallet home page' })).toBeInTheDocument();

		// Check titles
		expect(getByText(get(i18n).lock.text.title_part_1)).toBeInTheDocument();
		expect(getByText(get(i18n).lock.text.title_part_2)).toBeInTheDocument();

		// Check buttons
		expect(getByText(get(i18n).lock.text.unlock)).toBeInTheDocument();
		expect(getByText(get(i18n).lock.text.logout)).toBeInTheDocument();

		// Check footer text
		expect(getByText(get(i18n).lock.text.logout_clear_cash_message)).toBeInTheDocument();
		expect(getByText(get(i18n).lock.text.learn_more)).toBeInTheDocument();
	});

	it('should call signIn and unlock on unlock button click', async () => {
		const signInMock = vi.spyOn(authServices, 'signIn').mockResolvedValue({ success: 'ok' });

		const { getByText } = render(LockPage);
		const unlockButton = getByText(get(i18n).lock.text.unlock);

		await fireEvent.click(unlockButton);

		expect(signInMock).toHaveBeenCalledWith({ i18n: en });
		expect(authLocked.unlock).toHaveBeenCalledWith({
			source: 'login from lock page'
		});
	});
});
