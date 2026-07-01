import WithdrawModal from '$lib/components/trading/WithdrawModal.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { OisyTradeWithdrawToken } from '$lib/types/oisy-trade';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('WithdrawModal', () => {
	const withdrawToken: OisyTradeWithdrawToken = {
		token: mockValidIcToken,
		free: 5_000_000n,
		reserved: ZERO
	};

	it('opens on the withdraw form step with the title and amount label', () => {
		const { container } = render(WithdrawModal, {
			props: { withdrawToken }
		});

		expect(container).toHaveTextContent(en.trading.withdraw.title);
		expect(container).toHaveTextContent(en.trading.withdraw.amount_label);
	});

	it('shows the reserved note when the token has reserved funds', () => {
		const { container } = render(WithdrawModal, {
			props: {
				withdrawToken: { ...withdrawToken, reserved: 250_000n }
			}
		});

		expect(container).toHaveTextContent('reserved · locked by open orders');
	});
});
