import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import type { Erc20Token } from '$eth/types/erc20';
import { RIFT_EXTERNAL_REF_KEYS, type RiftOrderStatus } from '$lib/types/rift';
import { SwapProvider } from '$lib/types/swap';
import {
	buildRiftSwapTrackingMetadata,
	isRiftActiveUserTransaction,
	riftPaidOut,
	toRiftCreationRefs,
	toRiftData,
	toRiftExternalRefs,
	toRiftExternalRefsMap,
	toRiftLearnedRefs,
	toRiftStatusUpdate
} from '$lib/utils/rift-active-tx.utils';
import {
	mockLifiActiveUserTransaction,
	mockRiftActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockRiftOrder } from '$tests/mocks/rift.mock';

const usdc: Erc20Token = {
	...mockValidErc20Token,
	symbol: 'USDC',
	decimals: 6,
	address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
};

const rowRefs = toRiftExternalRefsMap(mockRiftActiveUserTransaction.external_refs);

describe('rift-active-tx.utils', () => {
	it('recognises a Rift row, and only one', () => {
		expect(isRiftActiveUserTransaction(mockRiftActiveUserTransaction)).toBeTruthy();
		expect(isRiftActiveUserTransaction(mockLifiActiveUserTransaction)).toBeFalsy();
	});

	it('round-trips the refs, sorted, without empty values', () => {
		const refs = toRiftExternalRefs({
			[RIFT_EXTERNAL_REF_KEYS.STATUS]: 'funded',
			[RIFT_EXTERNAL_REF_KEYS.ORDER_ID]: mockRiftOrder.id,
			[RIFT_EXTERNAL_REF_KEYS.PAYOUT_TX]: ''
		});

		expect(refs.map(({ key }) => key)).toEqual(['rift_order_id', 'rift_status']);
		expect(toRiftExternalRefsMap(refs)).toEqual({
			rift_order_id: mockRiftOrder.id,
			rift_status: 'funded'
		});
	});

	describe('toRiftData', () => {
		it('records both tokens and the amount in base units', () => {
			expect(
				toRiftData({ sourceToken: BTC_MAINNET_TOKEN, destinationToken: usdc, amount: 200_000n })
			).toEqual({
				Rift: {
					source_token: { BtcNativeMainnet: null },
					dest_token: { Erc20: [usdc.address, 1n] },
					amount: 200_000n
				}
			});
		});
	});

	describe('toRiftCreationRefs', () => {
		it('records the order, its deposit, both decimals and the shared display refs', () => {
			expect(
				toRiftCreationRefs({
					order: mockRiftOrder,
					depositTx: 'cd'.repeat(32),
					sourceToken: BTC_MAINNET_TOKEN,
					destinationToken: usdc,
					amount: '0.002',
					usdSourceValue: '122.5'
				})
			).toEqual({
				rift_order_id: mockRiftOrder.id,
				rift_deposit_address: mockRiftOrder.deposit_address,
				rift_deposit_tx: 'cd'.repeat(32),
				rift_source_decimals: '8',
				rift_dest_decimals: '6',
				amount: '0.002',
				usd_source_value: '122.5',
				source_token_symbol: 'BTC',
				source_network_symbol: BTC_MAINNET_TOKEN.network.name,
				destination_token_symbol: 'USDC',
				destination_network_symbol: usdc.network.name
			});
		});

		it("truncates a custom token's long symbol to the backend's limit", () => {
			const refs = toRiftCreationRefs({
				order: mockRiftOrder,
				depositTx: 'cd'.repeat(32),
				sourceToken: BTC_MAINNET_TOKEN,
				destinationToken: { ...usdc, symbol: 'X'.repeat(300) },
				amount: '0.002'
			});

			expect(refs.destination_token_symbol).toHaveLength(256);
			expect(refs).not.toHaveProperty('usd_source_value');
		});
	});

	describe('toRiftStatusUpdate', () => {
		it.each<{ status: RiftOrderStatus; expected: ReturnType<typeof toRiftStatusUpdate> }>([
			{ status: 'awaiting_deposit', expected: undefined },
			{ status: 'funded', expected: { status: { Executing: null } } },
			{ status: 'executing', expected: { status: { Executing: null } } },
			{ status: 'underfunded', expected: { status: { Executing: null } } },
			{ status: 'delivered', expected: { status: { Succeeded: null } } },
			{
				status: 'refunded',
				expected: { status: { Failed: null }, error: en.swap.error.swap_refunded }
			},
			{
				status: 'expired',
				expected: { status: { Failed: null }, error: en.swap.error.rift_deposit_expired }
			},
			{
				status: 'frozen',
				expected: { status: { Failed: null }, error: en.swap.error.rift_order_frozen }
			}
		])('maps $status', ({ status, expected }) => {
			expect(toRiftStatusUpdate(status)).toEqual(expected);
		});
	});

	describe('toRiftLearnedRefs', () => {
		const learned = ({
			order,
			refs = rowRefs
		}: {
			order: Partial<typeof mockRiftOrder>;
			refs?: typeof rowRefs;
		}) => toRiftLearnedRefs({ order: { ...mockRiftOrder, ...order }, refs });

		it('records the status alone while the order runs', () => {
			expect(learned({ order: { status: 'executing', amount_out: '1' } })).toEqual({
				rift_status: 'executing'
			});
		});

		it("records a delivery in the destination token's decimals, with its payout", () => {
			expect(
				learned({ order: { status: 'delivered', amount_out: '121475958', payout_tx: '0xpayout' } })
			).toEqual({
				rift_status: 'delivered',
				rift_amount_out: '121.475958',
				rift_payout_tx: '0xpayout'
			});
		});

		it("records a refund in the source token's decimals", () => {
			expect(learned({ order: { status: 'refunded', amount_out: '195000' } })).toEqual({
				rift_status: 'refunded',
				rift_amount_out: '0.00195'
			});
		});

		it('leaves the amount out without usable decimals', () => {
			expect(
				learned({
					order: { status: 'delivered', amount_out: '121475958' },
					refs: { ...rowRefs, [RIFT_EXTERNAL_REF_KEYS.DEST_DECIMALS]: 'six' }
				})
			).toEqual({ rift_status: 'delivered' });
		});

		it('leaves out a payout transaction too long for a ref', () => {
			expect(
				learned({ order: { status: 'delivered', amount_out: null, payout_tx: 'x'.repeat(257) } })
			).toEqual({ rift_status: 'delivered' });
		});
	});

	describe('riftPaidOut', () => {
		const withRefs = (refs: Record<string, string>) => ({
			...mockRiftActiveUserTransaction,
			external_refs: [
				...mockRiftActiveUserTransaction.external_refs,
				...Object.entries(refs).map(([key, value]) => ({ key, value }))
			]
		});

		it('shows a delivery in the destination token', () => {
			expect(
				riftPaidOut(withRefs({ rift_status: 'delivered', rift_amount_out: '121.475958' }))
			).toEqual(['121.475958', 'USDC']);
		});

		it('shows a refund in the source token', () => {
			expect(
				riftPaidOut(withRefs({ rift_status: 'refunded', rift_amount_out: '0.00195' }))
			).toEqual(['0.00195', 'BTC']);
		});

		it('shows nothing before the order settles, or without the amount', () => {
			expect(riftPaidOut(withRefs({ rift_status: 'funded' }))).toBeUndefined();
			expect(riftPaidOut(withRefs({ rift_status: 'delivered' }))).toBeUndefined();
		});
	});

	describe('buildRiftSwapTrackingMetadata', () => {
		it("reports the row's snapshot, and nothing of Rift's", () => {
			expect(buildRiftSwapTrackingMetadata({ tx: mockRiftActiveUserTransaction })).toEqual({
				sourceToken: 'BTC',
				destinationToken: 'USDC',
				dApp: SwapProvider.RIFT,
				tokenAmount: '0.002',
				usdSourceValue: '122.5',
				sourceNetwork: 'Bitcoin',
				destinationNetwork: 'Ethereum'
			});
		});
	});
});
