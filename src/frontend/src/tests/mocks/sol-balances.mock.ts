// Balance metadata captured from the same mainnet transactions as sol-instructions.mock.ts,
// trimmed to the fields the net-changes derivation reads. accountKeys include the addresses the
// lookup tables loaded, since pre/postBalances index into the combined list.

import { ZERO } from '$lib/constants/app.constants';
export const MOCK_SOL_BALANCES = {
	SPL_SEND_WITH_ATA: {
		fee: 5000n,
		feePayer: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
		accountKeys: [
			{
				pubkey: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
			},
			{
				pubkey: '4Zao69PUPwc16Qf3ddV32hKNU8ATed8a5encUtN7d5Sp'
			},
			{
				pubkey: 'DkngoujigUiRtizQViQPpHUSgJWMg3o3dLVAfj7eEjT2'
			},
			{
				pubkey: '11111111111111111111111111111111'
			},
			{
				pubkey: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
			},
			{
				pubkey: 'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt'
			},
			{
				pubkey: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn'
			},
			{
				pubkey: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
			}
		],
		preBalances: [11057476n, 2108880n, ZERO, 1n, 789146954n, 145350908n, 7122625707n, 1151489n],
		postBalances: [8943596n, 2108880n, 2108880n, 1n, 789146954n, 145350908n, 7122625707n, 1151489n],
		preTokenBalances: [
			{
				accountIndex: 1,
				mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '37272943',
					decimals: 6
				}
			}
		],
		postTokenBalances: [
			{
				accountIndex: 1,
				mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '32272943',
					decimals: 6
				}
			},
			{
				accountIndex: 2,
				mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
				owner: 'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt',
				uiTokenAmount: {
					amount: '5000000',
					decimals: 6
				}
			}
		]
	},
	DFLOW_SWAP: {
		fee: 191623n,
		feePayer: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
		accountKeys: [
			{
				pubkey: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
			},
			{
				pubkey: '4ZqAVpgtTgPn6nX2FSVYBWhqYLaNpNweTiJqw6S5kHBE'
			},
			{
				pubkey: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU'
			},
			{
				pubkey: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g'
			},
			{
				pubkey: 'EUvpCGh4qiMtq9wKgp28f9Bjv5Xz2WJqrM83XmYAqkEq'
			},
			{
				pubkey: 'Kb4FAmxyFjuPPVQxpkXzyGySnRox5t738TAFrPPQAkQ'
			},
			{
				pubkey: 'BssDJevchCpZogHdANhMnftNB9Ggzi7iTzvk5r7HJkFr'
			},
			{
				pubkey: 'ComputeBudget111111111111111111111111111111'
			},
			{
				pubkey: 'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH'
			},
			{
				pubkey: 'jitodontfront11111111111JustUseJupiterU1tra'
			},
			{
				pubkey: '3AbG3ZA19fJKjTSTMTCz7j2bodPagXog4PwTBi8H7UA4'
			},
			{
				pubkey: 'AHRTN52eBDEjMgJuLaTBUU6MkT5i9i6KMdGop8Fi7hkG'
			},
			{
				pubkey: 'HrYQMvm9ZSmnuQL1QKBqW3rzghikpVFgfD1ZHYw22JLo'
			},
			{
				pubkey: '71HuFmuYAFEFUna2x2R4HJjrFNQHGuagW3gUMFToL9tk'
			},
			{
				pubkey: '71KtbjVeGBbB8VAsniAoFw59sZ2EWgwqj3r1rLLccL59'
			},
			{
				pubkey: '7fb3hkzhroueZsxWtYnAfmMZ9o9RfMPoX6uWu4vFaKxt'
			},
			{
				pubkey: 'Hp5K2KWRoF2LXDsYQaoE18VheQKPrsLQ9dzNELzPULZb'
			},
			{
				pubkey: '11111111111111111111111111111111'
			},
			{
				pubkey: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN'
			},
			{
				pubkey: '8xeaWCsJYxRoudEZGJWURdfrtFhLYZz9b4iHJnW5tb3d'
			},
			{
				pubkey: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
			},
			{
				pubkey: 'D1ZN9Wj1fRSUQfCjhvnu1hqDMT7hzjzBBpi12nVniYD6'
			},
			{
				pubkey: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
			},
			{
				pubkey: 'So11111111111111111111111111111111111111112'
			},
			{
				pubkey: 'SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe'
			},
			{
				pubkey: 'Sysvar1nstructions1111111111111111111111111'
			},
			{
				pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
			},
			{
				pubkey: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
			}
		],
		preBalances: [
			39721097n,
			2039280n,
			2039280n,
			ZERO,
			5443335192n,
			71437440n,
			11859840n,
			1n,
			1145440n,
			1000000n,
			22426796n,
			2039280n,
			2039280n,
			10098322n,
			102916489124n,
			23385600n,
			2039280n,
			1n,
			1347891941537n,
			1004000n,
			747831958n,
			4000410n,
			32941449n,
			1127984193242n,
			1141546n,
			ZERO,
			4674972223n,
			1141452n
		],
		postBalances: [
			34529474n,
			2039280n,
			2039280n,
			ZERO,
			5443336192n,
			71437440n,
			11859840n,
			1n,
			1145440n,
			1000000n,
			22426796n,
			2039280n,
			2039280n,
			10098322n,
			102921488124n,
			23385600n,
			2039280n,
			1n,
			1347891941537n,
			1004000n,
			747831958n,
			4000410n,
			32941449n,
			1127984193242n,
			1141546n,
			ZERO,
			4674972223n,
			1141452n
		],
		preTokenBalances: [
			{
				accountIndex: 1,
				mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '200303',
					decimals: 6
				}
			},
			{
				accountIndex: 2,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '675021',
					decimals: 6
				}
			},
			{
				accountIndex: 4,
				mint: 'So11111111111111111111111111111111111111112',
				owner: 'DSN3j1ykL3obAVNv7ZX49VsFCPe4LqzxHnmtLiPwY6xg',
				uiTokenAmount: {
					amount: '5441292707',
					decimals: 9
				}
			},
			{
				accountIndex: 11,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '3AbG3ZA19fJKjTSTMTCz7j2bodPagXog4PwTBi8H7UA4',
				uiTokenAmount: {
					amount: '192407272970',
					decimals: 6
				}
			},
			{
				accountIndex: 12,
				mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
				owner: '3AbG3ZA19fJKjTSTMTCz7j2bodPagXog4PwTBi8H7UA4',
				uiTokenAmount: {
					amount: '21402065016',
					decimals: 6
				}
			},
			{
				accountIndex: 14,
				mint: 'So11111111111111111111111111111111111111112',
				owner: '71HuFmuYAFEFUna2x2R4HJjrFNQHGuagW3gUMFToL9tk',
				uiTokenAmount: {
					amount: '102914448842',
					decimals: 9
				}
			},
			{
				accountIndex: 16,
				mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
				owner: '71HuFmuYAFEFUna2x2R4HJjrFNQHGuagW3gUMFToL9tk',
				uiTokenAmount: {
					amount: '15962101861',
					decimals: 6
				}
			}
		],
		postTokenBalances: [
			{
				accountIndex: 1,
				mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '200303',
					decimals: 6
				}
			},
			{
				accountIndex: 2,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '1664555',
					decimals: 6
				}
			},
			{
				accountIndex: 4,
				mint: 'So11111111111111111111111111111111111111112',
				owner: 'DSN3j1ykL3obAVNv7ZX49VsFCPe4LqzxHnmtLiPwY6xg',
				uiTokenAmount: {
					amount: '5441293707',
					decimals: 9
				}
			},
			{
				accountIndex: 11,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '3AbG3ZA19fJKjTSTMTCz7j2bodPagXog4PwTBi8H7UA4',
				uiTokenAmount: {
					amount: '192406283436',
					decimals: 6
				}
			},
			{
				accountIndex: 12,
				mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
				owner: '3AbG3ZA19fJKjTSTMTCz7j2bodPagXog4PwTBi8H7UA4',
				uiTokenAmount: {
					amount: '21402184580',
					decimals: 6
				}
			},
			{
				accountIndex: 14,
				mint: 'So11111111111111111111111111111111111111112',
				owner: '71HuFmuYAFEFUna2x2R4HJjrFNQHGuagW3gUMFToL9tk',
				uiTokenAmount: {
					amount: '102919447842',
					decimals: 9
				}
			},
			{
				accountIndex: 16,
				mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
				owner: '71HuFmuYAFEFUna2x2R4HJjrFNQHGuagW3gUMFToL9tk',
				uiTokenAmount: {
					amount: '15961982297',
					decimals: 6
				}
			}
		]
	},
	ORCA_SPLIT_SWAP: {
		fee: 1049504n,
		feePayer: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
		accountKeys: [
			{
				pubkey: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
			},
			{
				pubkey: 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe'
			},
			{
				pubkey: 'BzUMZLRsyV4N4LL18i4NBxD1Gk6hsE5jGhoH4dXo8ErA'
			},
			{
				pubkey: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU'
			},
			{
				pubkey: '44tKVj3WJcFprFaWMRepaLqE5maq17aU8oYLU498qyph'
			},
			{
				pubkey: 'C2rVTK2Mgh4tTHP9BBQa5LkXPdJRtEYZvDW6J5acDRsy'
			},
			{
				pubkey: '8JEhgGWzi9hZSnpjd2t35UpG1paCR5r8TdQw7KdHPw4Q'
			},
			{
				pubkey: '4tV7YbXiUfGjNgpQznRqjMhPxkdSjndrEUuAp9dsgnR4'
			},
			{
				pubkey: '6kHAnBTaXPYtFWe9siQWhbEbdT7k4E5WMzoNkTAV6TyZ'
			},
			{
				pubkey: '7GMw2bx7R746abizbG1cJAgwyiBxo7ojAsadcrq5q1x6'
			},
			{
				pubkey: 'B2TJHfnXyTtBgtTkMEKh89jgf2aCU8KKWK7YrLtD7CGV'
			},
			{
				pubkey: 'FXrvbHmREbQ9LTXscXrMv2xrosp4CQdf9fTDtZzq9AUk'
			},
			{
				pubkey: '5xgsPFACixf3FnUZBjHCtoh9D4Z7TjBVum8sJKnK6fvU'
			},
			{
				pubkey: '5mP2h3AV1BLut3hndkgmPSjy8iyyw8SjyHvLYEUqn92K'
			},
			{
				pubkey: 'BZU8X9qxtKEM6vZviR7ofhypeehRkzU9P42iY1autp96'
			},
			{
				pubkey: 'FH7ZHwwSZSK94cNYYuhVjBgzypZsREJky732pzSv3V7A'
			},
			{
				pubkey: 'ComputeBudget111111111111111111111111111111'
			},
			{
				pubkey: '11111111111111111111111111111111'
			},
			{
				pubkey: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'
			},
			{
				pubkey: 'HPfnh4HfhGdeCYu2AKpRaSS51B8fXRsiwpKpvn8GGMQd'
			},
			{
				pubkey: 'Az4ffYXiuabLBwZE1b2fDjUp8wVsecnkq1ZZpCviw1MN'
			},
			{
				pubkey: 'GvVNVHZ51X32G2M48rWqq6nt4xnQLDKFJcxxLuJ4ogH2'
			},
			{
				pubkey: '3Rbdxi3jXqR1BvvvdNtcURkbq6NXH2cPVHxs1Sq1cJfq'
			},
			{
				pubkey: '8dmDuu2XYsWUyBg1GLVALNTeMGgWERmhPzFXMYCgLxFL'
			},
			{
				pubkey: '3K8B6uxKpTb6noqXeemYhrNYH9NqU3qswNZcVAiH5GW7'
			},
			{
				pubkey: '25rU5wprEJofMhzwqH4MtdAE77w7wNS2Df5E43M9oDa1'
			},
			{
				pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
			}
		],
		preBalances: [
			5105379n,
			1337674n,
			2039280n,
			2039280n,
			5435817n,
			2039280n,
			2039280n,
			70407360n,
			2658720n,
			5435807n,
			2039280n,
			2039280n,
			70407360n,
			70407360n,
			ZERO,
			ZERO,
			1n,
			1n,
			8205554n,
			5435995n,
			2039280n,
			2039280n,
			ZERO,
			ZERO,
			2700480n,
			2658720n,
			5567761586n
		],
		postBalances: [
			3639907n,
			1753642n,
			2039280n,
			2039280n,
			5435817n,
			2039280n,
			2039280n,
			70407360n,
			2658720n,
			5435807n,
			2039280n,
			2039280n,
			70407360n,
			70407360n,
			ZERO,
			ZERO,
			1n,
			1n,
			8205554n,
			5435995n,
			2039280n,
			2039280n,
			ZERO,
			ZERO,
			2700480n,
			2658720n,
			5567761586n
		],
		preTokenBalances: [
			{
				accountIndex: 2,
				mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '519066',
					decimals: 6
				}
			},
			{
				accountIndex: 3,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '1900000',
					decimals: 6
				}
			},
			{
				accountIndex: 5,
				mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
				owner: '44tKVj3WJcFprFaWMRepaLqE5maq17aU8oYLU498qyph',
				uiTokenAmount: {
					amount: '2688871',
					decimals: 6
				}
			},
			{
				accountIndex: 6,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '44tKVj3WJcFprFaWMRepaLqE5maq17aU8oYLU498qyph',
				uiTokenAmount: {
					amount: '2445522',
					decimals: 6
				}
			},
			{
				accountIndex: 10,
				mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
				owner: '7GMw2bx7R746abizbG1cJAgwyiBxo7ojAsadcrq5q1x6',
				uiTokenAmount: {
					amount: '38406367',
					decimals: 6
				}
			},
			{
				accountIndex: 11,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '7GMw2bx7R746abizbG1cJAgwyiBxo7ojAsadcrq5q1x6',
				uiTokenAmount: {
					amount: '2350090',
					decimals: 6
				}
			},
			{
				accountIndex: 20,
				mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
				owner: 'HPfnh4HfhGdeCYu2AKpRaSS51B8fXRsiwpKpvn8GGMQd',
				uiTokenAmount: {
					amount: '247141316',
					decimals: 6
				}
			},
			{
				accountIndex: 21,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: 'HPfnh4HfhGdeCYu2AKpRaSS51B8fXRsiwpKpvn8GGMQd',
				uiTokenAmount: {
					amount: '86589166',
					decimals: 6
				}
			}
		],
		postTokenBalances: [
			{
				accountIndex: 2,
				mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '419066',
					decimals: 6
				}
			},
			{
				accountIndex: 3,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '1986102',
					decimals: 6
				}
			},
			{
				accountIndex: 5,
				mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
				owner: '44tKVj3WJcFprFaWMRepaLqE5maq17aU8oYLU498qyph',
				uiTokenAmount: {
					amount: '2708871',
					decimals: 6
				}
			},
			{
				accountIndex: 6,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '44tKVj3WJcFprFaWMRepaLqE5maq17aU8oYLU498qyph',
				uiTokenAmount: {
					amount: '2428083',
					decimals: 6
				}
			},
			{
				accountIndex: 10,
				mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
				owner: '7GMw2bx7R746abizbG1cJAgwyiBxo7ojAsadcrq5q1x6',
				uiTokenAmount: {
					amount: '38426367',
					decimals: 6
				}
			},
			{
				accountIndex: 11,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '7GMw2bx7R746abizbG1cJAgwyiBxo7ojAsadcrq5q1x6',
				uiTokenAmount: {
					amount: '2332873',
					decimals: 6
				}
			},
			{
				accountIndex: 20,
				mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
				owner: 'HPfnh4HfhGdeCYu2AKpRaSS51B8fXRsiwpKpvn8GGMQd',
				uiTokenAmount: {
					amount: '247201316',
					decimals: 6
				}
			},
			{
				accountIndex: 21,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: 'HPfnh4HfhGdeCYu2AKpRaSS51B8fXRsiwpKpvn8GGMQd',
				uiTokenAmount: {
					amount: '86537720',
					decimals: 6
				}
			}
		]
	},
	THIRD_PARTY: {
		fee: 10000n,
		feePayer: 'D9oBner23tpd8kApyqMQPi9R2QquFG91hZm5Hc4wQUHF',
		accountKeys: [
			{
				pubkey: 'D9oBner23tpd8kApyqMQPi9R2QquFG91hZm5Hc4wQUHF'
			},
			{
				pubkey: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe'
			},
			{
				pubkey: '5LBVmhhmyosDDjY3bpvpWzXmK74ZFD19BnWqLQYA9KCr'
			},
			{
				pubkey: '8qzmVmW8XTzhvdtTuqphKKxvQ9Tzgyu3kqG28HRb8ght'
			},
			{
				pubkey: '11111111111111111111111111111111'
			},
			{
				pubkey: 'C3u1cTJGKP5XzPCvLgQydGWE7aR3x3o5KL8YooFfY4RN'
			},
			{
				pubkey: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
			},
			{
				pubkey: 'SysvarRent111111111111111111111111111111111'
			},
			{
				pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
			}
		],
		preBalances: [
			667604752n,
			ZERO,
			2039280n,
			10634880n,
			1n,
			1398960n,
			526898827259n,
			1009200n,
			192795783n
		],
		postBalances: [
			665555472n,
			2039280n,
			2039280n,
			10634880n,
			1n,
			1398960n,
			526898827259n,
			1009200n,
			192795783n
		],
		preTokenBalances: [
			{
				accountIndex: 2,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: 'D9oBner23tpd8kApyqMQPi9R2QquFG91hZm5Hc4wQUHF',
				uiTokenAmount: {
					amount: '1765054924',
					decimals: 6
				}
			}
		],
		postTokenBalances: [
			{
				accountIndex: 1,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '583C5XZGrnnsujXKxfiHJYw5DmX6kXNHtTaYEXoZnvMj',
				uiTokenAmount: {
					amount: '10000000',
					decimals: 6
				}
			},
			{
				accountIndex: 2,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: 'D9oBner23tpd8kApyqMQPi9R2QquFG91hZm5Hc4wQUHF',
				uiTokenAmount: {
					amount: '1755054924',
					decimals: 6
				}
			}
		]
	},
	JUPITER_SWAP: {
		fee: 20001n,
		feePayer: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
		accountKeys: [
			{
				pubkey: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
			},
			{
				pubkey: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU'
			},
			{
				pubkey: 'GT6GWjdd5dPXyo8tiJj28JZovtqrxhZWHj2sbAo7cHeA'
			},
			{
				pubkey: '4paFJ5zxavLQXbFPU6j6B42abU5muxfKW9QTtJSowf6L'
			},
			{
				pubkey: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
			},
			{
				pubkey: 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn'
			},
			{
				pubkey: 'JDjMV39P7qWbxxQQszSA2xK3igFWFjmvr6niFQx2nJkn'
			},
			{
				pubkey: 'FrUPjQqfDbaFcRaoXFP54wcKHr3dTfTZGxjawwAVKQzG'
			},
			{
				pubkey: '9GJGvbccctS6DU43mCX82eSJ4VMcq4YeJdf3s1i3M8t9'
			},
			{
				pubkey: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
			},
			{
				pubkey: 'Gex2NJRS3jVLPfbzSFM5d5DRsNoL5ynnwT1TXoDEhanz'
			},
			{
				pubkey: '5nhqGo1n4SXNxUemLcSktsD2ewhH3TDij2dUDSC67iSE'
			},
			{
				pubkey: 'VY7xh2Mn3m1ixSihWE73UZw7bceb1ucYfz4t17YKvbK'
			},
			{
				pubkey: 'A9Y89UEQYuiN3mZNNkKqeEfCQPj4yvNPoMyGNNmi8mBF'
			},
			{
				pubkey: 'FaNwZ1McDHPLwHeuQDsK43yqavdwH7wMT9kcXJaP82Xr'
			},
			{
				pubkey: 'Gi7PgDKXyBVKsFye3LUFCV8uhuGFPiYX5GHc36XGYdmA'
			},
			{
				pubkey: 'FvG5ZqQs1NBNSPSvdvENMTVDy6uXv7zXmEz8UXnc9Kaw'
			},
			{
				pubkey: '7MS5biMQCacHrCiJ3z8ovfM15xHUG4JYYPsnwqxJ69vP'
			},
			{
				pubkey: 'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS'
			},
			{
				pubkey: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'
			},
			{
				pubkey: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
			},
			{
				pubkey: 'ComputeBudget111111111111111111111111111111'
			},
			{
				pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
			},
			{
				pubkey: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
			},
			{
				pubkey: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
			},
			{
				pubkey: '11111111111111111111111111111111'
			},
			{
				pubkey: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
			},
			{
				pubkey: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'
			}
		],
		preBalances: [
			6819686n,
			2039280n,
			2039280n,
			ZERO,
			418880688354n,
			3499039240n,
			6124800n,
			2039280n,
			2039280n,
			346395595755n,
			1705201n,
			11637120n,
			2039280n,
			2039280n,
			32092560n,
			13641600n,
			72161280n,
			72161280n,
			1269941444n,
			32335376862n,
			521498895n,
			1n,
			5289313643n,
			1151489n,
			789146954n,
			1n,
			2817789979n,
			1844545650n
		],
		postBalances: [
			6799685n,
			2039280n,
			2039280n,
			ZERO,
			418880688354n,
			3499039240n,
			6124800n,
			2039280n,
			2039280n,
			346395595755n,
			1705201n,
			11637120n,
			2039280n,
			2039280n,
			32092560n,
			13641600n,
			72161280n,
			72161280n,
			1269941444n,
			32335376862n,
			521498895n,
			1n,
			5289313643n,
			1151489n,
			789146954n,
			1n,
			2817789979n,
			1844545650n
		],
		preTokenBalances: [
			{
				accountIndex: 1,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '2457858',
					decimals: 6
				}
			},
			{
				accountIndex: 2,
				mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '87786',
					decimals: 6
				}
			},
			{
				accountIndex: 7,
				mint: 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn',
				owner: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
				uiTokenAmount: {
					amount: '1200333465326992',
					decimals: 9
				}
			},
			{
				accountIndex: 8,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
				uiTokenAmount: {
					amount: '93111869',
					decimals: 6
				}
			},
			{
				accountIndex: 12,
				mint: 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn',
				owner: '5nhqGo1n4SXNxUemLcSktsD2ewhH3TDij2dUDSC67iSE',
				uiTokenAmount: {
					amount: '14367685864631033',
					decimals: 9
				}
			},
			{
				accountIndex: 13,
				mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
				owner: '5nhqGo1n4SXNxUemLcSktsD2ewhH3TDij2dUDSC67iSE',
				uiTokenAmount: {
					amount: '78822857',
					decimals: 6
				}
			}
		],
		postTokenBalances: [
			{
				accountIndex: 1,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '2334858',
					decimals: 6
				}
			},
			{
				accountIndex: 2,
				mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
				owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				uiTokenAmount: {
					amount: '133885',
					decimals: 6
				}
			},
			{
				accountIndex: 7,
				mint: 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn',
				owner: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
				uiTokenAmount: {
					amount: '1198753886767837',
					decimals: 9
				}
			},
			{
				accountIndex: 8,
				mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				owner: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
				uiTokenAmount: {
					amount: '93234869',
					decimals: 6
				}
			},
			{
				accountIndex: 12,
				mint: 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn',
				owner: '5nhqGo1n4SXNxUemLcSktsD2ewhH3TDij2dUDSC67iSE',
				uiTokenAmount: {
					amount: '14369265443190188',
					decimals: 9
				}
			},
			{
				accountIndex: 13,
				mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
				owner: '5nhqGo1n4SXNxUemLcSktsD2ewhH3TDij2dUDSC67iSE',
				uiTokenAmount: {
					amount: '78776758',
					decimals: 6
				}
			}
		]
	}
};
