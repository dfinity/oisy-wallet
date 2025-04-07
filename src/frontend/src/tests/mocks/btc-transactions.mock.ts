import type { BtcTransactionUi } from '$btc/types/btc';
import type { BitcoinTransaction } from '$lib/types/blockchain';

export const mockBtcTransactionUi: BtcTransactionUi = {
	blockNumber: 123213,
	from: 'bc1q3jlulk7pw9p5tjqcrwdec9a6vdaw9pqhw0wg4g',
	id: 'e793cab7e155a0e8f825c4609548faf759c57715fecac587580a1d716bb2b89e',
	status: 'confirmed',
	timestamp: 1727175987n,
	to: ['bc1qt0nkp96r7p95xfacyp98pww2eu64yzuf78l4a2wy0sttt83hux4q6u2nl7'],
	type: 'receive',
	value: 126527n,
	confirmations: 1
};

export const createMockBtcTransactionsUi = (n: number): BtcTransactionUi[] =>
	Array.from({ length: n }, () => ({
		...mockBtcTransactionUi,
		blockNumber: Math.floor(Math.random() * 100000),
		id: crypto.randomUUID(),
		timestamp: BigInt(Math.floor(Math.random() * 100000)),
		value: BigInt(Math.floor(Math.random() * 100000))
	}));

export const mockBtcTransaction: BitcoinTransaction = {
	hash: 'e793cab7e155a0e8f825c4609548faf759c57715fecac587580a1d716bb2b89e',
	ver: 1,
	vin_sz: 1,
	vout_sz: 12,
	size: 562,
	weight: 1918,
	fee: 1019,
	relayed_by: '0.0.0.0',
	lock_time: 0,
	tx_index: 5584515345818529,
	double_spend: false,
	time: 1727175987,
	block_index: null,
	block_height: null,
	inputs: [
		{
			sequence: 4294967295,
			witness:
				'024830450221009cbfe364a7b248dcfd65cc6fff448054122fc4f421fed7575012c84cfaed8b8202206c000eb2a68165710c4903ca6d327ada012afbdc6ba11cc49fea718efbaf96b70121027d7959dc46db36c408c3f51c5880b97a82dd43f611b6677e40dce683dd4223c4',
			script: '',
			index: 0,
			prev_out: {
				type: 0,
				spent: true,
				value: 202300943,
				spending_outpoints: [{ tx_index: 5584515345818529, n: 0 }],
				n: 6,
				tx_index: 6542046908886347,
				script: '00148cbfcfdbc1714345c8181b9b9c17ba637ae28417',
				addr: 'bc1q3jlulk7pw9p5tjqcrwdec9a6vdaw9pqhw0wg4g'
			}
		}
	],
	out: [
		{
			type: 0,
			spent: false,
			value: 46642,
			spending_outpoints: [],
			n: 0,
			tx_index: 5584515345818529,
			script: 'a9141d20b026a54ac240a783a03c3056535aff8c56af87',
			addr: '34M2gKELCJUQe189oWwSGHzwqwynVebzVz'
		},
		{
			type: 0,
			spent: false,
			value: 50760,
			spending_outpoints: [],
			n: 1,
			tx_index: 5584515345818529,
			script: '00141acefe0e6df5dce899ebcda855e35afb6749a25d',
			addr: 'bc1qrt80urnd7hww3x0tek59tc66ldn5ngjaze4afa'
		},
		{
			type: 0,
			spent: false,
			value: 126527,
			spending_outpoints: [],
			n: 2,
			tx_index: 5584515345818529,
			script: '00205be7609743f04b4327b8204a70b9cacf35520b89f1ff5ea9c47c16b59e37e1aa',
			addr: 'bc1qt0nkp96r7p95xfacyp98pww2eu64yzuf78l4a2wy0sttt83hux4q6u2nl7'
		},
		{
			type: 0,
			spent: false,
			value: 441376,
			spending_outpoints: [],
			n: 3,
			tx_index: 5584515345818529,
			script: '001454df0b1bbb1d96542cc64a7c492dc083f386bdd7',
			addr: 'bc1q2n0skxamrkt9gtxxff7yjtwqs0ecd0whmv3nmf'
		},
		{
			type: 0,
			spent: false,
			value: 4218191,
			spending_outpoints: [],
			n: 4,
			tx_index: 5584515345818529,
			script: '76a9147d4210b159b85b83a046ea6c41ef736389b4d74488ac',
			addr: '1CRJcGec4Zhrz4fpyN92JtezAs2fEYJsQ9'
		},
		{
			type: 0,
			spent: false,
			value: 110307,
			spending_outpoints: [],
			n: 5,
			tx_index: 5584515345818529,
			script: 'a91422a7139cef08c62e868570213596f2ab456f7b0e87',
			addr: '34rF3kbzjHMWvQVT3yQCDXHmdTscBL2Mj1'
		},
		{
			type: 0,
			spent: false,
			value: 196068150,
			spending_outpoints: [],
			n: 6,
			tx_index: 5584515345818529,
			script: '001408ab827599c51bf4c9b7319bcf5efab8bea55ca6',
			addr: 'bc1qpz4cyavec5dlfjdhxxdu7hh6hzl22h9x74f3t6'
		},
		{
			type: 0,
			spent: false,
			value: 37177,
			spending_outpoints: [],
			n: 7,
			tx_index: 5584515345818529,
			script: '00142e634c652a052aea42bfd214c107410fedd230f3',
			addr: 'bc1q9e35cef2q54w5s4l6g2vzp6pplkayv8n4hsjgd'
		},
		{
			type: 0,
			spent: false,
			value: 141866,
			spending_outpoints: [],
			n: 8,
			tx_index: 5584515345818529,
			script: '002073a338ffa6b1ecd3ba5b40980317ea1db3594e5f0a3a4b8584f348347016cace',
			addr: 'bc1qww3n3laxk8kd8wjmgzvqx9l2rke4jnjlpgayhpvy7dyrguqket8q99x3z0'
		},
		{
			type: 0,
			spent: false,
			value: 945864,
			spending_outpoints: [],
			n: 9,
			tx_index: 5584515345818529,
			script: '00148d7cb4252dc4e262b1c823412c69686ab2853551',
			addr: 'bc1q347tgffdcn3x9vwgydqjc6tgd2eg2d235hq25k'
		},
		{
			type: 0,
			spent: false,
			value: 93093,
			spending_outpoints: [],
			n: 10,
			tx_index: 5584515345818529,
			script: '0014ae35caf67bf79a46ca951158f29ebbd1466cb999',
			addr: 'bc1q4c6u4anm77dydj54z9v0984m69rxewveqn37p2'
		},
		{
			type: 0,
			spent: false,
			value: 19971,
			spending_outpoints: [],
			n: 11,
			tx_index: 5584515345818529,
			script: '0014bd13a6b0373052c63687d35fd5580e2bdb1b0a60',
			addr: 'bc1qh5f6dvphxpfvvd586d0a2kqw90d3kznqvpx5dv'
		}
	],
	result: 37177,
	balance: 37177
};
