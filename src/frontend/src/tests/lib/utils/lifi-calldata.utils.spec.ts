import {
	LIFI_ACROSS_V4_ABI,
	LIFI_APPROVE_TO_ONLY_SELECTOR,
	LIFI_FEE_FORWARDER_ABI,
	LIFI_GENERIC_SWAP_ABI,
	LIFI_NEAR_INTENTS_ABI,
	LIFI_NON_EVM_ADDRESS
} from '$eth/constants/lifi.constants';
import { ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import { assertLifiCalldata } from '$lib/utils/lifi-calldata.utils';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import {
	mockLifiCalldataAcrossEvm,
	mockLifiCalldataNearEvm,
	mockLifiCalldataNearSolana,
	mockLifiCalldataSameChain,
	mockLifiCalldataSolanaUser,
	mockLifiCalldataUser,
	type LifiCalldataFixture
} from '$tests/mocks/lifi-calldata.mock';
import { assertNonNullish } from '@dfinity/utils';
import { ChainId, type LiFiStep } from '@lifi/sdk';
import { Interface, type ParamType, type Result } from 'ethers/abi';
import { zeroPadValue } from 'ethers/utils';

type Struct = Record<string, unknown>;

describe('lifi-calldata.utils', () => {
	const diamond = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';

	// From the fixtures' own calldata: LI.FI's fee collector, and the DEX of the same-chain route.
	const feeCollector = '0xCE40449B773a3E6E5e769ADb4e567179d4828cbd';
	const dexRouter = '0xC87De04e2EC1F4282dFF2933A2D58199f688fC3d';
	const baseUsdc = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
	const ethereumUsdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
	const elsewhere = '0x000000000000000000000000000000000000bEEF';

	// As LI.FI's quotes name them (2026-10-19): Across pays native ETH on Arbitrum out as its WETH, and
	// NEAR Intents names any native coin, EVM or Solana, with this sentinel.
	const arbitrumWeth = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
	const baseWeth = '0x4200000000000000000000000000000000000006';
	const nearNative = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

	const padded = (address: string): string => zeroPadValue(address.toLowerCase(), 32);

	const assertFixture = ({
		fixture: { request, toAmountMin, quote },
		userTokenAddresses = []
	}: {
		fixture: LifiCalldataFixture;
		userTokenAddresses?: string[];
	}) =>
		assertLifiCalldata({
			quote,
			request,
			diamond,
			displayedToAmountMin: toAmountMin,
			userTokenAddresses
		});

	const dataOf = ({ quote }: LifiCalldataFixture): string => {
		const data = quote.transactionRequest?.data;

		assertNonNullish(data);

		return data;
	};

	const withData = ({ fixture, data }: { fixture: LifiCalldataFixture; data: string }) => ({
		...fixture,
		quote: { transactionRequest: { ...fixture.quote.transactionRequest, data } } as LiFiStep
	});

	// The decoded arguments as plain values, typed by the function's own parameters, so that they
	// encode back byte for byte.
	const toPlain = ({ value, type }: { value: unknown; type: ParamType }): unknown => {
		if (type.isTuple()) {
			return Object.fromEntries(
				type.components.map((component, index) => [
					component.name,
					toPlain({ value: (value as Result)[index], type: component })
				])
			);
		}

		if (type.isArray()) {
			return [...(value as Result)].map((item) =>
				toPlain({ value: item, type: type.arrayChildren })
			);
		}

		return value;
	};

	// Re-encodes a fixture after a change to its decoded arguments, so that each refusal is tested on
	// otherwise genuine LI.FI calldata.
	const withArgs = ({
		fixture,
		abi,
		change
	}: {
		fixture: LifiCalldataFixture;
		abi: string[];
		change: (args: unknown[]) => void;
	}): LifiCalldataFixture => {
		const facet = new Interface(abi);
		const call = facet.parseTransaction({ data: dataOf(fixture) });

		assertNonNullish(call);

		const args = call.fragment.inputs.map((type, index) =>
			toPlain({ value: call.args[index], type })
		);

		change(args);

		return withData({ fixture, data: facet.encodeFunctionData(call.fragment, args) });
	};

	const bridgeArgs = (args: unknown[]) => ({
		bridgeData: args[0] as Struct,
		steps: args[1] as Struct[],
		facetData: args[2] as Struct
	});

	const genericArgs = (args: unknown[]) => ({ steps: args[5] as Struct[] });

	const stepAt = ({ steps, index }: { steps: Struct[]; index: number }): Struct => {
		const step = steps[index];

		assertNonNullish(step);

		return step;
	};

	const feeForwarder = new Interface(LIFI_FEE_FORWARDER_ABI);

	// Re-encodes a step's fee forwarding call after a change to its decoded arguments: the last one is
	// the list of `(recipient, amount)` distributions.
	const changeFee = ({ step, change }: { step: Struct; change: (args: unknown[]) => void }) => {
		const call = feeForwarder.parseTransaction({ data: step.callData as string });

		assertNonNullish(call);

		const args = call.fragment.inputs.map((type, index) =>
			toPlain({ value: call.args[index], type })
		);

		change(args);

		step.callData = feeForwarder.encodeFunctionData(call.fragment, args);
	};

	const distributionsOf = (args: unknown[]) => args.at(-1) as Struct[];

	const expectRejected = (fixture: LifiCalldataFixture) =>
		expect(() => assertFixture({ fixture })).toThrow(LifiQuoteRejectedError);

	const expectAccepted = (fixture: LifiCalldataFixture) =>
		expect(() => assertFixture({ fixture })).not.toThrow();

	describe('real LI.FI calldata', () => {
		it('should accept a same-chain swap, returning its fee collection and DEX calls', () => {
			expect(assertFixture({ fixture: mockLifiCalldataSameChain })).toEqual([
				{ contract: feeCollector, selector: '0x0e8ae67f' },
				{ contract: dexRouter, selector: '0x3f0bde25' }
			]);
		});

		it.each([
			{ route: 'Across, EVM → EVM', fixture: mockLifiCalldataAcrossEvm },
			{ route: 'NEAR Intents, EVM → EVM', fixture: mockLifiCalldataNearEvm },
			{ route: 'NEAR Intents, EVM → Solana', fixture: mockLifiCalldataNearSolana }
		])(
			'should accept a bridge route ($route), returning its fee collection call',
			({ fixture }) => {
				expect(assertFixture({ fixture })).toEqual([
					{ contract: feeCollector, selector: '0x332d746b' }
				]);
			}
		);
	});

	describe('pinned functions', () => {
		// The selectors each pinned Diamond's `DiamondLoupe.facetAddress` resolved to the facet on
		// 2026-10-19. A struct typed wrongly in an ABI would change its selector, and decode real
		// calldata wrongly; this pins the functions without a calldata fixture too.
		it.each([
			{
				facet: 'GenericSwapFacetV3',
				abi: LIFI_GENERIC_SWAP_ABI,
				selectors: [
					'0x2c57e884',
					'0x4666fc80',
					'0x5fd9ae2e',
					'0x733214a3',
					'0x736eac0b',
					'0xaf7060fd'
				]
			},
			{ facet: 'AcrossFacetV4', abi: LIFI_ACROSS_V4_ABI, selectors: ['0x1794958f', '0xa1f1ce43'] },
			{
				facet: 'NEARIntentsFacet',
				abi: LIFI_NEAR_INTENTS_ABI,
				selectors: ['0x02631b09', '0x4698f032']
			}
		])(
			'should decode exactly the $facet functions registered on the Diamonds',
			({ abi, selectors }) => {
				const pinned: string[] = [];

				new Interface(abi).forEachFunction(({ selector }) => pinned.push(selector));

				expect(pinned.sort()).toEqual(selectors);
			}
		);

		it('should decode exactly the fee forwarding functions the real routes call', () => {
			const pinned: string[] = [];

			feeForwarder.forEachFunction(({ selector }) => pinned.push(selector));

			expect(pinned.sort()).toEqual(['0x0e8ae67f', '0x332d746b']);
		});

		it('should refuse calldata that is missing or too short to name a function', () => {
			expectRejected(withData({ fixture: mockLifiCalldataSameChain, data: '0x' }));
			expectRejected(withData({ fixture: mockLifiCalldataSameChain, data: '0x1234' }));
		});

		it('should refuse a same-chain route calling a bridge function', () => {
			expectRejected({ ...mockLifiCalldataAcrossEvm, request: mockLifiCalldataSameChain.request });
		});

		it('should refuse a cross-chain route calling a same-chain swap function', () => {
			expectRejected({ ...mockLifiCalldataSameChain, request: mockLifiCalldataAcrossEvm.request });
		});

		it('should refuse a function outside the pinned ones, such as the unregistered V1 swap', () => {
			const data = dataOf(mockLifiCalldataSameChain);

			expectRejected(
				withData({ fixture: mockLifiCalldataSameChain, data: `0x4630a0d8${data.slice(10)}` })
			);
		});

		it('should refuse a bridge the request did not allow', () => {
			expectRejected({
				...mockLifiCalldataNearEvm,
				request: { ...mockLifiCalldataNearEvm.request, allowBridges: ['across'] }
			});
		});

		it('should refuse a bridge that has no decoder, whatever the request allowed', () => {
			expectRejected({
				...mockLifiCalldataNearEvm,
				request: { ...mockLifiCalldataNearEvm.request, allowBridges: ['mayan'] }
			});
		});

		it('should refuse calldata that does not decode as the function its selector names', () => {
			const data = dataOf(mockLifiCalldataAcrossEvm);

			expectRejected(
				withData({ fixture: mockLifiCalldataAcrossEvm, data: data.slice(0, data.length / 2) })
			);
		});
	});

	describe('same-chain swap', () => {
		const change = (changeArgs: (args: unknown[]) => void) =>
			withArgs({
				fixture: mockLifiCalldataSameChain,
				abi: LIFI_GENERIC_SWAP_ABI,
				change: changeArgs
			});

		it('should refuse a swap that pays someone else', () => {
			expectRejected(
				change((args) => {
					args[3] = elsewhere;
				})
			);
		});

		it('should refuse an on-chain minimum below the one displayed', () => {
			expect(() =>
				assertLifiCalldata({
					quote: mockLifiCalldataSameChain.quote,
					request: mockLifiCalldataSameChain.request,
					diamond,
					displayedToAmountMin: mockLifiCalldataSameChain.toAmountMin + 1n,
					userTokenAddresses: []
				})
			).toThrow(LifiQuoteRejectedError);
		});

		it('should refuse a swap that ends in another token', () => {
			expectRejected(
				change((args) => {
					const { steps } = genericArgs(args);
					const last = steps.at(-1);

					assertNonNullish(last);

					last.receivingAssetId = elsewhere;
				})
			);
		});
	});

	describe('swap steps', () => {
		const change = (changeArgs: (args: unknown[]) => void) =>
			withArgs({
				fixture: mockLifiCalldataAcrossEvm,
				abi: LIFI_ACROSS_V4_ABI,
				change: changeArgs
			});

		const firstStep = (args: unknown[]): Struct => {
			const [first] = bridgeArgs(args).steps;

			assertNonNullish(first);

			return first;
		};

		it.each([
			{
				case: 'does not deposit',
				change: (step: Struct) => {
					step.requiresDeposit = false;
				}
			},
			{
				case: 'deposits another token',
				change: (step: Struct) => {
					step.sendingAssetId = elsewhere;
				}
			},
			{
				case: 'deposits another amount',
				change: (step: Struct) => {
					step.fromAmount = 1n;
				}
			}
		])('should refuse a first swap that $case', ({ change: changeStep }) => {
			expectRejected(change((args) => changeStep(firstStep(args))));
		});

		it('should refuse a later swap that pulls another deposit', () => {
			expectRejected(
				change((args) => {
					bridgeArgs(args).steps.push({ ...firstStep(args), requiresDeposit: true });
				})
			);
		});

		it.each([
			{
				case: 'calls the Diamond',
				change: (step: Struct) => {
					step.callTo = diamond;
				}
			},
			{
				case: 'approves the Diamond',
				change: (step: Struct) => {
					step.approveTo = diamond;
				}
			},
			{
				case: 'calls the source token',
				change: (step: Struct) => {
					step.callTo = baseUsdc;
				}
			}
		])('should refuse a swap that $case', ({ change: changeStep }) => {
			expectRejected(change((args) => changeStep(firstStep(args))));
		});

		it('should refuse a swap that calls a token the user holds', () => {
			expect(() =>
				assertFixture({ fixture: mockLifiCalldataAcrossEvm, userTokenAddresses: [feeCollector] })
			).toThrow(LifiQuoteRejectedError);
		});

		it('should refuse a swap that makes no call', () => {
			expectRejected(
				change((args) => {
					firstStep(args).callData = '0x';
				})
			);
		});

		it('should look up an approval target other than the call target as approve-only', () => {
			const fixture = change((args) => {
				firstStep(args).approveTo = elsewhere;
			});

			expect(assertFixture({ fixture })).toEqual([
				{ contract: feeCollector, selector: '0x332d746b' },
				{ contract: elsewhere, selector: LIFI_APPROVE_TO_ONLY_SELECTOR }
			]);
		});

		it('should not look up an approval for a native sending asset, which is not approved', () => {
			const fixture = withArgs({
				fixture: mockLifiCalldataSameChain,
				abi: LIFI_GENERIC_SWAP_ABI,
				change: (args) => {
					const [first] = genericArgs(args).steps;

					assertNonNullish(first);

					first.approveTo = elsewhere;
				}
			});

			expect(assertFixture({ fixture })).not.toContainEqual(
				expect.objectContaining({ contract: elsewhere })
			);
		});
	});

	// Every real route forwards exactly LI.FI's 25 bps, as its first swap.
	describe('fee forwarding', () => {
		const changeAcross = (changeArgs: (args: unknown[]) => void) =>
			withArgs({
				fixture: mockLifiCalldataAcrossEvm,
				abi: LIFI_ACROSS_V4_ABI,
				change: changeArgs
			});

		const changeAcrossFee = (changeFeeArgs: (args: unknown[]) => void) =>
			changeAcross((args) =>
				changeFee({
					step: stepAt({ steps: bridgeArgs(args).steps, index: 0 }),
					change: changeFeeArgs
				})
			);

		it("should refuse a single unit more than LI.FI's fee, even in a distribution of its own", () => {
			expectRejected(
				changeAcrossFee((args) => {
					distributionsOf(args).push({ recipient: elsewhere, amount: 1n });
				})
			);
		});

		it("should refuse LI.FI's fee forwarded twice, each within it", () => {
			expectRejected(
				changeAcross((args) => {
					const { steps } = bridgeArgs(args);

					steps.push({ ...stepAt({ steps, index: 0 }), requiresDeposit: false });
				})
			);
		});

		describe('rounded down, as LI.FI rounds it', () => {
			// LI.FI quoted 50.000001 USDC with a fee of 0.125 USDC (2026-10-19).
			const withFeeOnUnevenAmount = (fee: bigint): LifiCalldataFixture => {
				const amount = 50_000_001n;
				const fixture = changeAcross((args) => {
					const step = stepAt({ steps: bridgeArgs(args).steps, index: 0 });

					step.fromAmount = amount;

					changeFee({
						step,
						change: (feeArgs) => {
							feeArgs[1] = [{ recipient: feeCollector, amount: fee }];
						}
					});
				});

				return { ...fixture, request: { ...fixture.request, fromAmount: amount.toString() } };
			};

			it("should accept LI.FI's fee rounded down", () => {
				expectAccepted(withFeeOnUnevenAmount(125_000n));
			});

			it("should refuse LI.FI's fee rounded up", () => {
				expectRejected(withFeeOnUnevenAmount(125_001n));
			});
		});

		// The deposit stays bound and the bridge's computed minimum stays above the one displayed, so
		// only the fee's own arguments give it away.
		it('should refuse most of the deposit forwarded elsewhere, with the bridge left the rest', () => {
			expectRejected(
				changeAcross((args) => {
					const { bridgeData, steps, facetData } = bridgeArgs(args);

					changeFee({
						step: stepAt({ steps, index: 0 }),
						change: (feeArgs) => {
							feeArgs[1] = [{ recipient: elsewhere, amount: 49_000_000n }];
						}
					});

					bridgeData.minAmount = 1_000_000n;
					facetData.outputAmountMultiplier = 10n ** 20n;
				})
			);
		});

		it('should refuse a fee taken in another token', () => {
			expectRejected(
				changeAcrossFee((args) => {
					args[0] = elsewhere;
				})
			);
		});

		it("should refuse a native fee above LI.FI's", () => {
			expectRejected(
				withArgs({
					fixture: mockLifiCalldataSameChain,
					abi: LIFI_GENERIC_SWAP_ABI,
					change: (args) =>
						changeFee({
							step: stepAt({ steps: genericArgs(args).steps, index: 0 }),
							change: (feeArgs) => {
								const [distribution] = distributionsOf(feeArgs);

								assertNonNullish(distribution);

								distribution.amount = (distribution.amount as bigint) + 1n;
							}
						})
				})
			);
		});

		it('should refuse a fee step that does not pass the source token through', () => {
			expectRejected(
				withArgs({
					fixture: mockLifiCalldataSameChain,
					abi: LIFI_GENERIC_SWAP_ABI,
					change: (args) => {
						stepAt({ steps: genericArgs(args).steps, index: 0 }).receivingAssetId = elsewhere;
					}
				})
			);
		});

		it('should refuse a fee forwarding call that does not decode', () => {
			expectRejected(
				changeAcross((args) => {
					stepAt({ steps: bridgeArgs(args).steps, index: 0 }).callData = '0x332d746b1234';
				})
			);
		});
	});

	describe('bridge', () => {
		const changeAcross = (changeArgs: (args: unknown[]) => void) =>
			withArgs({
				fixture: mockLifiCalldataAcrossEvm,
				abi: LIFI_ACROSS_V4_ABI,
				change: changeArgs
			});

		const changeNear = ({
			fixture,
			change
		}: {
			fixture: LifiCalldataFixture;
			change: (args: unknown[]) => void;
		}) => withArgs({ fixture, abi: LIFI_NEAR_INTENTS_ABI, change });

		it.each([
			{
				case: 'makes a destination call',
				change: (data: Struct) => {
					data.hasDestinationCall = true;
				}
			},
			{
				case: 'claims no source swaps while calling the swap-and-bridge function',
				change: (data: Struct) => {
					data.hasSourceSwaps = false;
				}
			},
			{
				case: 'goes to another chain',
				change: (data: Struct) => {
					data.destinationChainId = 1n;
				}
			},
			{
				case: 'pays someone else',
				change: (data: Struct) => {
					data.receiver = elsewhere;
				}
			}
		])('should refuse bridge data that $case', ({ change }) => {
			expectRejected(changeAcross((args) => change(bridgeArgs(args).bridgeData)));
		});

		it.each([
			{
				field: 'receiverAddress',
				change: (data: Struct) => {
					data.receiverAddress = `0x${'11'.repeat(32)}`;
				}
			},
			{
				field: 'refundAddress',
				change: (data: Struct) => {
					data.refundAddress = `0x${'11'.repeat(32)}`;
				}
			}
		])("should refuse Across data whose $field is not the user's", ({ change }) => {
			expectRejected(changeAcross((args) => change(bridgeArgs(args).facetData)));
		});

		it('should refuse NEAR Intents data that refunds someone else', () => {
			expectRejected(
				changeNear({
					fixture: mockLifiCalldataNearEvm,
					change: (args) => {
						bridgeArgs(args).facetData.refundRecipient = elsewhere;
					}
				})
			);
		});

		// For an EVM destination the facet signs over `bridgeData.receiver` and does not read it.
		it("should not bind NEAR Intents' non-EVM receiver for an EVM destination", () => {
			const fixture = changeNear({
				fixture: mockLifiCalldataNearEvm,
				change: (args) => {
					bridgeArgs(args).facetData.nonEVMReceiver = `0x${'11'.repeat(32)}`;
				}
			});

			expect(() => assertFixture({ fixture })).not.toThrow();
		});

		describe('to Solana', () => {
			it("should refuse a non-EVM receiver that is not the user's Solana key", () => {
				expectRejected(
					changeNear({
						fixture: mockLifiCalldataNearSolana,
						change: (args) => {
							bridgeArgs(args).facetData.nonEVMReceiver = `0x${'11'.repeat(32)}`;
						}
					})
				);
			});

			it('should refuse bridge data that names an EVM receiver instead of the non-EVM sentinel', () => {
				expectRejected(
					changeNear({
						fixture: mockLifiCalldataNearSolana,
						change: (args) => {
							bridgeArgs(args).bridgeData.receiver = mockLifiCalldataUser;
						}
					})
				);
			});

			it('should refuse a request whose recipient is not a Solana address', () => {
				expectRejected({
					...mockLifiCalldataNearSolana,
					request: { ...mockLifiCalldataNearSolana.request, toAddress: 'not-a-solana-address' }
				});
			});

			it('should read the sentinel as LI.FI declares it', () => {
				expect(LIFI_NON_EVM_ADDRESS).toBe('0x11f111f111f111F111f111f111F111f111f111F1');
			});
		});

		describe('source swaps', () => {
			// A DEX swap after the fee forwarding, passing the bridged token through.
			const dexSwap = (token: string): Struct => ({
				callTo: dexRouter,
				approveTo: dexRouter,
				sendingAssetId: token,
				receivingAssetId: token,
				fromAmount: 1n,
				callData: `0x3f0bde25${'00'.repeat(32)}`,
				requiresDeposit: false
			});

			it('should refuse a DEX swap before Across, whose minimum it could undercut', () => {
				expectRejected(
					changeAcross((args) => {
						bridgeArgs(args).steps.push(dexSwap(baseUsdc));
					})
				);
			});

			// NEAR Intents' minimum is signed by LI.FI's backend, together with the amount the swaps
			// must produce.
			it('should accept a DEX swap before NEAR Intents, returning its call', () => {
				const fixture = changeNear({
					fixture: mockLifiCalldataNearEvm,
					change: (args) => {
						bridgeArgs(args).steps.push(dexSwap(ethereumUsdc));
					}
				});

				expect(assertFixture({ fixture })).toEqual([
					{ contract: feeCollector, selector: '0x332d746b' },
					{ contract: dexRouter, selector: '0x3f0bde25' }
				]);
			});

			it('should refuse a bridge that sends another token than the swaps produce', () => {
				expectRejected(
					changeNear({
						fixture: mockLifiCalldataNearEvm,
						change: (args) => {
							bridgeArgs(args).bridgeData.sendingAssetId = elsewhere;
						}
					})
				);
			});

			it('should refuse Across data that sends another token than the bridged one', () => {
				expectRejected(
					changeAcross((args) => {
						bridgeArgs(args).facetData.sendingAssetId = padded(elsewhere);
					})
				);
			});
		});

		describe('payout', () => {
			it.each([
				{ route: 'Across, EVM → EVM', fixture: mockLifiCalldataAcrossEvm },
				{ route: 'NEAR Intents, EVM → EVM', fixture: mockLifiCalldataNearEvm },
				{ route: 'NEAR Intents, EVM → Solana', fixture: mockLifiCalldataNearSolana }
			])('should refuse a minimum output below the one displayed ($route)', ({ fixture }) => {
				expect(() =>
					assertLifiCalldata({
						quote: fixture.quote,
						request: fixture.request,
						diamond,
						displayedToAmountMin: fixture.toAmountMin + 1n,
						userTokenAddresses: []
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should refuse Across paying out another token', () => {
				expectRejected(
					changeAcross((args) => {
						bridgeArgs(args).facetData.receivingAssetId = padded(elsewhere);
					})
				);
			});

			it.each([
				{
					case: 'a bridged amount',
					change: ({ bridgeData }: ReturnType<typeof bridgeArgs>) => {
						bridgeData.minAmount = 1_000_000n;
					}
				},
				{
					case: 'a multiplier',
					change: ({ facetData }: ReturnType<typeof bridgeArgs>) => {
						facetData.outputAmountMultiplier =
							(facetData.outputAmountMultiplier as bigint) - 10n ** 15n;
					}
				}
			])('should refuse Across with $case too low to pay the displayed minimum', ({ change }) => {
				expectRejected(changeAcross((args) => change(bridgeArgs(args))));
			});

			// After source swaps the facet pays what the swaps produce times the multiplier instead.
			it("should not read Across's output amount after source swaps", () => {
				expectAccepted(
					changeAcross((args) => {
						bridgeArgs(args).facetData.outputAmount = 1n;
					})
				);
			});

			it.each([
				{
					route: 'EVM → EVM',
					fixture: mockLifiCalldataNearEvm,
					change: (facetData: Struct) => {
						facetData.destinationAsset = padded(elsewhere);
					}
				},
				{
					route: 'EVM → Solana',
					fixture: mockLifiCalldataNearSolana,
					change: (facetData: Struct) => {
						facetData.destinationAsset = `0x${'11'.repeat(32)}`;
					}
				},
				{
					route: 'EVM → EVM, lower minimum',
					fixture: mockLifiCalldataNearEvm,
					change: (facetData: Struct) => {
						facetData.minAmountOut = mockLifiCalldataNearEvm.toAmountMin - 1n;
					}
				}
			])(
				'should refuse NEAR Intents paying out less or another asset ($route)',
				({ fixture, change }) => {
					expectRejected(
						changeNear({ fixture, change: (args) => change(bridgeArgs(args).facetData) })
					);
				}
			);

			describe('native coin', () => {
				const toNative = ({
					fixture,
					abi,
					toChain = Number(fixture.request.toChain),
					toToken,
					receivingAsset
				}: {
					fixture: LifiCalldataFixture;
					abi: string[];
					toChain?: number;
					toToken: string;
					receivingAsset: { field: string; value: string };
				}): LifiCalldataFixture => ({
					...withArgs({
						fixture,
						abi,
						change: (args) => {
							const { bridgeData, facetData } = bridgeArgs(args);

							bridgeData.destinationChainId = BigInt(toChain);
							facetData[receivingAsset.field] = receivingAsset.value;
						}
					}),
					request: { ...fixture.request, toChain, toToken }
				});

				it('should accept Across paying native ETH out as its wrapped native', () => {
					expectAccepted(
						toNative({
							fixture: mockLifiCalldataAcrossEvm,
							abi: LIFI_ACROSS_V4_ABI,
							toToken: ZERO_ETH_ADDRESS,
							receivingAsset: { field: 'receivingAssetId', value: padded(arbitrumWeth) }
						})
					);
				});

				it.each([
					{ case: 'as itself', toChain: ChainId.ARB, value: padded(ZERO_ETH_ADDRESS) },
					// Across quotes no native output to Polygon, so it has no wrapped native pinned.
					{ case: 'to a chain without one pinned', toChain: ChainId.POL, value: padded(elsewhere) }
				])('should refuse Across paying a native coin out $case', ({ toChain, value }) => {
					expectRejected(
						toNative({
							fixture: mockLifiCalldataAcrossEvm,
							abi: LIFI_ACROSS_V4_ABI,
							toChain,
							toToken: ZERO_ETH_ADDRESS,
							receivingAsset: { field: 'receivingAssetId', value }
						})
					);
				});

				it.each([
					{ route: 'native ETH', fixture: mockLifiCalldataNearEvm, toToken: ZERO_ETH_ADDRESS },
					{
						route: 'native SOL',
						fixture: mockLifiCalldataNearSolana,
						toToken: SYSTEM_PROGRAM_ADDRESS
					}
				])(
					'should accept NEAR Intents paying $route out under its sentinel',
					({ fixture, toToken }) => {
						expectAccepted(
							toNative({
								fixture,
								abi: LIFI_NEAR_INTENTS_ABI,
								toToken,
								receivingAsset: { field: 'destinationAsset', value: padded(nearNative) }
							})
						);
					}
				);
			});

			describe('Across to Solana', () => {
				// The NEAR Intents fixture's own data names the Solana user and USDC's mint as 32 bytes.
				const nearSolanaData = (): Struct => {
					const call = new Interface(LIFI_NEAR_INTENTS_ABI).parseTransaction({
						data: dataOf(mockLifiCalldataNearSolana)
					});

					assertNonNullish(call);

					return (call.args[2] as Result).toObject();
				};

				// The Across fixture sent to the Solana user instead, paying out `receivingAssetId`.
				const toSolana = ({
					toToken,
					receivingAssetId
				}: {
					toToken: string;
					receivingAssetId: unknown;
				}): LifiCalldataFixture => ({
					...changeAcross((args) => {
						const { bridgeData, facetData } = bridgeArgs(args);

						bridgeData.destinationChainId = BigInt(ChainId.SOL);
						bridgeData.receiver = LIFI_NON_EVM_ADDRESS;
						facetData.receiverAddress = nearSolanaData().nonEVMReceiver;
						facetData.receivingAssetId = receivingAssetId;
					}),
					request: {
						...mockLifiCalldataAcrossEvm.request,
						toChain: ChainId.SOL,
						toToken,
						toAddress: mockLifiCalldataSolanaUser
					}
				});

				it('should accept an SPL token named by its mint', () => {
					expectAccepted(
						toSolana({
							toToken: mockLifiCalldataNearSolana.request.toToken,
							receivingAssetId: nearSolanaData().destinationAsset
						})
					);
				});

				// Across has no wrapped native to name native SOL by.
				it('should refuse native SOL', () => {
					expectRejected(
						toSolana({ toToken: SYSTEM_PROGRAM_ADDRESS, receivingAssetId: padded(nearNative) })
					);
				});
			});
		});

		describe('without source swaps', () => {
			// The bridge-only function, built from the Across fixture's own bridge and facet data.
			const startBridge = ({
				change = () => undefined
			}: {
				change?: (params: { bridgeData: Struct; acrossData: Struct }) => void;
			} = {}): LifiCalldataFixture => {
				const facet = new Interface(LIFI_ACROSS_V4_ABI);
				const call = facet.parseTransaction({ data: dataOf(mockLifiCalldataAcrossEvm) });

				assertNonNullish(call);

				const [plainBridgeData, , plainAcrossData] = call.fragment.inputs.map((type, index) =>
					toPlain({ value: call.args[index], type })
				);

				const bridgeData = {
					...(plainBridgeData as Struct),
					hasSourceSwaps: false,
					minAmount: BigInt(mockLifiCalldataAcrossEvm.request.fromAmount)
				};
				const acrossData = plainAcrossData as Struct;

				change({ bridgeData, acrossData });

				return withData({
					fixture: mockLifiCalldataAcrossEvm,
					data: facet.encodeFunctionData('startBridgeTokensViaAcrossV4', [bridgeData, acrossData])
				});
			};

			it('should accept the source token and amount bridged directly, with no swap calls', () => {
				expect(assertFixture({ fixture: startBridge() })).toEqual([]);
			});

			it('should refuse another amount', () => {
				expectRejected(
					startBridge({
						change: ({ bridgeData }) => {
							bridgeData.minAmount = 1n;
						}
					})
				);
			});

			// Without source swaps the facet pays exactly its output amount.
			it('should refuse an Across output amount below the displayed minimum', () => {
				expectRejected(
					startBridge({
						change: ({ acrossData }) => {
							acrossData.outputAmount = mockLifiCalldataAcrossEvm.toAmountMin - 1n;
						}
					})
				);
			});

			// The facet sends a native coin as its own wrapped native, whatever its data names.
			it("should not read Across's own sending token for a native source", () => {
				const fixture = startBridge({
					change: ({ bridgeData, acrossData }) => {
						bridgeData.sendingAssetId = ZERO_ETH_ADDRESS;
						acrossData.sendingAssetId = padded(baseWeth);
					}
				});

				expectAccepted({
					...fixture,
					request: { ...fixture.request, fromToken: ZERO_ETH_ADDRESS }
				});
			});
		});
	});
});
