import type { BlockstreamTransaction } from '$lib/types/blockstream';

export const mockBlockHeight = 850000;

export const mockBlockstreamTransaction: BlockstreamTransaction = {
	txid: 'e793cab7e155a0e8f825c4609548faf759c57715fecac587580a1d716bb2b89e',
	version: 1,
	locktime: 0,
	vin: [
		{
			txid: '6542046908886347000000000000000000000000000000000000000000000000',
			vout: 6,
			prevout: {
				scriptpubkey: '00148cbfcfdbc1714345c8181b9b9c17ba637ae28417',
				scriptpubkey_asm: '0 8cbfcfdbc1714345c8181b9b9c17ba637ae28417',
				scriptpubkey_type: 'v0_p2wpkh',
				scriptpubkey_address: 'bc1q3jlulk7pw9p5tjqcrwdec9a6vdaw9pqhw0wg4g',
				value: 202300943
			},
			scriptsig: '',
			scriptsig_asm: '',
			witness: [
				'30450221009cbfe364a7b248dcfd65cc6fff448054122fc4f421fed7575012c84cfaed8b8202206c000eb2a68165710c4903ca6d327ada012afbdc6ba11cc49fea718efbaf96b701',
				'027d7959dc46db36c408c3f51c5880b97a82dd43f611b6677e40dce683dd4223c4'
			],
			is_coinbase: false,
			sequence: 4294967295
		}
	],
	vout: [
		{
			scriptpubkey: 'a9141d20b026a54ac240a783a03c3056535aff8c56af87',
			scriptpubkey_asm: 'OP_HASH160 1d20b026a54ac240a783a03c3056535aff8c56af OP_EQUAL',
			scriptpubkey_type: 'p2sh',
			scriptpubkey_address: '34M2gKELCJUQe189oWwSGHzwqwynVebzVz',
			value: 46642
		},
		{
			scriptpubkey: '00141acefe0e6df5dce899ebcda855e35afb6749a25d',
			scriptpubkey_asm: '0 1acefe0e6df5dce899ebcda855e35afb6749a25d',
			scriptpubkey_type: 'v0_p2wpkh',
			scriptpubkey_address: 'bc1qrt80urnd7hww3x0tek59tc66ldn5ngjaze4afa',
			value: 50760
		},
		{
			scriptpubkey: '00205be7609743f04b4327b8204a70b9cacf35520b89f1ff5ea9c47c16b59e37e1aa',
			scriptpubkey_asm: '0 5be7609743f04b4327b8204a70b9cacf35520b89f1ff5ea9c47c16b59e37e1aa',
			scriptpubkey_type: 'v0_p2wsh',
			scriptpubkey_address: 'bc1qt0nkp96r7p95xfacyp98pww2eu64yzuf78l4a2wy0sttt83hux4q6u2nl7',
			value: 126527
		}
	],
	size: 562,
	weight: 1918,
	fee: 1019,
	status: {
		confirmed: true,
		block_height: 123213,
		block_hash: '00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72728a054',
		block_time: 1727175987
	}
};

export const mockBlockstreamTransactions: BlockstreamTransaction[] = [mockBlockstreamTransaction];

export const createMockBlockstreamTransactions = (n: number): BlockstreamTransaction[] =>
	Array.from({ length: n }, (_, index) => ({
		...mockBlockstreamTransaction,
		txid: `${index}${mockBlockstreamTransaction.txid.slice(1)}`,
		status: {
			...mockBlockstreamTransaction.status,
			block_height: (mockBlockstreamTransaction.status.block_height ?? 0) + index,
			block_time: (mockBlockstreamTransaction.status.block_time ?? 0) + index * 100
		},
		fee: mockBlockstreamTransaction.fee + index * 10,
		vout: mockBlockstreamTransaction.vout.map((output) => ({
			...output,
			value: output.value + index * 1000
		}))
	}));
