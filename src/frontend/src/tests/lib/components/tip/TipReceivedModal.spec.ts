import TipReceivedModal from '$lib/components/tip/TipReceivedModal.svelte';
import { TIP_RECEIVED_BUTTON } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import type { TipReceipt } from '$lib/types/tip';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TipReceivedModal', () => {
	const receipt: TipReceipt = {
		amountLabel: '135.00 USDC',
		symbol: 'USDC',
		logo: 'data:image/svg+xml;base64,AAA',
		message: 'thanks for the help'
	};

	beforeEach(() => {
		modalStore.close();
	});

	it('leads with the amount that landed', () => {
		const { getByText } = render(TipReceivedModal, { props: { receipt } });

		expect(getByText('135.00 USDC Received!')).toBeInTheDocument();
		expect(getByText(get(i18n).tip.text.received_description)).toBeInTheDocument();
	});

	it('falls back to the plain title rather than quoting a number it cannot format', () => {
		// The claim page leaves `amountLabel` unset when the ledger never said how
		// many decimals the token has. A confirmation that invents a figure for the
		// amount someone was just paid is worse than one that omits it.
		const { getByText } = render(TipReceivedModal, {
			props: { receipt: { ...receipt, amountLabel: undefined } }
		});

		expect(getByText(get(i18n).tip.text.claimed_title)).toBeInTheDocument();
	});

	it('shows the sender message, which no earlier screen does', () => {
		const { getByText } = render(TipReceivedModal, { props: { receipt } });

		expect(getByText(`“${receipt.message}”`)).toBeInTheDocument();
	});

	it('says the payout is done, not reserved', () => {
		// The status word travelled with the tip through Reserved for its whole
		// life. This is the one screen where it has actually completed.
		const { getByText, queryByText } = render(TipReceivedModal, { props: { receipt } });

		expect(getByText(get(i18n).tip.text.status_completed)).toBeInTheDocument();
		expect(queryByText('Reserved')).not.toBeInTheDocument();
	});

	it('closes on acknowledgement, since the reader is already in the wallet', async () => {
		modalStore.openTipReceived({ id: Symbol(), data: receipt });

		const { container } = render(TipReceivedModal, { props: { receipt } });

		container.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_RECEIVED_BUTTON}]`)?.click();

		await waitFor(() => expect(get(modalStore)).toBeNull());
	});
});
