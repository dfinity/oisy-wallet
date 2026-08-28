import TipWelcomeModal from '$lib/components/tip/TipWelcomeModal.svelte';
import { TIP_WELCOME_CTA_BUTTON } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TipWelcomeModal', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		modalStore.close();
	});

	it('answers who owns the money before whether it will still be there', () => {
		// The order is the point. Somebody handed money by a stranger's QR code asks
		// whose it is first; that it keeps is the reason to come back, not the reason
		// to trust the screen in front of them.
		const { getByText } = render(TipWelcomeModal);
		const { welcome } = get(i18n).tip;

		const access = getByText(welcome.point_access_title);
		const stays = getByText(welcome.point_stay_title);

		expect(access.compareDocumentPosition(stays) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('leads with the address, which is the one thing a newcomer cannot guess', () => {
		const { getByText } = render(TipWelcomeModal);
		const { welcome } = get(i18n).tip;

		expect(getByText(welcome.heading)).toBeInTheDocument();
		expect(getByText(welcome.body)).toBeInTheDocument();
		// Asserted on the copy itself: the address is what gets them back in, and an
		// edit that dropped it would leave the screen looking perfectly fine.
		expect(welcome.heading).toContain('oisy.com');
	});

	it('shows both points', () => {
		const { getByText } = render(TipWelcomeModal);
		const { welcome } = get(i18n).tip;

		for (const text of [welcome.point_access_text, welcome.point_stay_text]) {
			expect(getByText(text)).toBeInTheDocument();
		}
	});

	it('closes on the only action it offers', () => {
		// The wallet is already behind the modal with the tip in it, so there is
		// nothing to navigate to and nothing to confirm.
		modalStore.openTipWelcome(Symbol());

		const { container } = render(TipWelcomeModal);

		container
			.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_WELCOME_CTA_BUTTON}]`)
			?.click();

		expect(get(modalStore)).toBeNull();
	});
});
