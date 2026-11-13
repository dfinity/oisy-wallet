// Live `li.quest/v1/quote` answers for a BTC source, trimmed to the fields OISY reads. Each PSBT is
// LI.FI's own: one input LI.FI chose, then the deposit, the memo, the change and LI.FI's fee.
import type { LiFiStep } from '@lifi/sdk';

// LI.FI's BTC fee address, the fee output of every quote.
export const mockLifiBtcFeeAddress = 'bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g';

/**
 * 1 000 000 sats to ETH on Ethereum through LayerSwap, from a public P2WPKH address (2026-11-13): a P2TR
 * deposit, an 18-byte memo, change and LI.FI's 2 500-sat fee.
 */
export const mockLifiBtcLayerswapQuote: LiFiStep = {
	id: '62fb4aca-f127-4c71-8aa9-274395c80134:0',
	type: 'lifi',
	tool: 'layerswap',
	toolDetails: { key: 'layerswap', name: 'Layerswap', logoURI: '' },
	action: {
		fromChainId: 20000000000001,
		toChainId: 1,
		fromAmount: '1000000',
		fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
		toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
		slippage: 0.005,
		fromToken: {
			chainId: 20000000000001,
			address: 'bitcoin',
			symbol: 'BTC',
			name: 'Bitcoin',
			decimals: 8,
			priceUSD: '68740.72049908031'
		},
		toToken: {
			chainId: 1,
			address: '0x0000000000000000000000000000000000000000',
			symbol: 'ETH',
			name: 'ETH',
			decimals: 18,
			priceUSD: '1935.87'
		}
	},
	estimate: {
		tool: 'layerswap',
		fromAmount: '1000000',
		toAmount: '354330530000000000',
		toAmountMin: '352558870000000000',
		approvalAddress: 'bc1qz8p3w089t3tq3uvqmzhgdh5vuzm7gxr45xjppj',
		executionDuration: 1963,
		feeCosts: [
			{
				name: 'LIFI Fixed Fee',
				description: 'Fixed LIFI fee, independent of any other fee',
				percentage: '0.0025',
				amount: '2500',
				amountUSD: '1.7185',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '68740.72049908031'
				},
				feeSplit: {
					lifiFee: '2500',
					integratorFee: '0',
					recipients: [{ name: 'lifi', type: 'FIXED', fee: '2500' }]
				}
			},
			{
				name: 'LayerSwap fee',
				description: 'LayerSwap bridge fee',
				percentage: '0.0007',
				amount: '693',
				amountUSD: '0.476492',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '68740.72049908031'
				}
			}
		],
		gasCosts: []
	},
	includedSteps: [
		{
			id: '774672ea-d766-4914-a38b-43f5d1cd3b8a',
			type: 'protocol',
			tool: 'feeCollection',
			toolDetails: { key: 'feeCollection', name: 'Integrator Fee', logoURI: '' },
			action: {
				fromChainId: 20000000000001,
				toChainId: 20000000000001,
				fromAmount: '1000000',
				fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
				toAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
				slippage: 0.005,
				fromToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '68740.72049908031'
				},
				toToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '68740.72049908031'
				}
			},
			estimate: {
				tool: 'feeCollection',
				fromAmount: '1000000',
				toAmount: '997500',
				toAmountMin: '997500',
				approvalAddress: '0x0000000000000000000000000000000000000000',
				executionDuration: 0,
				feeCosts: [],
				gasCosts: []
			}
		},
		{
			id: '74f2d394-680f-47b9-901a-e480eb6c0a44',
			type: 'cross',
			tool: 'layerswap',
			toolDetails: { key: 'layerswap', name: 'Layerswap', logoURI: '' },
			action: {
				fromChainId: 20000000000001,
				toChainId: 1,
				fromAmount: '997500',
				fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
				toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
				slippage: 0.005,
				fromToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '68740.72049908031'
				},
				toToken: {
					chainId: 1,
					address: '0x0000000000000000000000000000000000000000',
					symbol: 'ETH',
					name: 'ETH',
					decimals: 18,
					priceUSD: '1935.87'
				}
			},
			estimate: {
				tool: 'layerswap',
				fromAmount: '997500',
				toAmount: '354330530000000000',
				toAmountMin: '352558870000000000',
				approvalAddress: 'bc1qz8p3w089t3tq3uvqmzhgdh5vuzm7gxr45xjppj',
				executionDuration: 1963,
				feeCosts: [],
				gasCosts: []
			}
		}
	],
	transactionRequest: {
		data: '70736274ff0100b902000000017db23aa8e3a20267fa50c93eb94b7b20e6d3db639acf641551a02c66163db3790000000000fdffffff047c380f0000000000225120f9ba507bc8114718a0e16d70a22059162f24a7996ac4d1db1f26330c91c761de0000000000000000146a12313731363366323b3d7c6c6966693df52ece0c79dc0b00000000160014311564348890e005880a9bc834aaa5884f1b5932c4090000000000001600149ab105ce5f65cc9d3e51e4b2403eef1831eb5bfd000000000001011f10bfeb0b00000000160014311564348890e005880a9bc834aaa5884f1b59320000000000',
		to: 'bc1plxa9q77gz9r33g8pd4c2ygzezchjffuedtzdrkclyceseyw8v80qasmquf',
		value: '1000000'
	}
};

/**
 * 120 000 sats to ETH on Ethereum through LayerSwap, from the same address (2026-11-13): just above
 * `LIFI_BTC_MIN_AMOUNT_SATOSHIS`, so the fee output is the quoted 300 sats.
 */
export const mockLifiBtcLayerswapSmallQuote: LiFiStep = {
	id: 'e074fc41-67c3-4373-9dd2-b2334bca542c:0',
	type: 'lifi',
	tool: 'layerswap',
	toolDetails: { key: 'layerswap', name: 'Layerswap', logoURI: '' },
	action: {
		fromChainId: 20000000000001,
		toChainId: 1,
		fromAmount: '120000',
		fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
		toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
		slippage: 0.005,
		fromToken: {
			chainId: 20000000000001,
			address: 'bitcoin',
			symbol: 'BTC',
			name: 'Bitcoin',
			decimals: 8,
			priceUSD: '69271.71766477182'
		},
		toToken: {
			chainId: 1,
			address: '0x0000000000000000000000000000000000000000',
			symbol: 'ETH',
			name: 'ETH',
			decimals: 18,
			priceUSD: '1951.99'
		}
	},
	estimate: {
		tool: 'layerswap',
		fromAmount: '120000',
		toAmount: '42406930000000000',
		toAmountMin: '42194900000000000',
		approvalAddress: 'bc1qz8p3w089t3tq3uvqmzhgdh5vuzm7gxr45xjppj',
		executionDuration: 1897,
		feeCosts: [
			{
				name: 'LIFI Fixed Fee',
				description: 'Fixed LIFI fee, independent of any other fee',
				percentage: '0.0025',
				amount: '300',
				amountUSD: '0.2078',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69271.71766477182'
				},
				feeSplit: {
					lifiFee: '300',
					integratorFee: '0',
					recipients: [{ name: 'lifi', type: 'FIXED', fee: '300' }]
				}
			},
			{
				name: 'LayerSwap fee',
				description: 'LayerSwap bridge fee',
				percentage: '0.0015',
				amount: '181',
				amountUSD: '0.125413',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69271.71766477182'
				}
			}
		],
		gasCosts: []
	},
	includedSteps: [
		{
			id: '5c0dad1b-b659-4d5e-97c6-7400492046c4',
			type: 'protocol',
			tool: 'feeCollection',
			toolDetails: { key: 'feeCollection', name: 'Integrator Fee', logoURI: '' },
			action: {
				fromChainId: 20000000000001,
				toChainId: 20000000000001,
				fromAmount: '120000',
				fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
				toAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
				slippage: 0.005,
				fromToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69271.71766477182'
				},
				toToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69271.71766477182'
				}
			},
			estimate: {
				tool: 'feeCollection',
				fromAmount: '120000',
				toAmount: '119700',
				toAmountMin: '119700',
				approvalAddress: '0x0000000000000000000000000000000000000000',
				executionDuration: 0,
				feeCosts: [],
				gasCosts: []
			}
		},
		{
			id: '70606644-d142-4680-a2ee-a5a473b2cb3a',
			type: 'cross',
			tool: 'layerswap',
			toolDetails: { key: 'layerswap', name: 'Layerswap', logoURI: '' },
			action: {
				fromChainId: 20000000000001,
				toChainId: 1,
				fromAmount: '119700',
				fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
				toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
				slippage: 0.005,
				fromToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69271.71766477182'
				},
				toToken: {
					chainId: 1,
					address: '0x0000000000000000000000000000000000000000',
					symbol: 'ETH',
					name: 'ETH',
					decimals: 18,
					priceUSD: '1951.99'
				}
			},
			estimate: {
				tool: 'layerswap',
				fromAmount: '119700',
				toAmount: '42406930000000000',
				toAmountMin: '42194900000000000',
				approvalAddress: 'bc1qz8p3w089t3tq3uvqmzhgdh5vuzm7gxr45xjppj',
				executionDuration: 1897,
				feeCosts: [],
				gasCosts: []
			}
		}
	],
	transactionRequest: {
		data: '70736274ff0100b902000000017db23aa8e3a20267fa50c93eb94b7b20e6d3db639acf641551a02c66163db3790000000000fdffffff0494d3010000000000225120f9ba507bc8114718a0e16d70a22059162f24a7996ac4d1db1f26330c91c761de0000000000000000146a12313731613437383b3d7c6c696669dbffb10f0ee9e90b00000000160014311564348890e005880a9bc834aaa5884f1b59322c010000000000001600149ab105ce5f65cc9d3e51e4b2403eef1831eb5bfd000000000001011f10bfeb0b00000000160014311564348890e005880a9bc834aaa5884f1b59320000000000',
		to: 'bc1plxa9q77gz9r33g8pd4c2ygzezchjffuedtzdrkclyceseyw8v80qasmquf',
		value: '120000'
	}
};

/**
 * 1 000 000 sats to ETH on Ethereum through NEAR Intents, from another public P2WPKH address
 * (2026-11-13): a P2WPKH 1Click deposit address, a 10-byte memo, change and LI.FI's 2 500-sat fee.
 */
export const mockLifiBtcNearQuote: LiFiStep = {
	id: '82d5c115-e3b4-4f13-8bc8-0993a60a029b:0',
	type: 'lifi',
	tool: 'near',
	toolDetails: { key: 'near', name: 'NearIntents', logoURI: '' },
	action: {
		fromChainId: 20000000000001,
		toChainId: 1,
		fromAmount: '1000000',
		fromAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
		toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
		slippage: 0.005,
		fromToken: {
			chainId: 20000000000001,
			address: 'bitcoin',
			symbol: 'BTC',
			name: 'Bitcoin',
			decimals: 8,
			priceUSD: '69284.54199434747'
		},
		toToken: {
			chainId: 1,
			address: '0x0000000000000000000000000000000000000000',
			symbol: 'ETH',
			name: 'ETH',
			decimals: 18,
			priceUSD: '1979.74'
		}
	},
	estimate: {
		tool: 'near',
		fromAmount: '1000000',
		toAmount: '351201363265755504',
		toAmountMin: '349445356449426726',
		approvalAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
		executionDuration: 1714,
		feeCosts: [
			{
				name: 'LIFI Fixed Fee',
				description: 'Fixed LIFI fee, independent of any other fee',
				percentage: '0.0025',
				amount: '2500',
				amountUSD: '1.7321',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				},
				feeSplit: {
					lifiFee: '2500',
					integratorFee: '0',
					recipients: [{ name: 'lifi', type: 'FIXED', fee: '2500' }]
				}
			},
			{
				name: 'NearIntents Protocol Fee',
				description: 'Fee taken by NearIntents for the protocol',
				percentage: '0.0001',
				amount: '100',
				amountUSD: '0.0693',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				}
			},
			{
				name: '1ClickSwap API Fee',
				description: 'Fee taken by 1ClickSwap for the API call',
				percentage: '0.0001',
				amount: '100',
				amountUSD: '0.0693',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				}
			},
			{
				name: 'NearIntents App Fee',
				description: 'Affiliate fee',
				percentage: '0.001',
				amount: '998',
				amountUSD: '0.6915',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				}
			}
		],
		gasCosts: []
	},
	includedSteps: [
		{
			id: '5444a255-90b5-481f-a636-4891b67b5578',
			type: 'protocol',
			tool: 'feeCollection',
			toolDetails: { key: 'feeCollection', name: 'Integrator Fee', logoURI: '' },
			action: {
				fromChainId: 20000000000001,
				toChainId: 20000000000001,
				fromAmount: '1000000',
				fromAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
				toAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
				slippage: 0.005,
				fromToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				},
				toToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				}
			},
			estimate: {
				tool: 'feeCollection',
				fromAmount: '1000000',
				toAmount: '997500',
				toAmountMin: '997500',
				approvalAddress: '0x0000000000000000000000000000000000000000',
				executionDuration: 0,
				feeCosts: [],
				gasCosts: []
			}
		},
		{
			id: '03f6fa07-6882-47bf-ace9-ad78736b902f',
			type: 'cross',
			tool: 'near',
			toolDetails: { key: 'near', name: 'NearIntents', logoURI: '' },
			action: {
				fromChainId: 20000000000001,
				toChainId: 1,
				fromAmount: '997500',
				fromAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
				toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
				slippage: 0.005,
				fromToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				},
				toToken: {
					chainId: 1,
					address: '0x0000000000000000000000000000000000000000',
					symbol: 'ETH',
					name: 'ETH',
					decimals: 18,
					priceUSD: '1979.74'
				}
			},
			estimate: {
				tool: 'near',
				fromAmount: '997500',
				toAmount: '351201363265755504',
				toAmountMin: '349445356449426726',
				approvalAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
				executionDuration: 1712,
				feeCosts: [],
				gasCosts: []
			}
		}
	],
	transactionRequest: {
		data: '70736274ff0100a502000000012139f65f15fe53564c3fa3ca447b4c0501f49e16098485db657209e56df90ba10100000000fdffffff047c380f0000000000160014fee4b9d289595c5af2583fc4772c8b525a0abd7300000000000000000c6a0a3d7c6c6966692fa4b95ac0e8500000000000160014e8df018c7e326cc253faac7e46cdc51e68542c42c4090000000000001600149ab105ce5f65cc9d3e51e4b2403eef1831eb5bfd000000000001011f5e2d600000000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000',
		to: 'bc1qlmjtn55ft9w94ujc8lz8wtyt2fdq40tnfum24l',
		value: '1000000'
	}
};

/**
 * 60 000 sats to ETH on Ethereum through NEAR Intents, from the same address (2026-11-13): below
 * `LIFI_BTC_MIN_AMOUNT_SATOSHIS`, LI.FI raises its fee output to 294 sats while the quote lists 150.
 */
export const mockLifiBtcNearBelowFloorQuote: LiFiStep = {
	id: '89ab4433-b58e-4d73-b633-f48a9d8b9aed:0',
	type: 'lifi',
	tool: 'near',
	toolDetails: { key: 'near', name: 'NearIntents', logoURI: '' },
	action: {
		fromChainId: 20000000000001,
		toChainId: 1,
		fromAmount: '60000',
		fromAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
		toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
		slippage: 0.005,
		fromToken: {
			chainId: 20000000000001,
			address: 'bitcoin',
			symbol: 'BTC',
			name: 'Bitcoin',
			decimals: 8,
			priceUSD: '69284.54199434747'
		},
		toToken: {
			chainId: 1,
			address: '0x0000000000000000000000000000000000000000',
			symbol: 'ETH',
			name: 'ETH',
			decimals: 18,
			priceUSD: '1977.67'
		}
	},
	estimate: {
		tool: 'near',
		fromAmount: '60000',
		toAmount: '21072275504285294',
		toAmountMin: '20966914126763867',
		approvalAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
		executionDuration: 1712,
		feeCosts: [
			{
				name: 'LIFI Fixed Fee',
				description: 'Fixed LIFI fee, independent of any other fee',
				percentage: '0.0025',
				amount: '150',
				amountUSD: '0.1039',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				},
				feeSplit: {
					lifiFee: '150',
					integratorFee: '0',
					recipients: [{ name: 'lifi', type: 'FIXED', fee: '150' }]
				}
			},
			{
				name: 'NearIntents Protocol Fee',
				description: 'Fee taken by NearIntents for the protocol',
				percentage: '0.0001',
				amount: '6',
				amountUSD: '0.0042',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				}
			},
			{
				name: '1ClickSwap API Fee',
				description: 'Fee taken by 1ClickSwap for the API call',
				percentage: '0.0001',
				amount: '6',
				amountUSD: '0.0042',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				}
			},
			{
				name: 'NearIntents App Fee',
				description: 'Affiliate fee',
				percentage: '0.001',
				amount: '60',
				amountUSD: '0.0416',
				included: true,
				token: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				}
			}
		],
		gasCosts: []
	},
	includedSteps: [
		{
			id: '68fe6595-c5e9-4279-86b5-14cd8e8d052f',
			type: 'protocol',
			tool: 'feeCollection',
			toolDetails: { key: 'feeCollection', name: 'Integrator Fee', logoURI: '' },
			action: {
				fromChainId: 20000000000001,
				toChainId: 20000000000001,
				fromAmount: '60000',
				fromAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
				toAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
				slippage: 0.005,
				fromToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				},
				toToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				}
			},
			estimate: {
				tool: 'feeCollection',
				fromAmount: '60000',
				toAmount: '59850',
				toAmountMin: '59850',
				approvalAddress: '0x0000000000000000000000000000000000000000',
				executionDuration: 0,
				feeCosts: [],
				gasCosts: []
			}
		},
		{
			id: '92842b13-0d82-4b11-9fa0-9bca4105f8e0',
			type: 'cross',
			tool: 'near',
			toolDetails: { key: 'near', name: 'NearIntents', logoURI: '' },
			action: {
				fromChainId: 20000000000001,
				toChainId: 1,
				fromAmount: '59850',
				fromAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
				toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
				slippage: 0.005,
				fromToken: {
					chainId: 20000000000001,
					address: 'bitcoin',
					symbol: 'BTC',
					name: 'Bitcoin',
					decimals: 8,
					priceUSD: '69284.54199434747'
				},
				toToken: {
					chainId: 1,
					address: '0x0000000000000000000000000000000000000000',
					symbol: 'ETH',
					name: 'ETH',
					decimals: 18,
					priceUSD: '1977.67'
				}
			},
			estimate: {
				tool: 'near',
				fromAmount: '59850',
				toAmount: '21072275504285294',
				toAmountMin: '20966914126763867',
				approvalAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
				executionDuration: 1712,
				feeCosts: [],
				gasCosts: []
			}
		}
	],
	transactionRequest: {
		data: '70736274ff0100a502000000012139f65f15fe53564c3fa3ca447b4c0501f49e16098485db657209e56df90ba10100000000fdffffff04cae900000000000016001475a54256afcd91347d783b39e9c64a43b436ac4e00000000000000000c6a0a3d7c6c69666987a775b5e03e5f0000000000160014e8df018c7e326cc253faac7e46cdc51e68542c4226010000000000001600149ab105ce5f65cc9d3e51e4b2403eef1831eb5bfd000000000001011f5e2d600000000000160014e8df018c7e326cc253faac7e46cdc51e68542c420000000000',
		to: 'bc1qwkj5y440ekgngltc8vu7n3j2gw6rdtzwezn087',
		value: '60000'
	}
};
