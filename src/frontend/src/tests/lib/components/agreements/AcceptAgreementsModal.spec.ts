import AcceptAgreementsModal from '$lib/components/agreements/AcceptAgreementsModal.svelte';
import * as agreementsDerived from '$lib/derived/user-agreements.derived';
import * as authServices from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import type { AgreementData, UserAgreements } from '$lib/types/user-agreements';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { get, writable, type Writable } from 'svelte/store';

describe('AcceptAgreementsModal – extended', () => {
	let hasOutdatedStore: Writable<boolean>;
	type PartialAgreements = Partial<UserAgreements>;
	let outdatedStore: Writable<PartialAgreements>;

	beforeEach(() => {
		cleanup();

		hasOutdatedStore = writable(false);
		vi.spyOn(agreementsDerived, 'hasOutdatedAgreements', 'get').mockReturnValue(hasOutdatedStore);

		const nullish: AgreementData = {
			accepted: undefined,
			lastAcceptedTimestamp: undefined,
			lastUpdatedTimestamp: undefined
		};

		// Start with *all three* being outdated (so all render) unless a test overrides
		outdatedStore = writable<PartialAgreements>({
			licenseAgreement: nullish,
			privacyPolicy: nullish,
			termsOfUse: nullish
		});

		vi.spyOn(agreementsDerived, 'outdatedAgreements', 'get').mockReturnValue(outdatedStore);

		// Warn sign out stub
		vi.spyOn(authServices, 'warnSignOut').mockImplementation(() => new Promise<void>(() => {}));
	});

	it('shows updated title when hasOutdatedAgreements = true', () => {
		hasOutdatedStore.set(true);

		const { getByRole } = render(AcceptAgreementsModal);

		expect(
			getByRole('heading', { level: 4, name: get(i18n).agreements.text.review_updated_title })
		).toBeInTheDocument();
	});

	it('renders only a single checkbox when only one agreement is outdated', async () => {
		const nullish: AgreementData = {
			accepted: undefined,
			lastAcceptedTimestamp: undefined,
			lastUpdatedTimestamp: undefined
		};

		// Only termsOfUse is outdated; others omitted from the store
		outdatedStore.set({
			termsOfUse: nullish
		});

		const { getAllByRole, queryByTestId, getByRole } = render(AcceptAgreementsModal);

		// Only one checkbox is present
		const checkboxes = getAllByRole('checkbox');

		expect(checkboxes).toHaveLength(1);

		// The other rows should not exist (test IDs from AcceptAgreementsCheckbox/inputs)
		expect(queryByTestId('privacyPolicyCheckbox')).toBeNull();
		expect(queryByTestId('licenseAgreementCheckbox')).toBeNull();

		// Accept is disabled until that one is toggled
		const acceptBtn = getByRole('button', { name: get(i18n).agreements.text.accept_and_continue });

		expect(acceptBtn).toBeDisabled();

		await fireEvent.click(checkboxes[0]);

		expect(acceptBtn).not.toBeDisabled();
	});

	it('renders exactly two checkboxes when two agreements are outdated', async () => {
		const nullish: AgreementData = {
			accepted: undefined,
			lastAcceptedTimestamp: undefined,
			lastUpdatedTimestamp: undefined
		};

		// Only termsOfUse and privacyPolicy outdated
		outdatedStore.set({
			termsOfUse: nullish,
			privacyPolicy: nullish
		});

		const { getAllByRole, queryByTestId, getByRole } = render(AcceptAgreementsModal);

		const checkboxes = getAllByRole('checkbox');

		expect(checkboxes).toHaveLength(2);

		// licenseAgreement row not rendered
		expect(queryByTestId('licenseAgreementCheckbox')).toBeNull();

		const acceptBtn = getByRole('button', { name: get(i18n).agreements.text.accept_and_continue });

		expect(acceptBtn).toBeDisabled();

		// Toggle both -> enabled
		await fireEvent.click(checkboxes[0]);

		expect(acceptBtn).toBeDisabled();

		await fireEvent.click(checkboxes[1]);

		expect(acceptBtn).not.toBeDisabled();
	});

	it('uses updated checkbox label text when hasOutdatedAgreements = true', () => {
		hasOutdatedStore.set(true);

		const { getAllByText } = render(AcceptAgreementsModal);

		const labels = getAllByText(get(i18n).agreements.text.i_have_accepted_updated);

		expect(labels).toHaveLength(3); // all three checkboxes show updated text
	});

	it('clicking Reject calls warnSignOut with the i18n message', async () => {
		const { getByRole } = render(AcceptAgreementsModal);

		await fireEvent.click(getByRole('button', { name: get(i18n).agreements.text.reject }));

		expect(authServices.warnSignOut).toHaveBeenCalledWith(get(i18n).agreements.text.reject_warning);
	});

	it('accept button is disabled initially with all three rendered', () => {
		const { getByRole } = render(AcceptAgreementsModal);

		expect(
			getByRole('button', { name: get(i18n).agreements.text.accept_and_continue })
		).toBeDisabled();
	});

	it('accept button enables after all three are toggled when all three are rendered', async () => {
		const { getByRole, getAllByRole } = render(AcceptAgreementsModal);

		const acceptBtn = getByRole('button', { name: get(i18n).agreements.text.accept_and_continue });
		const checkboxes = getAllByRole('checkbox');

		for (const cb of checkboxes) {
			await fireEvent.click(cb);
		}

		expect(acceptBtn).not.toBeDisabled();
	});
});
