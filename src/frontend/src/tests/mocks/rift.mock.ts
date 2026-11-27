// A live `format: "raw"` quote for 0.002 BTC into USDC on Ethereum (2026-11-26), as Rift sends it,
// fields OISY does not read included.
export const mockRiftQuoteResponse = {
	id: '01a2175a-1c83-75c3-a6d7-cf88de8274d4',
	from: 'bitcoin.btc',
	to: 'evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
	amount_in: '200000',
	estimated_amount_out: '121475958',
	estimated_execution_cost: '36528',
	route: [
		{
			type: 'venue',
			venue: 'rift_otc',
			execution: { mode: 'bitcoin' },
			from: 'bitcoin.btc',
			to: 'evm:57073.0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98',
			amount_in: '200000',
			amount_out: '199787',
			step_amount_in: '200000',
			venue_amount_in: '199922',
			venue_amount_out: '199787',
			step_amount_out: '199787'
		},
		{
			type: 'venue',
			venue: 'velora',
			execution: { mode: 'evm', chain: 1 },
			from: 'evm:57073.0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98',
			to: 'evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
			amount_in: '199787',
			amount_out: '121512486',
			step_amount_in: '199787',
			venue_amount_in: '199787',
			venue_amount_out: '121512486',
			step_amount_out: '121512486'
		},
		{
			type: 'delivery',
			amount_in: '121512486',
			execution_cost: '36528',
			integrator_fee: '0',
			amount_out: '121475958'
		}
	],
	expires_at: '2026-11-26T10:25:11.235343Z',
	venue_allowlist: [],
	venue_blocklist: [],
	integrator_fee_bps: null,
	integrator_fee_recipient: null,
	from_amount: '200000',
	delivery: {
		amount_in: '121512486',
		execution_cost: '36528',
		integrator_fee: '0',
		amount_out: '121475958'
	},
	format: 'raw',
	integrator_id: null
};

// An order as `POST /order` answers it right after creation, shaped as Rift's `OrderResponse`.
export const mockRiftOrderResponse = {
	format: 'raw',
	id: '0f8fad5b-d9cb-469f-a165-70867728950e',
	quote_id: '01a2175a-1c83-75c3-a6d7-cf88de8274d4',
	vault_id: 'vault-1',
	from: 'bitcoin.btc',
	to: 'evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
	amount_in: '200000',
	amount_out: null,
	payout_tx: null,
	deposit_address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
	deposit_tx: null,
	to_address: '0x1d638414860ed08dd31fae848e527264f20512fa',
	refund_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
	venue_allowlist: [],
	venue_blocklist: [],
	integrator_id: 'oisy',
	integrator_fee_bps: null,
	integrator_fee_recipient: null,
	integrator_fee: null,
	integrator_fee_tx: null,
	status: 'awaiting_deposit',
	deposit_deadline: '2026-12-03T10:15:11.235343Z',
	created_at: '2026-11-26T10:15:11.235343Z',
	from_amount: '200000'
};
