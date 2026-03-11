import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import StakeTransaction from '$lib/components/stake/StakeTransaction.svelte';
import { i18n } from '$lib/stores/i18n.store';
import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

const baseTx = {
	id: 'test-tx',
	token: mockValidIcrcToken,
	type: 'send',
	from: ['aaaaaaa'],
	timestamp: 1000n,
	value: 10000000000n
} as unknown as StakingTransactionsUiWithToken;

const renderTx = (overrides = {}) =>
	render(StakeTransaction, {
		transaction: { ...baseTx, ...overrides }
	});

describe('StakeTransaction', () => {
	describe('non-harvest autopilot token', () => {
		it('should display label "unstaked" for send type', () => {
			renderTx();

			expect(screen.getByText(get(i18n).stake.text.unstaked)).toBeInTheDocument();
		});

		it('should display label "staked" for receive type', () => {
			renderTx({ type: 'receive', from: '0xaaaaaaa' });

			expect(screen.getByText(get(i18n).stake.text.staked)).toBeInTheDocument();
		});

		it('should show confirmed status', () => {
			renderTx();

			expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
		});
	});

	describe('harvest autopilot token', () => {
		const harvestTx = {
			...baseTx,
			token: BAUTOPILOT_USDC_TOKEN,
			blockNumber: 123
		};

		it('should display label "send" for send type', () => {
			render(StakeTransaction, { transaction: harvestTx });

			expect(screen.getByText(get(i18n).send.text.send)).toBeInTheDocument();
		});

		it('should display label "receive" for receive type', () => {
			render(StakeTransaction, {
				transaction: { ...harvestTx, type: 'receive', from: '0xaaaaaaa' }
			});

			expect(screen.getByText(get(i18n).receive.text.receive)).toBeInTheDocument();
		});

		it('should show pending status when blockNumber is missing', () => {
			const { blockNumber: _, ...txWithoutBlock } = harvestTx;

			render(StakeTransaction, {
				transaction: txWithoutBlock as unknown as StakingTransactionsUiWithToken
			});

			expect(screen.getByText(/pending/i)).toBeInTheDocument();
		});
	});

	describe('display amount', () => {
		it('should show negative amount for send type', () => {
			renderTx({ value: 10000000000n });

			expect(screen.getByText(/-100/i)).toBeInTheDocument();
		});

		it('should show positive amount for receive type', () => {
			renderTx({ type: 'receive', from: '0xaaaaaaa', value: 5000000000n });

			expect(screen.getByText(/\+50/i)).toBeInTheDocument();
		});
	});

	it('should show the formatted time from timestamp', () => {
		renderTx();

		const timestampNode = screen.getByTestId('receive-tokens-modal-transaction-timestamp');

		expect(timestampNode).toBeInTheDocument();
		expect(timestampNode.textContent?.length).toBeGreaterThan(0);
	});

	it('should show "to" direction for send type', () => {
		renderTx({ to: ['target-xyz'] });

		expect(screen.getByText(get(i18n).transaction.text.to)).toBeInTheDocument();
	});
});
