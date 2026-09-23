import HelpIcpSwapBalance from '$lib/components/help/HelpIcpSwapBalance.svelte';
import { HELP_ICPSWAP_WITHDRAW_BUTTON } from '$lib/constants/test-ids.constants';
import type { IcpSwapRecoverableBalance } from '$lib/services/icp-swap-recovery.services';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
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
	amount: 150_000_000n
};

const testId = `${HELP_ICPSWAP_WITHDRAW_BUTTON}-${token.ledgerCanisterId}`;

describe('HelpIcpSwapBalance', () => {
	beforeEach(() => {
		setPrivacyMode({ enabled: false });
	});

	it('renders the formatted amount, the symbol and the unused-balance label', () => {
		const { getByText } = render(HelpIcpSwapBalance, {
			props: { balance: unused, onWithdraw: () => undefined }
		});

		expect(getByText('1.5')).toBeInTheDocument();
		expect(getByText(token.symbol)).toBeInTheDocument();
		expect(getByText(en.help.text.balance_unused)).toBeInTheDocument();
	});

	it('masks the amount in privacy mode, but keeps the token identifiable', () => {
		setPrivacyMode({ enabled: true });

		const { getByText, queryByText } = render(HelpIcpSwapBalance, {
			props: { balance: unused, onWithdraw: () => undefined }
		});

		expect(queryByText('1.5')).toBeNull();
		expect(getByText(token.symbol)).toBeInTheDocument();
	});

	it("shows the caller's label in place of the bare symbol, including in the button label", () => {
		const label = 'ICP (ryjl3-t...aba-cai)';

		const { getByTestId, getByText } = render(HelpIcpSwapBalance, {
			props: { balance: unused, label, onWithdraw: () => undefined }
		});

		expect(getByText(label)).toBeInTheDocument();
		expect(getByTestId(testId)).toHaveAttribute(
			'aria-label',
			replacePlaceholders(en.help.alt.withdraw, { $symbol: label })
		);
	});

	it('scopes the test id to the pool, so the same token from two pools stays distinct', () => {
		const { getByTestId } = render(HelpIcpSwapBalance, {
			props: { balance: unused, testIdSuffix: 'pool-a', onWithdraw: () => undefined }
		});

		expect(
			getByTestId(`${HELP_ICPSWAP_WITHDRAW_BUTTON}-pool-a-${token.ledgerCanisterId}`)
		).toBeInTheDocument();
	});

	it('calls onWithdraw when the button is clicked', async () => {
		const onWithdraw = vi.fn();

		const { getByTestId } = render(HelpIcpSwapBalance, {
			props: { balance: unused, onWithdraw }
		});

		await fireEvent.click(getByTestId(testId));

		expect(onWithdraw).toHaveBeenCalledOnce();
	});

	it('disables the button while another row is withdrawing', () => {
		const { getByTestId } = render(HelpIcpSwapBalance, {
			props: { balance: unused, disabled: true, onWithdraw: () => undefined }
		});

		expect(getByTestId(testId)).toBeDisabled();
	});
});
