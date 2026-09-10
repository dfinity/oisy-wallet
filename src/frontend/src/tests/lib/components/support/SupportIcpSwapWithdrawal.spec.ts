import * as icrcDerived from '$icp/derived/icrc.derived';
import SupportIcpSwapWithdrawal from '$lib/components/support/SupportIcpSwapWithdrawal.svelte';
import {
	SUPPORT_ICPSWAP_CARD,
	SUPPORT_ICPSWAP_EMPTY,
	SUPPORT_ICPSWAP_ERROR,
	SUPPORT_ICPSWAP_TOKEN_A,
	SUPPORT_ICPSWAP_TOKEN_B,
	SUPPORT_ICPSWAP_WITHDRAW_BUTTON
} from '$lib/constants/test-ids.constants';
import {
	IcpSwapPoolNotFoundError,
	loadIcpSwapRecoverableBalances,
	withdrawIcpSwapBalance,
	type IcpSwapRecoverableBalance
} from '$lib/services/icp-swap-recovery.services';
import { trackSupport } from '$lib/services/support-analytics.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$lib/services/icp-swap-recovery.services', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();

	return {
		...actual,
		loadIcpSwapRecoverableBalances: vi.fn(),
		withdrawIcpSwapBalance: vi.fn()
	};
});

vi.mock('$lib/services/support-analytics.services', () => ({
	trackSupport: vi.fn()
}));

const icp = {
	...mockValidIcrcToken,
	symbol: 'ICP',
	decimals: 8,
	ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai'
};

const usdc = {
	...mockValidIcrcToken,
	symbol: 'ckUSDC',
	decimals: 6,
	ledgerCanisterId: 'qaa6y-5yaaa-aaaaa-aaafa-cai'
};

const poolCanisterId = 'aaaaa-aa';

const unusedIcp: IcpSwapRecoverableBalance = {
	token: icp,
	poolToken: { address: icp.ledgerCanisterId, standard: 'ICRC1' },
	kind: 'unused',
	amount: 150_000_000n
};

const mistransferredUsdc: IcpSwapRecoverableBalance = {
	token: usdc,
	poolToken: { address: usdc.ledgerCanisterId, standard: 'ICRC2' },
	kind: 'mistransferred',
	amount: 2_000_000n
};

const withdrawTestId = ({ token, kind }: IcpSwapRecoverableBalance) =>
	`${SUPPORT_ICPSWAP_WITHDRAW_BUTTON}-${token.ledgerCanisterId}-${kind}`;

// Picks both legs of the pair, which is what triggers the pool lookup.
const selectPair = async (getByTestId: (id: string) => HTMLElement) => {
	await fireEvent.click(getByTestId(SUPPORT_ICPSWAP_TOKEN_A));
	await fireEvent.click(getByTestId(`${SUPPORT_ICPSWAP_TOKEN_A}-option-${icp.ledgerCanisterId}`));

	await fireEvent.click(getByTestId(SUPPORT_ICPSWAP_TOKEN_B));
	await fireEvent.click(getByTestId(`${SUPPORT_ICPSWAP_TOKEN_B}-option-${usdc.ledgerCanisterId}`));
};

describe('SupportIcpSwapWithdrawal', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		vi.spyOn(icrcDerived, 'enabledIcrcTokens', 'get').mockImplementation(() =>
			readable([icp, usdc])
		);
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			balances: []
		});
	});

	it('renders the card with its title and explanation before anything is picked', () => {
		const { getByTestId, getByText, queryByTestId } = render(SupportIcpSwapWithdrawal);

		expect(getByTestId(SUPPORT_ICPSWAP_CARD)).toBeInTheDocument();
		expect(getByText(en.support.text.icpswap_title)).toBeInTheDocument();

		// Nothing is looked up until both tokens are chosen.
		expect(queryByTestId(SUPPORT_ICPSWAP_EMPTY)).toBeNull();
		expect(loadIcpSwapRecoverableBalances).not.toHaveBeenCalled();
	});

	it('excludes the token already picked on the other side', async () => {
		const { getByTestId, queryByTestId } = render(SupportIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(SUPPORT_ICPSWAP_TOKEN_A));
		await fireEvent.click(getByTestId(`${SUPPORT_ICPSWAP_TOKEN_A}-option-${icp.ledgerCanisterId}`));

		await fireEvent.click(getByTestId(SUPPORT_ICPSWAP_TOKEN_B));

		expect(queryByTestId(`${SUPPORT_ICPSWAP_TOKEN_B}-option-${icp.ledgerCanisterId}`)).toBeNull();
		expect(
			getByTestId(`${SUPPORT_ICPSWAP_TOKEN_B}-option-${usdc.ledgerCanisterId}`)
		).toBeInTheDocument();
	});

	it('says so explicitly when the pool holds nothing', async () => {
		const { getByTestId } = render(SupportIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() => expect(getByTestId(SUPPORT_ICPSWAP_EMPTY)).toBeInTheDocument());

		expect(getByTestId(SUPPORT_ICPSWAP_EMPTY)).toHaveTextContent(
			en.support.text.nothing_to_withdraw
		);
	});

	it('shows the pool-not-found message rather than an empty list', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockRejectedValue(new IcpSwapPoolNotFoundError());

		const { getByTestId, queryByTestId } = render(SupportIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() => expect(getByTestId(SUPPORT_ICPSWAP_ERROR)).toBeInTheDocument());

		expect(getByTestId(SUPPORT_ICPSWAP_ERROR)).toHaveTextContent(en.support.error.pool_not_found);
		expect(queryByTestId(SUPPORT_ICPSWAP_EMPTY)).toBeNull();
	});

	it('distinguishes a read failure from a missing pool', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockRejectedValue(new Error('boom'));

		const { getByTestId } = render(SupportIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() =>
			expect(getByTestId(SUPPORT_ICPSWAP_ERROR)).toHaveTextContent(en.support.error.load_failed)
		);
	});

	it('lists every recoverable balance with its own withdraw button', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			balances: [unusedIcp, mistransferredUsdc]
		});

		const { getByTestId } = render(SupportIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		expect(getByTestId(withdrawTestId(mistransferredUsdc))).toBeInTheDocument();
	});

	it('withdraws only the row whose button was pressed, then reloads', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			balances: [unusedIcp, mistransferredUsdc]
		});
		vi.mocked(withdrawIcpSwapBalance).mockResolvedValue(150_000_000n);

		const { getByTestId } = render(SupportIcpSwapWithdrawal);

		await selectPair(getByTestId);
		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		expect(loadIcpSwapRecoverableBalances).toHaveBeenCalledOnce();

		await fireEvent.click(getByTestId(withdrawTestId(unusedIcp)));

		await waitFor(() =>
			expect(withdrawIcpSwapBalance).toHaveBeenCalledExactlyOnceWith({
				identity: expect.anything(),
				poolCanisterId,
				balance: unusedIcp
			})
		);

		// The list is re-read so a withdrawn row disappears.
		await waitFor(() => expect(loadIcpSwapRecoverableBalances).toHaveBeenCalledTimes(2));
	});

	it('keeps the row in place when the withdrawal fails', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			balances: [unusedIcp]
		});
		vi.mocked(withdrawIcpSwapBalance).mockRejectedValue(new Error('pool unavailable'));

		const { getByTestId } = render(SupportIcpSwapWithdrawal);

		await selectPair(getByTestId);
		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		await fireEvent.click(getByTestId(withdrawTestId(unusedIcp)));

		await waitFor(() => expect(withdrawIcpSwapBalance).toHaveBeenCalledOnce());

		// Still listed, and no reload was attempted after the failure.
		expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument();
		expect(loadIcpSwapRecoverableBalances).toHaveBeenCalledOnce();
	});

	it('tracks the resolved pool with both symbols and the withdrawable count', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			balances: [unusedIcp, mistransferredUsdc]
		});

		const { getByTestId } = render(SupportIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() =>
			expect(trackSupport).toHaveBeenCalledWith({
				action: 'select_pool',
				resultStatus: 'success',
				subcontext: 'icpswap_withdrawal',
				token: 'ICP',
				token2: 'ckUSDC',
				balancesFound: 2
			})
		);
	});

	it('tracks a failed pool lookup', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockRejectedValue(new IcpSwapPoolNotFoundError());

		const { getByTestId } = render(SupportIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() =>
			expect(trackSupport).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'select_pool', resultStatus: 'error' })
			)
		);
	});

	it('tracks a withdrawal from executing through to success, without an amount', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			balances: [unusedIcp]
		});
		vi.mocked(withdrawIcpSwapBalance).mockResolvedValue(150_000_000n);

		const { getByTestId } = render(SupportIcpSwapWithdrawal);

		await selectPair(getByTestId);
		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		await fireEvent.click(getByTestId(withdrawTestId(unusedIcp)));

		const expected = {
			subcontext: 'icpswap_withdrawal',
			token: 'ICP',
			tokenStandard: icp.standard.code,
			balanceKind: 'unused'
		};

		await waitFor(() => {
			expect(trackSupport).toHaveBeenCalledWith({
				action: 'withdraw',
				resultStatus: 'executing',
				...expected
			});
			expect(trackSupport).toHaveBeenCalledWith({
				action: 'withdraw',
				resultStatus: 'success',
				...expected
			});
		});

		const withdrawCalls = vi
			.mocked(trackSupport)
			.mock.calls.filter(([{ action }]) => action === 'withdraw');

		withdrawCalls.forEach(([params]) => {
			expect(params).not.toHaveProperty('amount');
			expect(params).not.toHaveProperty('usdValue');
		});
	});
});
