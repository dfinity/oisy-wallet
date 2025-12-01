import StakeTransaction from '$lib/components/stake/StakeTransaction.svelte';
import { GLDT_STAKE_CANISTER_ID, NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

const mockToken = {
	...mockValidIcrcToken,
	id: parseTokenId('GLDT'),
	symbol: 'GLDT',
	ledgerCanisterId: GLDT_STAKE_CANISTER_ID
};

const baseTx = {
	id: 'test-tx',
	token: mockToken,
	type: 'send',
	from: ['aaaaaaa'],
	timestamp: BigInt(1000) * BigInt(NANO_SECONDS_IN_SECOND),
	value: 10000000000n,
	fee: 200000000n,
	status: 'confirmed',
	incoming: false,
	isReward: false
} as unknown as StakingTransactionsUiWithToken;

const renderTx = (overrides = {}) =>
	render(StakeTransaction, {
		transaction: { ...baseTx, ...overrides }
	});

describe('StakeTransaction', () => {
	it('displays label "staked" for outgoing tx', () => {
		renderTx();

		expect(screen.getByText(get(i18n).stake.text.staked)).toBeInTheDocument();
	});

	it('displays label "unstaked" when incoming and not reward', () => {
		renderTx({ incoming: true, isReward: false });

		expect(screen.getByText(get(i18n).stake.text.unstaked)).toBeInTheDocument();
	});

	it('displays label "reward claimed" for reward incoming', () => {
		renderTx({ incoming: true, isReward: true });

		expect(screen.getByText(get(i18n).stake.text.reward_claimed)).toBeInTheDocument();
	});

	it('negates incoming non-reward value + fee', () => {
		renderTx({ incoming: true, isReward: false, value: 10000000000n, fee: 1000000000n });

		expect(screen.getByText(/-110/i)).toBeInTheDocument();
	});

	it('does not negate reward incoming amount', () => {
		renderTx({ incoming: true, isReward: true, value: 5000000000n });

		expect(screen.getByText(/\+50/i)).toBeInTheDocument();
	});

	it('shows the formatted time from timestamp', () => {
		renderTx();
		const timestampNode = screen.getByTestId('receive-tokens-modal-transaction-timestamp');

		expect(timestampNode).toBeInTheDocument();
		expect(timestampNode.textContent?.length).toBeGreaterThan(0);
	});

	it('shows "to" direction for non incoming', () => {
		renderTx({ to: ['target-xyz'] });

		expect(screen.getByText(get(i18n).transaction.text.to)).toBeInTheDocument();
	});

	it('shows transaction status element', () => {
		renderTx({ status: 'pending' });

		expect(screen.getByText(/pending/i)).toBeInTheDocument();
	});
});
