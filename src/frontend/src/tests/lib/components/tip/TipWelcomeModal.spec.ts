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

	it('answers who owns the money before what can be done with it', () => {
		// The order is the point. Somebody handed money by a stranger's QR code asks
		// whose it is first; the multi-chain pitch is the reason to come back, not
		// the reason to trust the screen in front of them.
		const { getByText } = render(TipWelcomeModal);
		const { welcome } = get(i18n).tip;

		const ownership = getByText(welcome.point_yours_title);
		const chains = getByText(welcome.point_chains_title);

		expect(
			ownership.compareDocumentPosition(chains) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('says where the wallet lives, which is the thing a newcomer cannot guess', () => {
		const { getByText } = render(TipWelcomeModal);
		const { welcome } = get(i18n).tip;

		expect(getByText(welcome.heading)).toBeInTheDocument();
		expect(getByText(welcome.body)).toBeInTheDocument();
		// Asserted on the copy itself: the address is the one fact that gets them
		// back in, and an edit that drops it would leave the screen looking fine.
		expect(welcome.body).toContain('oisy.com');
	});

	it('shows all three points', () => {
		const { getByText } = render(TipWelcomeModal);
		const { welcome } = get(i18n).tip;

		for (const text of [
			welcome.point_yours_text,
			welcome.point_use_text,
			welcome.point_chains_text
		]) {
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
