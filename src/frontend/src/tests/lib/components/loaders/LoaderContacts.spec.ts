import LoaderContacts from '$lib/components/loaders/LoaderContacts.svelte';
import * as manageContactsService from '$lib/services/manage-contacts.service';
import { contactsStore } from '$lib/stores/contacts.store';
import * as consoleUtils from '$lib/utils/console.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('LoaderContacts', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();

		contactsStore.reset();
	});

	it('loads the contacts of the signed-in user on mount', async () => {
		mockAuthStore();

		const spy = vi.spyOn(manageContactsService, 'loadContacts').mockResolvedValue();

		render(LoaderContacts);

		await waitFor(() => {
			expect(spy).toHaveBeenCalledExactlyOnceWith(mockIdentity);
		});
	});

	it('does not load anything without a signed-in user', async () => {
		mockAuthStore(null);

		const spy = vi.spyOn(manageContactsService, 'loadContacts').mockResolvedValue();

		render(LoaderContacts);

		await tick();

		expect(spy).not.toHaveBeenCalled();
	});

	it('logs a load that rejects instead of leaving it unhandled', async () => {
		mockAuthStore();

		const mockError = new Error('Test error');

		vi.spyOn(manageContactsService, 'loadContacts').mockRejectedValue(mockError);

		const spyConsoleError = vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => {});

		render(LoaderContacts);

		await waitFor(() => {
			expect(spyConsoleError).toHaveBeenCalledExactlyOnceWith(mockError);
		});
	});
});
