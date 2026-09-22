import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as icrcDerived from '$icp/derived/icrc.derived';
import HelpIcpSwapWithdrawal from '$lib/components/help/HelpIcpSwapWithdrawal.svelte';
import {
	HELP_ICPSWAP_CARD,
	HELP_ICPSWAP_EMPTY,
	HELP_ICPSWAP_ERROR,
	HELP_ICPSWAP_NO_TOKENS,
	HELP_ICPSWAP_POOL_GROUP,
	HELP_ICPSWAP_RESULTS_SUMMARY,
	HELP_ICPSWAP_SCAN_BUTTON,
	HELP_ICPSWAP_SCAN_SUMMARY,
	HELP_ICPSWAP_TOKEN_A,
	HELP_ICPSWAP_TOKEN_B,
	HELP_ICPSWAP_WITHDRAW_BUTTON
} from '$lib/constants/test-ids.constants';
import { PLAUSIBLE_EVENT_HELP_ERROR_TYPES } from '$lib/enums/plausible';
import { trackHelp } from '$lib/services/help-analytics.services';
import {
	IcpSwapPoolNotFoundError,
	loadIcpSwapRecoverableBalances,
	reloadIcpSwapPoolBalances,
	scanIcpSwapPools,
	withdrawIcpSwapBalance,
	type IcpSwapPoolBalances,
	type IcpSwapRecoverableBalance
} from '$lib/services/icp-swap-recovery.services';
import * as toastsStore from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
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
		reloadIcpSwapPoolBalances: vi.fn(),
		scanIcpSwapPools: vi.fn(),
		withdrawIcpSwapBalance: vi.fn()
	};
});

// Only the tracker is faked: `toHelpErrorType` stays real, so the assertions below see the
// category the component would actually report.
vi.mock('$lib/services/help-analytics.services', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	trackHelp: vi.fn()
}));

// ICP is deliberately NOT in the mocked enabledIcrcTokens below: production does not put it
// there either, since it is not an ICRC token. The component must source it from ICP_TOKEN.
const icp = {
	...mockValidIcrcToken,
	symbol: ICP_TOKEN.symbol,
	decimals: ICP_TOKEN.decimals,
	ledgerCanisterId: ICP_TOKEN.ledgerCanisterId
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
	amount: 150_000_000n
};

const unusedUsdc: IcpSwapRecoverableBalance = {
	token: usdc,
	poolToken: { address: usdc.ledgerCanisterId, standard: 'ICRC2' },
	amount: 2_000_000n
};

const withdrawTestId = ({ token }: IcpSwapRecoverableBalance) =>
	`${HELP_ICPSWAP_WITHDRAW_BUTTON}-${poolCanisterId}-${token.ledgerCanisterId}`;

// Picks both legs of the pair, which is what triggers the pool lookup.
const selectPair = async (getByTestId: (id: string) => HTMLElement) => {
	await fireEvent.click(getByTestId(HELP_ICPSWAP_TOKEN_A));
	await fireEvent.click(getByTestId(`${HELP_ICPSWAP_TOKEN_A}-option-${icp.ledgerCanisterId}`));

	await fireEvent.click(getByTestId(HELP_ICPSWAP_TOKEN_B));
	await fireEvent.click(getByTestId(`${HELP_ICPSWAP_TOKEN_B}-option-${usdc.ledgerCanisterId}`));
};

describe('HelpIcpSwapWithdrawal', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		setPrivacyMode({ enabled: false });
		mockAuthStore();
		vi.spyOn(icrcDerived, 'enabledIcrcTokens', 'get').mockImplementation(() => readable([usdc]));
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: []
		});
		vi.mocked(scanIcpSwapPools).mockResolvedValue({
			poolsScanned: 0,
			pools: [],
			unreadablePools: 0
		});
	});

	it('renders the card with its title and explanation before anything is picked', () => {
		const { getByTestId, getByText, queryByTestId } = render(HelpIcpSwapWithdrawal);

		expect(getByTestId(HELP_ICPSWAP_CARD)).toBeInTheDocument();
		expect(getByText(en.help.text.icpswap_title)).toBeInTheDocument();

		// Nothing is looked up until both tokens are chosen.
		expect(queryByTestId(HELP_ICPSWAP_EMPTY)).toBeNull();
		expect(loadIcpSwapRecoverableBalances).not.toHaveBeenCalled();
	});

	it('ignores a superseded lookup that settles after a newer one', async () => {
		// Neither selector is disabled while a lookup runs, so the slower first request must not
		// overwrite the newer one's results.
		const stale: IcpSwapPoolBalances = {
			poolCanisterId: 'stale-pool',
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp]
		};
		const fresh: IcpSwapPoolBalances = {
			poolCanisterId: 'fresh-pool',
			poolTokens: [unusedUsdc.poolToken, unusedIcp.poolToken],
			pair: ['ckUSDC', 'ICP'],
			balances: [unusedUsdc]
		};

		const { promise: stalePending, resolve: releaseStale } =
			Promise.withResolvers<IcpSwapPoolBalances>();

		vi.mocked(loadIcpSwapRecoverableBalances)
			.mockReturnValueOnce(stalePending)
			.mockResolvedValueOnce(fresh);

		const { getByTestId, queryByTestId } = render(HelpIcpSwapWithdrawal);

		// First pair: the lookup hangs.
		await selectPair(getByTestId);

		// Second pair: re-picking token A starts a newer lookup that resolves immediately.
		await fireEvent.click(getByTestId(HELP_ICPSWAP_TOKEN_A));
		await fireEvent.click(getByTestId(`${HELP_ICPSWAP_TOKEN_A}-option-${icp.ledgerCanisterId}`));

		await waitFor(() =>
			expect(getByTestId(`${HELP_ICPSWAP_POOL_GROUP}-fresh-pool`)).toBeInTheDocument()
		);

		// Now let the first one finish last.
		releaseStale(stale);
		await waitFor(() => expect(loadIcpSwapRecoverableBalances).toHaveBeenCalledTimes(2));

		expect(queryByTestId(`${HELP_ICPSWAP_POOL_GROUP}-stale-pool`)).toBeNull();
		expect(getByTestId(`${HELP_ICPSWAP_POOL_GROUP}-fresh-pool`)).toBeInTheDocument();
	});

	it('does not spin the scan button for a manual lookup', async () => {
		// `busy` cannot tell the two entry points apart, so the scan button used to animate while a
		// pair was being looked up.
		const { promise: pending, resolve: release } = Promise.withResolvers<IcpSwapPoolBalances>();
		vi.mocked(loadIcpSwapRecoverableBalances).mockReturnValue(pending);

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);

		const scanButton = getByTestId(HELP_ICPSWAP_SCAN_BUTTON);

		// Disabled, because the race guard is shared - but not spinning.
		expect(scanButton).toBeDisabled();
		expect(scanButton.querySelector('svg')).toBeNull();

		release({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: []
		});
	});

	it('explains an empty candidate set where the user can actually see it', async () => {
		// No enabled ICRC tokens: the candidate set is ICP alone, so picking it on one side leaves
		// the other with nothing. The dropdown is disabled and cannot open, so the explanation has
		// to be in the card.
		vi.spyOn(icrcDerived, 'enabledIcrcTokens', 'get').mockImplementation(() => readable([]));

		const { getByTestId, queryByTestId } = render(HelpIcpSwapWithdrawal);

		expect(queryByTestId(HELP_ICPSWAP_NO_TOKENS)).toBeNull();

		await fireEvent.click(getByTestId(HELP_ICPSWAP_TOKEN_A));
		await fireEvent.click(
			getByTestId(`${HELP_ICPSWAP_TOKEN_A}-option-${ICP_TOKEN.ledgerCanisterId}`)
		);

		expect(getByTestId(HELP_ICPSWAP_NO_TOKENS)).toHaveTextContent(en.help.text.no_tokens);
	});

	it('does not scan until the button is pressed', () => {
		render(HelpIcpSwapWithdrawal);

		expect(scanIcpSwapPools).not.toHaveBeenCalled();
	});

	it('scans on press and reports how many pools it checked', async () => {
		vi.mocked(scanIcpSwapPools).mockResolvedValue({
			poolsScanned: 9,
			pools: [],
			unreadablePools: 0
		});

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(HELP_ICPSWAP_SCAN_BUTTON));

		await waitFor(() => expect(getByTestId(HELP_ICPSWAP_EMPTY)).toBeInTheDocument());

		expect(getByTestId(HELP_ICPSWAP_EMPTY)).toHaveTextContent('9');
	});

	it('groups scan results per pool and withdraws against the right one', async () => {
		const otherPoolId = 'r7inp-6aaaa-aaaaa-aaabq-cai';

		vi.mocked(scanIcpSwapPools).mockResolvedValue({
			poolsScanned: 2,
			unreadablePools: 0,
			pools: [
				{
					poolCanisterId,
					poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
					pair: ['ICP', 'ckUSDC'],
					balances: [unusedIcp]
				},
				{
					poolCanisterId: otherPoolId,
					poolTokens: [unusedUsdc.poolToken, unusedIcp.poolToken],
					pair: ['ckUSDC', 'ICP'],
					balances: [unusedUsdc]
				}
			]
		});
		vi.mocked(withdrawIcpSwapBalance).mockResolvedValue(2_000_000n);

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(HELP_ICPSWAP_SCAN_BUTTON));

		await waitFor(() =>
			expect(getByTestId(`${HELP_ICPSWAP_POOL_GROUP}-${poolCanisterId}`)).toBeInTheDocument()
		);

		expect(getByTestId(`${HELP_ICPSWAP_POOL_GROUP}-${otherPoolId}`)).toBeInTheDocument();

		await fireEvent.click(
			getByTestId(`${HELP_ICPSWAP_WITHDRAW_BUTTON}-${otherPoolId}-${usdc.ledgerCanisterId}`)
		);

		await waitFor(() =>
			expect(withdrawIcpSwapBalance).toHaveBeenCalledExactlyOnceWith({
				identity: expect.anything(),
				poolCanisterId: otherPoolId,
				balance: unusedUsdc
			})
		);
	});

	it('does not claim nothing was left behind when pools were unreadable', async () => {
		// Otherwise the page states a complete result and an incomplete one at the same time.
		vi.mocked(scanIcpSwapPools).mockResolvedValue({
			poolsScanned: 5,
			unreadablePools: 2,
			pools: []
		});

		const { getByTestId, queryByTestId } = render(HelpIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(HELP_ICPSWAP_SCAN_BUTTON));

		await waitFor(() => expect(getByTestId(HELP_ICPSWAP_SCAN_SUMMARY)).toBeInTheDocument());

		expect(queryByTestId(HELP_ICPSWAP_EMPTY)).toBeNull();
	});

	it('still says nothing was found when every pool was readable', async () => {
		vi.mocked(scanIcpSwapPools).mockResolvedValue({
			poolsScanned: 5,
			unreadablePools: 0,
			pools: []
		});

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(HELP_ICPSWAP_SCAN_BUTTON));

		await waitFor(() => expect(getByTestId(HELP_ICPSWAP_EMPTY)).toBeInTheDocument());
	});

	it('reports pools it could not read rather than passing a partial scan off as complete', async () => {
		vi.mocked(scanIcpSwapPools).mockResolvedValue({
			poolsScanned: 5,
			unreadablePools: 2,
			pools: [
				{
					poolCanisterId,
					poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
					pair: ['ICP', 'ckUSDC'],
					balances: [unusedIcp]
				}
			]
		});

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(HELP_ICPSWAP_SCAN_BUTTON));

		await waitFor(() => expect(getByTestId(HELP_ICPSWAP_SCAN_SUMMARY)).toBeInTheDocument());

		expect(getByTestId(HELP_ICPSWAP_SCAN_SUMMARY)).toHaveTextContent('2');
	});

	it('shows an error when the pool table cannot be fetched', async () => {
		vi.mocked(scanIcpSwapPools).mockRejectedValue(new Error('factory unavailable'));

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(HELP_ICPSWAP_SCAN_BUTTON));

		await waitFor(() =>
			expect(getByTestId(HELP_ICPSWAP_ERROR)).toHaveTextContent(en.help.error.scan_failed)
		);
	});

	it('tracks the scan through to success with the pool count', async () => {
		vi.mocked(scanIcpSwapPools).mockResolvedValue({
			poolsScanned: 9,
			unreadablePools: 0,
			pools: [
				{
					poolCanisterId,
					poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
					pair: ['ICP', 'ckUSDC'],
					balances: [unusedIcp]
				}
			]
		});

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(HELP_ICPSWAP_SCAN_BUTTON));

		await waitFor(() =>
			expect(trackHelp).toHaveBeenCalledWith({
				action: 'scan',
				resultStatus: 'success',
				subcontext: 'icpswap_withdrawal',
				balancesFound: 1,
				poolsScanned: 9
			})
		);
	});

	it('offers ICP even though it is not an ICRC token', async () => {
		// enabledIcrcTokens cannot carry ICP - it has its own `icp` standard and lives outside the
		// ICRC stores - yet it is one side of most ICPSwap pools.
		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(HELP_ICPSWAP_TOKEN_A));

		expect(
			getByTestId(`${HELP_ICPSWAP_TOKEN_A}-option-${ICP_TOKEN.ledgerCanisterId}`)
		).toBeInTheDocument();
	});

	it('excludes the token already picked on the other side', async () => {
		const { getByTestId, queryByTestId } = render(HelpIcpSwapWithdrawal);

		await fireEvent.click(getByTestId(HELP_ICPSWAP_TOKEN_A));
		await fireEvent.click(getByTestId(`${HELP_ICPSWAP_TOKEN_A}-option-${icp.ledgerCanisterId}`));

		await fireEvent.click(getByTestId(HELP_ICPSWAP_TOKEN_B));

		expect(queryByTestId(`${HELP_ICPSWAP_TOKEN_B}-option-${icp.ledgerCanisterId}`)).toBeNull();
		expect(
			getByTestId(`${HELP_ICPSWAP_TOKEN_B}-option-${usdc.ledgerCanisterId}`)
		).toBeInTheDocument();
	});

	it('says so explicitly when the pool holds nothing', async () => {
		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() => expect(getByTestId(HELP_ICPSWAP_EMPTY)).toBeInTheDocument());

		expect(getByTestId(HELP_ICPSWAP_EMPTY)).toHaveTextContent(en.help.text.nothing_to_withdraw);
	});

	it('shows the pool-not-found message rather than an empty list', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockRejectedValue(new IcpSwapPoolNotFoundError());

		const { getByTestId, queryByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() => expect(getByTestId(HELP_ICPSWAP_ERROR)).toBeInTheDocument());

		expect(getByTestId(HELP_ICPSWAP_ERROR)).toHaveTextContent(en.help.error.pool_not_found);
		expect(queryByTestId(HELP_ICPSWAP_EMPTY)).toBeNull();
	});

	it('distinguishes a read failure from a missing pool', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockRejectedValue(new Error('boom'));

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() =>
			expect(getByTestId(HELP_ICPSWAP_ERROR)).toHaveTextContent(en.help.error.load_failed)
		);
	});

	it('lists every recoverable balance with its own withdraw button', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp, unusedUsdc]
		});

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		expect(getByTestId(withdrawTestId(unusedUsdc))).toBeInTheDocument();
	});

	it('withdraws only the row whose button was pressed, then re-reads that pool', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp, unusedUsdc]
		});
		vi.mocked(withdrawIcpSwapBalance).mockResolvedValue(150_000_000n);
		vi.mocked(reloadIcpSwapPoolBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedUsdc]
		});

		const { getByTestId, queryByTestId } = render(HelpIcpSwapWithdrawal);

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

		// The pool is re-read - one query against a known canister id, not another factory sweep -
		// and the emptied row goes away.
		await waitFor(() => expect(queryByTestId(withdrawTestId(unusedIcp))).toBeNull());

		expect(getByTestId(withdrawTestId(unusedUsdc))).toBeInTheDocument();
		expect(reloadIcpSwapPoolBalances).toHaveBeenCalledOnce();
		expect(loadIcpSwapRecoverableBalances).toHaveBeenCalledOnce();
	});

	it('keeps the withdrawn amount out of the success toast in privacy mode', async () => {
		const spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');

		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp]
		});
		vi.mocked(withdrawIcpSwapBalance).mockResolvedValue(150_000_000n);
		vi.mocked(reloadIcpSwapPoolBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: []
		});

		setPrivacyMode({ enabled: true });

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);
		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		await fireEvent.click(getByTestId(withdrawTestId(unusedIcp)));

		await waitFor(() =>
			expect(spyToastsShow).toHaveBeenCalledWith(
				expect.objectContaining({
					text: replacePlaceholders(en.help.success.withdraw_hidden, { $symbol: icp.symbol }),
					level: 'success'
				})
			)
		);

		// The row hides the figure under privacy mode; the toast confirming the same withdrawal
		// must not put it back.
		expect(spyToastsShow).not.toHaveBeenCalledWith(
			expect.objectContaining({ text: expect.stringContaining('1.5') })
		);
	});

	it('confirms the amount the pool actually moved when privacy mode is off', async () => {
		const spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');

		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp]
		});
		// More than the row showed: a balance credited between discovery and withdrawal.
		vi.mocked(withdrawIcpSwapBalance).mockResolvedValue(200_000_000n);
		vi.mocked(reloadIcpSwapPoolBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: []
		});

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);
		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		await fireEvent.click(getByTestId(withdrawTestId(unusedIcp)));

		await waitFor(() =>
			expect(spyToastsShow).toHaveBeenCalledWith(
				expect.objectContaining({
					text: replacePlaceholders(en.help.success.withdraw, {
						$amount: '2',
						$symbol: icp.symbol
					}),
					level: 'success'
				})
			)
		);
	});

	describe('accessible announcements', () => {
		// The region has to be in the DOM before its content changes: a polite live region that is
		// itself inserted is not reliably announced.
		const liveRegion = (container: HTMLElement): HTMLElement | null =>
			container.querySelector('[role="status"][aria-live="polite"]');

		it('keeps one polite live region in place before anything is picked', () => {
			const { container } = render(HelpIcpSwapWithdrawal);

			expect(liveRegion(container)).toBeInTheDocument();
			expect(liveRegion(container)).toBeEmptyDOMElement();
		});

		it('announces progress and then the number of balances found', async () => {
			const { promise: pending, resolve: release } = Promise.withResolvers<IcpSwapPoolBalances>();
			vi.mocked(loadIcpSwapRecoverableBalances).mockReturnValue(pending);

			const { container, getByTestId } = render(HelpIcpSwapWithdrawal);

			await selectPair(getByTestId);

			await waitFor(() =>
				expect(liveRegion(container)).toHaveTextContent(en.help.text.checking_pool)
			);

			release({
				poolCanisterId,
				poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
				pair: ['ICP', 'ckUSDC'],
				balances: [unusedIcp, unusedUsdc]
			});

			await waitFor(() =>
				expect(getByTestId(HELP_ICPSWAP_RESULTS_SUMMARY)).toHaveTextContent(
					replacePlaceholders(en.help.text.results_found, { $balances: '2' })
				)
			);

			expect(liveRegion(container)).toContainElement(getByTestId(HELP_ICPSWAP_RESULTS_SUMMARY));
		});

		it('announces an empty result inside the same region', async () => {
			const { container, getByTestId } = render(HelpIcpSwapWithdrawal);

			await selectPair(getByTestId);

			await waitFor(() => expect(getByTestId(HELP_ICPSWAP_EMPTY)).toBeInTheDocument());

			expect(liveRegion(container)).toContainElement(getByTestId(HELP_ICPSWAP_EMPTY));
		});

		it('raises a failed lookup as an alert rather than a status update', async () => {
			vi.mocked(loadIcpSwapRecoverableBalances).mockRejectedValue(new Error('transport'));

			const { container, getByTestId } = render(HelpIcpSwapWithdrawal);

			await selectPair(getByTestId);

			await waitFor(() => expect(getByTestId(HELP_ICPSWAP_ERROR)).toBeInTheDocument());

			expect(getByTestId(HELP_ICPSWAP_ERROR)).toHaveAttribute('role', 'alert');
			expect(liveRegion(container)).not.toContainElement(getByTestId(HELP_ICPSWAP_ERROR));
		});

		it('raises unreadable pools as an alert', async () => {
			vi.mocked(scanIcpSwapPools).mockResolvedValue({
				poolsScanned: 4,
				pools: [],
				unreadablePools: 2
			});

			const { getByTestId } = render(HelpIcpSwapWithdrawal);

			await fireEvent.click(getByTestId(HELP_ICPSWAP_SCAN_BUTTON));

			await waitFor(() => expect(getByTestId(HELP_ICPSWAP_SCAN_SUMMARY)).toBeInTheDocument());

			expect(getByTestId(HELP_ICPSWAP_SCAN_SUMMARY)).toHaveAttribute('role', 'alert');
		});
	});

	it('locks discovery while a withdrawal is in flight', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp]
		});
		vi.mocked(reloadIcpSwapPoolBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: []
		});

		let settleWithdrawal: (withdrawn: bigint) => void = () => undefined;
		vi.mocked(withdrawIcpSwapBalance).mockReturnValue(
			new Promise<bigint>((resolve) => (settleWithdrawal = resolve))
		);

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);
		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		await fireEvent.click(getByTestId(withdrawTestId(unusedIcp)));
		await waitFor(() => expect(withdrawIcpSwapBalance).toHaveBeenCalledOnce());

		// A scan or a pair change here would clear `groups` under the withdrawal, dropping its
		// re-read and re-displaying the row it already emptied.
		expect(getByTestId(HELP_ICPSWAP_SCAN_BUTTON)).toBeDisabled();
		expect(getByTestId(HELP_ICPSWAP_TOKEN_A)).toBeDisabled();
		expect(getByTestId(HELP_ICPSWAP_TOKEN_B)).toBeDisabled();

		settleWithdrawal(150_000_000n);

		await waitFor(() => expect(getByTestId(HELP_ICPSWAP_SCAN_BUTTON)).not.toBeDisabled());
	});

	it('surfaces a remainder credited between discovery and withdrawal', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp]
		});
		vi.mocked(withdrawIcpSwapBalance).mockResolvedValue(150_000_000n);
		// The pool credited more while the user was looking at it.
		vi.mocked(reloadIcpSwapPoolBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [{ ...unusedIcp, amount: 25_000_000n }]
		});

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);
		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		await fireEvent.click(getByTestId(withdrawTestId(unusedIcp)));

		// The row stays, now showing what is left, instead of disappearing with the funds hidden.
		await waitFor(() => expect(reloadIcpSwapPoolBalances).toHaveBeenCalledOnce());

		expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument();
		expect(getByTestId(HELP_ICPSWAP_CARD)).toHaveTextContent('0.25');
	});

	it('does not report a failed withdrawal when only the re-read fails', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp, unusedUsdc]
		});
		vi.mocked(withdrawIcpSwapBalance).mockResolvedValue(150_000_000n);
		vi.mocked(reloadIcpSwapPoolBalances).mockRejectedValue(new Error('pool unavailable'));

		const { getByTestId, queryByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);
		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		await fireEvent.click(getByTestId(withdrawTestId(unusedIcp)));

		// The withdrawal succeeded, so it is tracked as a success and the row is dropped anyway.
		await waitFor(() => expect(queryByTestId(withdrawTestId(unusedIcp))).toBeNull());

		expect(trackHelp).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'withdraw', resultStatus: 'success' })
		);
		expect(trackHelp).not.toHaveBeenCalledWith(
			expect.objectContaining({ action: 'withdraw', resultStatus: 'error' })
		);
	});

	it('keeps the row in place when the withdrawal fails', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp]
		});
		vi.mocked(withdrawIcpSwapBalance).mockRejectedValue(new Error('pool unavailable'));

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

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
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp, unusedUsdc]
		});

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() =>
			expect(trackHelp).toHaveBeenCalledWith({
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

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);

		await waitFor(() =>
			expect(trackHelp).toHaveBeenCalledWith(
				expect.objectContaining({
					action: 'select_pool',
					resultStatus: 'error',
					errorType: PLAUSIBLE_EVENT_HELP_ERROR_TYPES.POOL_NOT_FOUND
				})
			)
		);
	});

	it('tracks a withdrawal from executing through to success, without an amount', async () => {
		vi.mocked(loadIcpSwapRecoverableBalances).mockResolvedValue({
			poolCanisterId,
			poolTokens: [unusedIcp.poolToken, unusedUsdc.poolToken],
			pair: ['ICP', 'ckUSDC'],
			balances: [unusedIcp]
		});
		vi.mocked(withdrawIcpSwapBalance).mockResolvedValue(150_000_000n);

		const { getByTestId } = render(HelpIcpSwapWithdrawal);

		await selectPair(getByTestId);
		await waitFor(() => expect(getByTestId(withdrawTestId(unusedIcp))).toBeInTheDocument());

		await fireEvent.click(getByTestId(withdrawTestId(unusedIcp)));

		const expected = {
			subcontext: 'icpswap_withdrawal',
			token: 'ICP',
			tokenStandard: icp.standard.code
		};

		await waitFor(() => {
			expect(trackHelp).toHaveBeenCalledWith({
				action: 'withdraw',
				resultStatus: 'executing',
				...expected
			});
			expect(trackHelp).toHaveBeenCalledWith({
				action: 'withdraw',
				resultStatus: 'success',
				...expected
			});
		});

		const withdrawCalls = vi
			.mocked(trackHelp)
			.mock.calls.filter(([{ action }]) => action === 'withdraw');

		withdrawCalls.forEach(([params]) => {
			expect(params).not.toHaveProperty('amount');
			expect(params).not.toHaveProperty('usdValue');
		});
	});
});
