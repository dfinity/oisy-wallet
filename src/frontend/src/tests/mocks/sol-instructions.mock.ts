// Instruction fixtures captured from mainnet with getTransaction/jsonParsed, trimmed to the fields
// the derivation reads. The shape is the one simulateTransaction reports for its inner
// instructions, which is why one set of fixtures serves both callers.
//
// The owner of every account in ownedAddresses is 5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q,
// except in THIRD_PARTY, where the signer is somebody else entirely.

export const MOCK_SOL_INSTRUCTIONS = {
	SPL_SEND_WITH_ATA: {
		instructions: [
			{
				program: 'spl-associated-token-account',
				programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
				parsed: {
					type: 'create',
					info: {
						account: 'DkngoujigUiRtizQViQPpHUSgJWMg3o3dLVAfj7eEjT2',
						mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
						source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
						systemProgram: '11111111111111111111111111111111',
						tokenProgram: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
						wallet: 'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt'
					}
				}
			},
			{
				program: 'spl-token',
				programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
				parsed: {
					type: 'transferChecked',
					info: {
						authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
						destination: 'DkngoujigUiRtizQViQPpHUSgJWMg3o3dLVAfj7eEjT2',
						mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
						source: '4Zao69PUPwc16Qf3ddV32hKNU8ATed8a5encUtN7d5Sp',
						tokenAmount: {
							amount: '5000000',
							decimals: 6,
							uiAmount: 5.0,
							uiAmountString: '5'
						}
					}
				}
			}
		],
		innerInstructions: [
			{
				index: 0,
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
						parsed: {
							type: 'getAccountDataSize',
							info: {
								extensionTypes: ['immutableOwner'],
								mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn'
							}
						}
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								lamports: 2108880,
								newAccount: 'DkngoujigUiRtizQViQPpHUSgJWMg3o3dLVAfj7eEjT2',
								owner: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
								source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								space: 175
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
						parsed: {
							type: 'initializeImmutableOwner',
							info: {
								account: 'DkngoujigUiRtizQViQPpHUSgJWMg3o3dLVAfj7eEjT2'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
						parsed: {
							type: 'initializeAccount3',
							info: {
								account: 'DkngoujigUiRtizQViQPpHUSgJWMg3o3dLVAfj7eEjT2',
								mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
								owner: 'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt'
							}
						}
					}
				]
			}
		],
		ownedAddresses: [
			'4Zao69PUPwc16Qf3ddV32hKNU8ATed8a5encUtN7d5Sp',
			'5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
		]
	},
	DFLOW_SWAP: {
		instructions: [
			{
				programId: 'ComputeBudget111111111111111111111111111111'
			},
			{
				programId: 'ComputeBudget111111111111111111111111111111'
			},
			{
				programId: 'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH'
			},
			{
				programId: 'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH'
			},
			{
				programId: 'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH'
			}
		],
		innerInstructions: [
			{
				index: 2,
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'create',
							info: {
								account: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
								mint: 'So11111111111111111111111111111111111111112',
								source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								systemProgram: '11111111111111111111111111111111',
								tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								wallet: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'getAccountDataSize',
							info: {
								extensionTypes: ['immutableOwner'],
								mint: 'So11111111111111111111111111111111111111112'
							}
						}
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'createAccount',
							info: {
								lamports: 2039280,
								newAccount: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
								owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
								source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								space: 165
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'initializeImmutableOwner',
							info: {
								account: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'initializeAccount3',
							info: {
								account: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
								mint: 'So11111111111111111111111111111111111111112',
								owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
							}
						}
					},
					{
						program: 'system',
						programId: '11111111111111111111111111111111',
						parsed: {
							type: 'transfer',
							info: {
								destination: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
								lamports: 5000000,
								source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'syncNative',
							info: {
								account: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g'
							}
						}
					}
				]
			},
			{
				index: 3,
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '1000',
								authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								destination: 'EUvpCGh4qiMtq9wKgp28f9Bjv5Xz2WJqrM83XmYAqkEq',
								source: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g'
							}
						}
					},
					{
						programId: 'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH'
					}
				]
			},
			{
				index: 4,
				instructions: [
					{
						programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transferChecked',
							info: {
								authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								destination: '71KtbjVeGBbB8VAsniAoFw59sZ2EWgwqj3r1rLLccL59',
								mint: 'So11111111111111111111111111111111111111112',
								source: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
								tokenAmount: {
									amount: '4999000',
									decimals: 9,
									uiAmount: 0.004999,
									uiAmountString: '0.004999'
								}
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transferChecked',
							info: {
								authority: '71HuFmuYAFEFUna2x2R4HJjrFNQHGuagW3gUMFToL9tk',
								destination: '4ZqAVpgtTgPn6nX2FSVYBWhqYLaNpNweTiJqw6S5kHBE',
								mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
								source: 'Hp5K2KWRoF2LXDsYQaoE18VheQKPrsLQ9dzNELzPULZb',
								tokenAmount: {
									amount: '119564',
									decimals: 6,
									uiAmount: 0.119564,
									uiAmountString: '0.119564'
								}
							}
						}
					},
					{
						programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
					},
					{
						programId: 'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH'
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: {
								account: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
								destination: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
							}
						}
					},
					{
						programId: 'SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe'
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '119564',
								authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								destination: 'HrYQMvm9ZSmnuQL1QKBqW3rzghikpVFgfD1ZHYw22JLo',
								source: '4ZqAVpgtTgPn6nX2FSVYBWhqYLaNpNweTiJqw6S5kHBE'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '989534',
								authority: '3AbG3ZA19fJKjTSTMTCz7j2bodPagXog4PwTBi8H7UA4',
								destination: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
								source: 'AHRTN52eBDEjMgJuLaTBUU6MkT5i9i6KMdGop8Fi7hkG'
							}
						}
					},
					{
						programId: 'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH'
					}
				]
			}
		],
		ownedAddresses: [
			'4ZqAVpgtTgPn6nX2FSVYBWhqYLaNpNweTiJqw6S5kHBE',
			'5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
			'6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU'
		]
	},
	ORCA_SPLIT_SWAP: {
		instructions: [
			{
				programId: 'ComputeBudget111111111111111111111111111111'
			},
			{
				programId: 'ComputeBudget111111111111111111111111111111'
			},
			{
				program: 'system',
				programId: '11111111111111111111111111111111',
				parsed: {
					type: 'transfer',
					info: {
						destination: 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
						lamports: 415968,
						source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
					}
				}
			},
			{
				programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'
			},
			{
				programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'
			},
			{
				programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'
			}
		],
		innerInstructions: [
			{
				index: 3,
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '60000',
								authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								destination: 'Az4ffYXiuabLBwZE1b2fDjUp8wVsecnkq1ZZpCviw1MN',
								source: 'BzUMZLRsyV4N4LL18i4NBxD1Gk6hsE5jGhoH4dXo8ErA'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '51446',
								authority: 'HPfnh4HfhGdeCYu2AKpRaSS51B8fXRsiwpKpvn8GGMQd',
								destination: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
								source: 'GvVNVHZ51X32G2M48rWqq6nt4xnQLDKFJcxxLuJ4ogH2'
							}
						}
					}
				]
			},
			{
				index: 4,
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '20000',
								authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								destination: 'C2rVTK2Mgh4tTHP9BBQa5LkXPdJRtEYZvDW6J5acDRsy',
								source: 'BzUMZLRsyV4N4LL18i4NBxD1Gk6hsE5jGhoH4dXo8ErA'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '17439',
								authority: '44tKVj3WJcFprFaWMRepaLqE5maq17aU8oYLU498qyph',
								destination: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
								source: '8JEhgGWzi9hZSnpjd2t35UpG1paCR5r8TdQw7KdHPw4Q'
							}
						}
					}
				]
			},
			{
				index: 5,
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '20000',
								authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								destination: 'B2TJHfnXyTtBgtTkMEKh89jgf2aCU8KKWK7YrLtD7CGV',
								source: 'BzUMZLRsyV4N4LL18i4NBxD1Gk6hsE5jGhoH4dXo8ErA'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '17217',
								authority: '7GMw2bx7R746abizbG1cJAgwyiBxo7ojAsadcrq5q1x6',
								destination: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
								source: 'FXrvbHmREbQ9LTXscXrMv2xrosp4CQdf9fTDtZzq9AUk'
							}
						}
					}
				]
			}
		],
		ownedAddresses: [
			'5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
			'6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
			'BzUMZLRsyV4N4LL18i4NBxD1Gk6hsE5jGhoH4dXo8ErA'
		]
	},
	THIRD_PARTY: {
		instructions: [
			{
				program: 'system',
				programId: '11111111111111111111111111111111',
				parsed: {
					type: 'createAccount',
					info: {
						lamports: 2039280,
						newAccount: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
						owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						source: 'D9oBner23tpd8kApyqMQPi9R2QquFG91hZm5Hc4wQUHF',
						space: 165
					}
				}
			},
			{
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed: {
					type: 'initializeAccount',
					info: {
						account: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
						mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
						owner: 'D9oBner23tpd8kApyqMQPi9R2QquFG91hZm5Hc4wQUHF',
						rentSysvar: 'SysvarRent111111111111111111111111111111111'
					}
				}
			},
			{
				program: 'spl-token',
				programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
				parsed: {
					type: 'transferChecked',
					info: {
						authority: 'D9oBner23tpd8kApyqMQPi9R2QquFG91hZm5Hc4wQUHF',
						destination: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
						mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
						source: '5LBVmhhmyosDDjY3bpvpWzXmK74ZFD19BnWqLQYA9KCr',
						tokenAmount: {
							amount: '10000000',
							decimals: 6,
							uiAmount: 10.0,
							uiAmountString: '10'
						}
					}
				}
			},
			{
				programId: 'C3u1cTJGKP5XzPCvLgQydGWE7aR3x3o5KL8YooFfY4RN'
			}
		],
		innerInstructions: [
			{
				index: 3,
				instructions: [
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'setAuthority',
							info: {
								account: 'DgdHwEGCLtmQxxh1NbUzDVjbj2mYMY8RoxF83BRHPmSe',
								authorityType: 'accountOwner',
								multisigAuthority: 'D9oBner23tpd8kApyqMQPi9R2QquFG91hZm5Hc4wQUHF',
								newAuthority: '583C5XZGrnnsujXKxfiHJYw5DmX6kXNHtTaYEXoZnvMj',
								signers: ['D9oBner23tpd8kApyqMQPi9R2QquFG91hZm5Hc4wQUHF']
							}
						}
					}
				]
			}
		],
		ownedAddresses: ['5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q']
	}
};
