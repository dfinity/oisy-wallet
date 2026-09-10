import SupportIcpSwapBalance from '$lib/components/support/SupportIcpSwapBalance.svelte';
import { SUPPORT_ICPSWAP_WITHDRAW_BUTTON } from '$lib/constants/test-ids.constants';
import type { IcpSwapRecoverableBalance } from '$lib/services/icp-swap-recovery.services';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

const token = {
	...mockValidIcrcToken,
	symbol: 'ICP',
	decimals: 8,
	ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai'
};

const unused: IcpSwapRecoverableBalance = {
	token,
	poolToken: { address: token.ledgerCanisterId, standard: 'ICRC1' },
	kind: 'unused',
	amount: 150_000_000n
};

const testId = `${SUPPORT_ICPSWAP_WITHDRAW_BUTTON}-${token.ledgerCanisterId}`;

describe('SupportIcpSwapBalance', () => {
	it('renders the formatted amount, the symbol and the unused-balance label', () => {
		const { getByText } = render(SupportIcpSwapBalance, {
			props: { balance: unused, onWithdraw: () => undefined }
		});

		expect(getByText('1.5 ICP')).toBeInTheDocument();
		expect(getByText(en.support.text.balance_unused)).toBeInTheDocument();
	});

	it('labels a mistransferred balance differently', () => {
		const { getByText } = render(SupportIcpSwapBalance, {
			props: { balance: { ...unused, kind: 'mistransferred' }, onWithdraw: () => undefined }
		});

		expect(getByText(en.support.text.balance_mistransferred)).toBeInTheDocument();
	});

	it('calls onWithdraw when the button is clicked', async () => {
		const onWithdraw = vi.fn();

		const { getByTestId } = render(SupportIcpSwapBalance, {
			props: { balance: unused, onWithdraw }
		});

		await fireEvent.click(getByTestId(`${testId}-unused`));

		expect(onWithdraw).toHaveBeenCalledOnce();
	});

	it('disables the button while another row is withdrawing', () => {
		const { getByTestId } = render(SupportIcpSwapBalance, {
			props: { balance: unused, disabled: true, onWithdraw: () => undefined }
		});

		expect(getByTestId(`${testId}-unused`)).toBeDisabled();
	});
});
