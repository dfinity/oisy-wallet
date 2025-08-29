import AcceptAgreementsModal from '$lib/components/agreements/AcceptAgreementsModal.svelte';
import * as agreementsDerived from '$lib/derived/agreements.derived';
import * as authServices from '$lib/services/auth.services.js';
import { i18n } from '$lib/stores/i18n.store';
import type { UserAgreements } from '$lib/types/user-agreements';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('AcceptAgreementsModal', () => {
	beforeEach(() => {
		cleanup();

		vi.spyOn(agreementsDerived, 'hasOutdatedAgreements', 'get').mockReturnValue(writable(false));
		vi.spyOn(agreementsDerived, 'outdatedAgreements', 'get').mockReturnValue(
			writable({
				licenseAgreement: {
					accepted: false,
					lastAcceptedTimestamp: 0n,
					lastUpdatedTimestamp: 0n
				},
				termsOfUse: {
					accepted: false,
					lastAcceptedTimestamp: 0n,
					lastUpdatedTimestamp: 0n
				},
				privacyPolicy: {
					accepted: false,
					lastAcceptedTimestamp: 0n,
					lastUpdatedTimestamp: 0n
				}
			} as Partial<UserAgreements>)
		);

		// stub service
		vi.spyOn(authServices, 'warnSignOut').mockImplementation(() => new Promise<void>(() => {}));
	});

	it('renders title and disables accept initially', () => {
		const { getByText, getByRole } = render(AcceptAgreementsModal);

		expect(getByText(get(i18n).agreements.text.review_title)).toBeInTheDocument();
		expect(
			getByRole('button', { name: get(i18n).agreements.text.accept_and_continue })
		).toBeDisabled();
	});

	it('enables accept after all agreements toggled', async () => {
		const { getByRole, getAllByRole } = render(AcceptAgreementsModal);

		const acceptBtn = getByRole('button', {
			name: get(i18n).agreements.text.accept_and_continue
		});

		const checkboxes = getAllByRole('checkbox');
		for (const cb of checkboxes) {
			await fireEvent.click(cb);
		}

		expect(acceptBtn).not.toBeDisabled();
	});

	it('clicking reject calls warnSignOut', async () => {
		const { getByRole } = render(AcceptAgreementsModal);

		await fireEvent.click(getByRole('button', { name: get(i18n).agreements.text.reject }));
		expect(authServices.warnSignOut).toHaveBeenCalledWith(get(i18n).agreements.text.reject_warning);
	});
});
