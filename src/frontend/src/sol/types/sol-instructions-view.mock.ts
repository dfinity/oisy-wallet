import { ZERO } from '$lib/constants/app.constants';
import type { SolInstructionViewRow } from '$sol/types/sol-instructions-view';
import type { SolSimulationPreview } from '$sol/types/sol-simulation';

// Design-study data for the simulated contained-instructions list.
//
// The first seven entries are real mainnet transactions signed by the address below, fetched with
// getTransaction/jsonParsed and reduced to the instructions that change what its owner holds or
// controls. The rest are synthetic, covering shapes the real seven happen not to contain: a plain
// SOL send, an approval, an authority handover, a receive, an account close, and a route through
// two unlisted mints, which is the only case where the unknown tokens need numbering.

export const MOCK_USER_ADDRESS = '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q';

export interface MockTransaction {
	title: string;
	dapp: string;
	signature: string;
	destination: string;
	rows: SolInstructionViewRow[];
	preview: SolSimulationPreview;
	prioritizationFee?: bigint;
	rawCount: number;
	shownCount: number;
}

export const MOCK_TRANSACTIONS: MockTransaction[] = [
	{
		title: 'Jupiter swap: USDC for RAY',
		dapp: 'jup.ag',
		signature: '5DjDgVKx…VBXed',
		destination: '9GJG…M8t9',
		rows: [
			{
				text: 'Create token account for Unknown token',
				detail: 'rent 0.002039 SOL'
			},
			{
				text: 'Swap route via Jupiter',
				children: [
					{
						text: 'Send 0.123 USDC to 9GJG…M8t9'
					},
					{
						text: 'Receive 1,579.578559 Unknown token from FrUP…KQzG'
					},
					{
						text: 'Send 1,579.578559 Unknown token to VY7x…KvbK'
					},
					{
						text: 'Receive 0.046099 RAY from A9Y8…8mBF'
					}
				]
			},
			{
				text: 'Close token account',
				detail: 'rent returned to your wallet'
			}
		],
		preview: {
			tokenDeltas: [
				{
					account: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
					tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
					decimals: 6,
					delta: -123000n
				},
				{
					account: 'GT6GWjdd5dPXyo8tiJj28JZovtqrxhZWHj2sbAo7cHeA',
					tokenAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
					decimals: 6,
					delta: 46099n
				}
			],
			controlChanges: [],
			solDelta: -20001n
		},
		rawCount: 15,
		shownCount: 6,
		prioritizationFee: 238217n
	},
	{
		title: 'SPL send with account creation',
		dapp: 'phantom.app',
		signature: 'txDvZ3jL…rCAv',
		destination: 'Dkng…EjT2',
		rows: [
			{
				text: 'Send 5 Unknown token to Dkng…EjT2'
			}
		],
		preview: {
			tokenDeltas: [
				{
					account: '4Zao69PUPwc16Qf3ddV32hKNU8ATed8a5encUtN7d5Sp',
					tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
					decimals: 6,
					delta: -5000000n
				}
			],
			controlChanges: [],
			solDelta: -2113880n
		},
		rawCount: 6,
		shownCount: 1
	},
	{
		title: 'DFlow swap: SOL for USDC',
		dapp: 'app.dflow.net',
		signature: '2bLkFbbf…8sRW',
		destination: 'EUvp…qkEq',
		rows: [
			{
				text: 'Create token account for SOL',
				detail: 'rent 0.002039 SOL'
			},
			{
				text: 'Wrap 0.005 SOL'
			},
			{
				text: 'Send 0.000001 SOL to EUvp…qkEq'
			},
			{
				text: 'Swap route via DFlow',
				children: [
					{
						text: 'Send 0.004999 SOL to 71Kt…cL59'
					},
					{
						text: 'Receive 0.119564 TRUMP from Hp5K…ULZb'
					},
					{
						text: 'Send 0.119564 TRUMP to HrYQ…2JLo'
					},
					{
						text: 'Receive 0.989534 USDC from AHRT…7hkG'
					}
				]
			},
			{
				text: 'Unwrap SOL',
				detail: 'rent returned to your wallet'
			}
		],
		preview: {
			tokenDeltas: [
				{
					account: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
					tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
					decimals: 6,
					delta: 989534n
				}
			],
			controlChanges: [],
			solDelta: -5191623n
		},
		rawCount: 24,
		shownCount: 8,
		prioritizationFee: 1600000n
	},
	{
		title: 'DFlow swap: USDC for SOL, four hops',
		dapp: 'app.dflow.net',
		signature: 'GFfJfCJt…17D3',
		destination: '1M45…i7g8',
		rows: [
			{
				text: 'Create token account for JUP',
				detail: 'rent 0.002039 SOL'
			},
			{
				text: 'Swap route via DFlow',
				children: [
					{
						text: 'Send 1 USDC to 1M45…i7g8'
					},
					{
						text: 'Receive 2.073722 JUP from EN7b…rVD4'
					},
					{
						text: 'Send 2.073722 JUP to HXYh…J4dU'
					},
					{
						text: 'Receive 0.000187 Unknown token from HXn5…9Z8f'
					},
					{
						text: 'Send 0.186848 Unknown token to 6vJP…FLR7'
					},
					{
						text: 'Receive 0.005041 SOL from 78XL…XFSs'
					},
					{
						text: 'Send 0.000001 SOL to 39FW…AWdu'
					}
				]
			},
			{
				text: 'Create token account for Unknown token',
				detail: 'rent 0.002039 SOL'
			},
			{
				text: 'Close token account',
				detail: 'rent returned to your wallet'
			},
			{
				text: 'Create token account for SOL',
				detail: 'rent 0.002039 SOL'
			},
			{
				text: 'Close token account',
				detail: 'rent returned to your wallet'
			},
			{
				text: 'Unwrap SOL',
				detail: 'rent returned to your wallet'
			}
		],
		preview: {
			tokenDeltas: [
				{
					account: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
					tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
					decimals: 6,
					delta: -1000000n
				}
			],
			controlChanges: [],
			solDelta: 4750688n
		},
		rawCount: 37,
		shownCount: 13,
		prioritizationFee: 3000000n
	},
	{
		title: 'DFlow swap: SOL for PUMP',
		dapp: 'app.dflow.net',
		signature: '469iBc7F…PgtP',
		destination: '2p29…7nYT',
		rows: [
			{
				text: 'Create token account for SOL',
				detail: 'rent 0.002039 SOL'
			},
			{
				text: 'Wrap 0.001 SOL'
			},
			{
				text: 'Swap route via DFlow',
				children: [
					{
						text: 'Send 0.000001 SOL to 2p29…7nYT'
					},
					{
						text: 'Send 0.000999 SOL to chM5…WQ1T'
					},
					{
						text: 'Receive 0.230271 USDC from FGFa…d7kH'
					},
					{
						text: 'Send 0.230271 USDC to 8cje…Gfxv'
					},
					{
						text: 'Receive 11,054.69204 BONK from 9Mki…9L67'
					},
					{
						text: 'Send 11,054.69204 BONK to AuD6…nrxq'
					},
					{
						text: 'Receive 37.272943 Unknown token from FvRN…r2JD'
					}
				]
			},
			{
				text: 'Unwrap SOL',
				detail: 'rent returned to your wallet'
			},
			{
				text: 'Create token account for Unknown token',
				detail: 'rent 0.002109 SOL'
			}
		],
		preview: {
			tokenDeltas: [
				{
					account: '4Zao69PUPwc16Qf3ddV32hKNU8ATed8a5encUtN7d5Sp',
					tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
					decimals: 6,
					delta: 37272943n
				}
			],
			controlChanges: [],
			solDelta: -3128042n
		},
		rawCount: 32,
		shownCount: 11,
		prioritizationFee: 5600000n
	},
	{
		title: 'Orca split swap: ORCA for USDC',
		dapp: 'orca.so',
		signature: '2FfrR6sA…sm25',
		destination: 'HFqU…7gRe',
		rows: [
			{
				text: 'Send 0.000416 SOL to HFqU…7gRe'
			},
			{
				text: 'Swap route via Orca Whirlpool',
				children: [
					{
						text: 'Send 0.06 ORCA to Az4f…w1MN'
					},
					{
						text: 'Receive 0.051446 USDC from GvVN…ogH2'
					}
				]
			},
			{
				text: 'Swap route via Orca Whirlpool',
				children: [
					{
						text: 'Send 0.02 ORCA to C2rV…DRsy'
					},
					{
						text: 'Receive 0.017439 USDC from 8JEh…Pw4Q'
					}
				]
			},
			{
				text: 'Swap route via Orca Whirlpool',
				children: [
					{
						text: 'Send 0.02 ORCA to B2TJ…7CGV'
					},
					{
						text: 'Receive 0.017217 USDC from FXrv…9AUk'
					}
				]
			}
		],
		preview: {
			tokenDeltas: [
				{
					account: 'BzUMZLRsyV4N4LL18i4NBxD1Gk6hsE5jGhoH4dXo8ErA',
					tokenAddress: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
					decimals: 6,
					delta: -100000n
				},
				{
					account: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
					tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
					decimals: 6,
					delta: 86102n
				}
			],
			controlChanges: [],
			solDelta: -1465472n
		},
		rawCount: 12,
		shownCount: 7,
		prioritizationFee: 415968n
	},
	{
		title: 'Third-party transfer, you are not involved',
		dapp: 'unknown.dapp',
		signature: '4fbHTZhh…YgGr',
		destination: '',
		rows: [],
		preview: {
			tokenDeltas: [],
			controlChanges: []
		},
		rawCount: 5,
		shownCount: 0
	},
	{
		title: 'Plain SOL send',
		dapp: 'phantom.app',
		signature: 'synthetic',
		destination: '7xKX…9mPq',
		rows: [
			{
				text: 'Send 1.5 SOL to 7xKX…9mPq'
			}
		],
		preview: {
			tokenDeltas: [],
			controlChanges: [],
			solDelta: -1500005000n
		},
		rawCount: 2,
		shownCount: 1
	},
	{
		title: 'Approve a spender',
		dapp: 'unknown.dapp',
		signature: 'synthetic',
		destination: '3Fk2…8bWn',
		rows: [
			{
				text: 'Approve spender 3Fk2…8bWn on your USDC account',
				detail: 'unlimited'
			}
		],
		preview: {
			tokenDeltas: [],
			controlChanges: [],
			solDelta: -5000n
		},
		rawCount: 3,
		shownCount: 1
	},
	{
		title: 'Authority handover, dangerous',
		dapp: 'unverified.example',
		signature: 'synthetic',
		destination: 'Hm4T…2zQd',
		rows: [
			{
				text: 'Change account authority on 9aVQ…p1mk',
				detail: 'accountOwner'
			},
			{
				text: 'Send 250 USDC to Hm4T…2zQd'
			}
		],
		preview: {
			tokenDeltas: [
				{
					account: '9aVQ7BhcVYCJZ638jfdHUqt5gPGmjoxbzv3kZTdop1mk',
					tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
					decimals: 6,
					delta: -250000000n
				}
			],
			controlChanges: [
				{
					account: '9aVQ7BhcVYCJZ638jfdHUqt5gPGmjoxbzv3kZTdop1mk',
					field: 'owner',
					to: '583C5XZGrnnsujXKxfiHJYw5DmX6kXNHtTaYEXoZnvMj'
				}
			],
			solDelta: -5000n
		},
		rawCount: 6,
		shownCount: 2
	},
	{
		title: 'Receive only',
		dapp: 'airdrop.example',
		signature: 'synthetic',
		destination: '',
		rows: [
			{
				text: 'Receive 42 USDC from 5LBV…9KCr'
			}
		],
		preview: {
			tokenDeltas: [
				{
					account: '9aVQ7BhcVYCJZ638jfdHUqt5gPGmjoxbzv3kZTdop1mk',
					tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
					decimals: 6,
					delta: 42000000n
				}
			],
			controlChanges: [],
			solDelta: ZERO
		},
		rawCount: 3,
		shownCount: 1
	},
	{
		title: 'Close an empty token account',
		dapp: 'oisy.app',
		signature: 'synthetic',
		destination: '',
		rows: [
			{
				text: 'Close token account',
				detail: 'rent returned to your wallet'
			}
		],
		preview: {
			tokenDeltas: [],
			controlChanges: [],
			solDelta: 2039280n
		},
		rawCount: 2,
		shownCount: 1
	},
	{
		title: 'Two unlisted tokens',
		dapp: 'unverified.example',
		signature: 'synthetic',
		destination: 'HXYh…J4dU',
		rows: [
			{
				text: 'Create token account for Unknown token 1',
				detail: 'rent 0.00203928 SOL'
			},
			{
				text: 'Swap route via Jupiter',
				children: [
					{
						text: 'Send 25 USDC to 1M45…i7g8'
					},
					{
						text: 'Receive 1,204.55 Unknown token 1 from EN7b…rVD4'
					},
					{
						text: 'Send 1,204.55 Unknown token 1 to HXYh…J4dU'
					},
					{
						text: 'Receive 88.21 Unknown token 2 from HXn5…9Z8f'
					}
				]
			}
		],
		preview: {
			tokenDeltas: [],
			controlChanges: [],
			solDelta: -4080000n
		},
		rawCount: 14,
		shownCount: 5,
		prioritizationFee: 3000000n
	}
];
