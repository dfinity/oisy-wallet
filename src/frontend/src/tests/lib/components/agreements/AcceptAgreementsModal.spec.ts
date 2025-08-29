import AcceptAgreementsModal from '$lib/components/agreements/AcceptAgreementsModal.svelte';
import * as agreementsDerived from '$lib/derived/user-agreements.derived';
import * as authServices from '$lib/services/auth.services.js';
import { i18n } from '$lib/stores/i18n.store';
import type { AgreementData, UserAgreements } from '$lib/types/user-agreements';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('AcceptAgreementsModal', () => {
	beforeEach(() => {
		cleanup();

		const nullishAgreement: AgreementData = {
			accepted: undefined,
			lastAcceptedTimestamp: undefined,
			lastUpdatedTimestamp: undefined
		};

		const expectedNullishAgreements: UserAgreements = {
			licenseAgreement: nullishAgreement,
			privacyPolicy: nullishAgreement,
			termsOfUse: nullishAgreement
		};

		vi.spyOn(agreementsDerived, 'hasOutdatedAgreements', 'get').mockReturnValue(writable(false));
		vi.spyOn(agreementsDerived, 'outdatedAgreements', 'get').mockReturnValue(
			writable(expectedNullishAgreements)
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
