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
		userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
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
		userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
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
		userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
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
		userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
		ownedAddresses: ['5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q']
	},
	JUPITER_SWAP: {
		instructions: [
			{
				programId: 'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS'
			},
			{
				programId: 'ComputeBudget111111111111111111111111111111'
			},
			{
				programId: 'ComputeBudget111111111111111111111111111111'
			}
		],
		innerInstructions: [
			{
				index: 0,
				instructions: [
					{
						program: 'spl-associated-token-account',
						programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
						parsed: {
							type: 'create',
							info: {
								account: '4paFJ5zxavLQXbFPU6j6B42abU5muxfKW9QTtJSowf6L',
								mint: 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn',
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
								mint: 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn'
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
								newAccount: '4paFJ5zxavLQXbFPU6j6B42abU5muxfKW9QTtJSowf6L',
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
								account: '4paFJ5zxavLQXbFPU6j6B42abU5muxfKW9QTtJSowf6L'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'initializeAccount3',
							info: {
								account: '4paFJ5zxavLQXbFPU6j6B42abU5muxfKW9QTtJSowf6L',
								mint: 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn',
								owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
							}
						}
					},
					{
						programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '123000',
								authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								destination: '9GJGvbccctS6DU43mCX82eSJ4VMcq4YeJdf3s1i3M8t9',
								source: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU'
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transfer',
							info: {
								amount: '1579578559155',
								authority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
								destination: '4paFJ5zxavLQXbFPU6j6B42abU5muxfKW9QTtJSowf6L',
								source: 'FrUPjQqfDbaFcRaoXFP54wcKHr3dTfTZGxjawwAVKQzG'
							}
						}
					},
					{
						programId: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'transferChecked',
							info: {
								authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								destination: 'VY7xh2Mn3m1ixSihWE73UZw7bceb1ucYfz4t17YKvbK',
								mint: 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn',
								source: '4paFJ5zxavLQXbFPU6j6B42abU5muxfKW9QTtJSowf6L',
								tokenAmount: {
									amount: '1579578559155',
									decimals: 9,
									uiAmount: 1579.578559155,
									uiAmountString: '1579.578559155'
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
								authority: '5nhqGo1n4SXNxUemLcSktsD2ewhH3TDij2dUDSC67iSE',
								destination: 'GT6GWjdd5dPXyo8tiJj28JZovtqrxhZWHj2sbAo7cHeA',
								mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
								source: 'A9Y89UEQYuiN3mZNNkKqeEfCQPj4yvNPoMyGNNmi8mBF',
								tokenAmount: {
									amount: '46099',
									decimals: 6,
									uiAmount: 0.046099,
									uiAmountString: '0.046099'
								}
							}
						}
					},
					{
						program: 'spl-token',
						programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
						parsed: {
							type: 'closeAccount',
							info: {
								account: '4paFJ5zxavLQXbFPU6j6B42abU5muxfKW9QTtJSowf6L',
								destination: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
								owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
							}
						}
					}
				]
			}
		],
		userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
		ownedAddresses: [
			'5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
			'6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
			'GT6GWjdd5dPXyo8tiJj28JZovtqrxhZWHj2sbAo7cHeA'
		]
	}
};

// A Meteora DLMM position opened over WalletConnect: the request exactly as the application sent
// it, and the inner instructions a simulated run of it reported. The first lb_clmm instruction
// opens the position account, its rent paid from the wallet, and makes no other call that
// concerns the user; the second deposits USDC and wrapped SOL into the pool.
export const MOCK_SOL_METEORA_DLMM_OPEN_POSITION = {
	transaction:
		'AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASaQocPBgaFLexfADjWPaxZWX4EVZK8kSPEybPLCQTb8IhtvJps6JF7AQ1agZGSwYcXJsDG7m+hQfUJIuhi7AFAgAJEj6451dEe1GZG6AftZinBXKwoafasLPV+Y8/vWga6qO/mjeaVistmv0LBQwM+Gqpa6uZ8hfP72LD13cciDX/wJ4nDfZnHkZvfksQ8UG5KAxbmhqBX1FiZm21ICE3eiEB3VhW9aFj5UxLpJ6sxFYDmGJPfjwb2WNdxG9gumxCehlZh/20wIIQbSvfcCMzied91rUEGeajrBrqwlHv7uk1lxuWeQ8nlWqqDPJkuS49dxG1InR/ZkrI7v3BtIZZxeJKapyowiOWEMiCpFb6nKegELEKyB6z8b9J4iZyAVbmI6kn72NPwVLBs6NLUKYMOpMOHWJNUcb2FqrB4idJI9QB2P30BD/6pj6JN8bWYJfF+xXcLnuTy5v6cWfcjZwgwIS89wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+FkDBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAALJw1n+pjFHPAhMFE1iWK681dCvtWcnZRF6cDQyFx82Rxvp6877brTo9ZfNqq8l0MbG75MLS9uDkfKYCA0UvXWEE6eEvvIToJskyzOniZAzOFVkMHGJzsJJXCLo7hSCwvAabiFf+q4GE+2h/Y0YYwDXaxDncGus7VZig8AAAAAABBqfVFxksXFEhjMlMPUrxf1ja7gibof1E49vZigAAAAAG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqUe+NSke5hnwzyw6D83RdnLXsBJNIi+wRVxPsPQeDaNBCAsABQK9/gcADggAAQgACRAMDhDbwOpHvr9mUDwpAABFAAAACgYABgAPCREBAQkCAAYMAgAAAB5dDAAAAAAAEQEGAREOEAEIDgMGBQQNDwAREQwOAgdxA92V2m+NdtWghgEAAAAAAB5dDAAAAAAAXikAAAoAAAA8KQAAgCkAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAQARAwYAAAEJCwAJA4MPAQAAAAAA',
	innerInstructions: [
		{
			index: 1,
			instructions: [
				{
					program: 'system',
					programId: '11111111111111111111111111111111',
					parsed: {
						info: {
							lamports: 41899840,
							newAccount: 'BNzxjYNsUyyUyJgds2qYqtpThcd6FPnucFKXfWGzweDK',
							owner: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
							source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
							space: 8120
						},
						type: 'createAccount'
					}
				},
				{
					programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
				}
			]
		},
		{
			index: 2,
			instructions: [
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							extensionTypes: ['immutableOwner'],
							mint: 'So11111111111111111111111111111111111111112'
						},
						type: 'getAccountDataSize'
					}
				},
				{
					program: 'system',
					programId: '11111111111111111111111111111111',
					parsed: {
						info: {
							lamports: 1488440,
							newAccount: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
							owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
							source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
							space: 165
						},
						type: 'createAccount'
					}
				},
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							account: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g'
						},
						type: 'initializeImmutableOwner'
					}
				},
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							account: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
							mint: 'So11111111111111111111111111111111111111112',
							owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
						},
						type: 'initializeAccount3'
					}
				}
			]
		},
		{
			index: 5,
			instructions: [
				{
					programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
				},
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
							destination: 'B8PDmBxT3hup5yEGD4jZ6CRFCXuu5Q8YvAeKRfag3SzV',
							mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
							source: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
							tokenAmount: {
								amount: '99982',
								decimals: 6,
								uiAmount: 0.099982,
								uiAmountString: '0.099982'
							}
						},
						type: 'transferChecked'
					}
				},
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							authority: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
							destination: 'A9rRFaJokx8Qgj1P5Su8wB7dUTuUpWWJRCniMam9ygWE',
							mint: 'So11111111111111111111111111111111111111112',
							source: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
							tokenAmount: {
								amount: '810249',
								decimals: 9,
								uiAmount: 0.000810249,
								uiAmountString: '0.000810249'
							}
						},
						type: 'transferChecked'
					}
				},
				{
					programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
				}
			]
		}
	],
	userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
	// What the chain charged an account of the token account size when the run was made.
	rentExemptMinimum: 1_488_440n
};

// The same position closed over WalletConnect: the request exactly as Meteora sent it, the inner
// instructions a simulated run of it reported, and what the run did to the wallet. Its last lb_clmm
// instruction, `close_position_if_empty`, empties the position account and pays its rent into the
// wallet by moving the lamports itself, so no inner instruction states it.
export const MOCK_SOL_METEORA_DLMM_CLOSE_POSITION = {
	transaction:
		'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAkUPrjnV0R7UZkboB+1mKcFcrChp9qws9X5jz+9aBrqo78SODtgog4GuIah8LiRetGQxokS9gjX6xXoLIg/gOhfuAE99HZStt1Osji+irIy8O6UBQjLLjVAZpz/AE+mcRBDT5SLkxgMo+bNl0xzuQiYHNDB553TZX/FGfsHxvJvGapYVvWhY+VMS6SerMRWA5hiT348G9ljXcRvYLpsQnoZWXYJZME08UrZ2J2XicKqWZf6Wx40F3GitSjBxdW+ez7DiPH/o6Lf5he9xONXMlGjIuP8roHlpFc5DmR1HACkZeKcqMIjlhDIgqRW+pynoBCxCsges/G/SeImcgFW5iOpJ69frZbeoPqr6Upv3p3ixa4nPIa3aZLTj4H3hSgAdOmvtNLPFUvaBXDz5cbxAZC55qHIsUunLKubzB2l7Vq2c5PJSJlnLnmUpTrMngO1OaOUlAPGmZRz7OrcxR6p6JFrJgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+FkDBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAALJw1n+pjFHPAhMFE1iWK681dCvtWcnZRF6cDQyFx82Rxvp6877brTo9ZfNqq8l0MbG75MLS9uDkfKYCA0UvXWEE6eEvvIToJskyzOniZAzOFVkMHGJzsJJXCLo7hSCwvAVKU1qZKSEGTSTocWDaOHx8NbXdvJK7geQfqEBBBUSNBpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAEG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqdZs3GviSkz8W7UNk5aWjNKQ6m/sjdFwc+pg1flIfyZ9Cg0ABQJqAQgADAYABwASCxMBAQwGAAQADwsTAQEMBgAHABILEwEBDAYABAAPCxMBARARBQIJBwQKCBIPABMTEQ4QAwEazALDkTWRkc096v//ger//xAnAgAAAAAAAQAQEAIFAAoIBwQSDxMTEQ4QAwEYcL9lqxyQf7s96v//ger//wIAAAAAAAEAEAUFAAAOEAg7fNR2W5hunRMDBwAAAQkLAgAGDAIAAABUSgAAAAAAAA==',
	innerInstructions: [
		{
			index: 1,
			instructions: [
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							extensionTypes: ['immutableOwner'],
							mint: 'So11111111111111111111111111111111111111112'
						},
						type: 'getAccountDataSize'
					}
				},
				{
					program: 'system',
					programId: '11111111111111111111111111111111',
					parsed: {
						info: {
							lamports: 1488440,
							newAccount: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
							owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
							source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
							space: 165
						},
						type: 'createAccount'
					}
				},
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							account: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g'
						},
						type: 'initializeImmutableOwner'
					}
				},
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							account: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
							mint: 'So11111111111111111111111111111111111111112',
							owner: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
						},
						type: 'initializeAccount3'
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
						info: {
							authority: '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6',
							destination: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
							mint: 'So11111111111111111111111111111111111111112',
							source: 'EYj9xKw6ZszwpyNibHY7JD5o3QgTVrSdcBp1fMJhrR9o',
							tokenAmount: {
								amount: '7055665',
								decimals: 9,
								uiAmount: 0.007055665,
								uiAmountString: '0.007055665'
							}
						},
						type: 'transferChecked'
					}
				},
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							authority: '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6',
							destination: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
							mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
							source: 'CoaxzEh8p5YyGLcj36Eo3cUThVJxeKCs7qvLAGDYwBcz',
							tokenAmount: {
								amount: '1194217',
								decimals: 6,
								uiAmount: 1.194217,
								uiAmountString: '1.194217'
							}
						},
						type: 'transferChecked'
					}
				},
				{
					programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
				}
			]
		},
		{
			index: 6,
			instructions: [
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							authority: '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6',
							destination: 'BYXrPmaA2ydGNxtVL58ahU54qRe97iqxxGRSgFqidY3g',
							mint: 'So11111111111111111111111111111111111111112',
							source: 'EYj9xKw6ZszwpyNibHY7JD5o3QgTVrSdcBp1fMJhrR9o',
							tokenAmount: {
								amount: '984',
								decimals: 9,
								uiAmount: 9.84e-7,
								uiAmountString: '0.000000984'
							}
						},
						type: 'transferChecked'
					}
				},
				{
					program: 'spl-token',
					programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
					parsed: {
						info: {
							authority: '5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6',
							destination: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
							mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
							source: 'CoaxzEh8p5YyGLcj36Eo3cUThVJxeKCs7qvLAGDYwBcz',
							tokenAmount: {
								amount: '174',
								decimals: 6,
								uiAmount: 0.000174,
								uiAmountString: '0.000174'
							}
						},
						type: 'transferChecked'
					}
				},
				{
					programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
				},
				{
					programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
				}
			]
		},
		{
			index: 7,
			instructions: [
				{
					programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
				}
			]
		}
	],
	userAddress: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
	// The wallet's USDC account, which the request opens again only if it is missing.
	usdcAccount: '6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU',
	usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
	position: {
		account: '8wmR8dCeYSemR1uzPA5MBNF8Tmnu44wdDkUtrP9MZREr',
		program: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
		lamports: 41_899_840n
	},
	// The wallet's lamports after the run less those before it, and the fee the run charged.
	walletChange: 48_932_461n,
	fee: 5_000n,
	rentExemptMinimum: 1_488_440n
};
