import {
	LIFI_ACROSS_V4_ABI,
	LIFI_APPROVE_TO_ONLY_SELECTOR,
	LIFI_GENERIC_SWAP_ABI,
	LIFI_NEAR_INTENTS_ABI,
	LIFI_NON_EVM_ADDRESS
} from '$eth/constants/lifi.constants';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import { assertLifiCalldata } from '$lib/utils/lifi-calldata.utils';
import {
	mockLifiCalldataAcrossEvm,
	mockLifiCalldataNearEvm,
	mockLifiCalldataNearSolana,
	mockLifiCalldataSameChain,
	mockLifiCalldataUser,
	type LifiCalldataFixture
} from '$tests/mocks/lifi-calldata.mock';
import { assertNonNullish } from '@dfinity/utils';
import type { LiFiStep } from '@lifi/sdk';
import { Interface, type ParamType, type Result } from 'ethers/abi';

type Struct = Record<string, unknown>;

describe('lifi-calldata.utils', () => {
	const diamond = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';

	// From the fixtures' own calldata: LI.FI's fee collector, and the DEX of the same-chain route.
	const feeCollector = '0xCE40449B773a3E6E5e769ADb4e567179d4828cbd';
	const dexRouter = '0xC87De04e2EC1F4282dFF2933A2D58199f688fC3d';
	const baseUsdc = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
	const elsewhere = '0x000000000000000000000000000000000000bEEF';

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

	const expectRejected = (fixture: LifiCalldataFixture) =>
		expect(() => assertFixture({ fixture })).toThrow(LifiQuoteRejectedError);

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

		describe('without source swaps', () => {
			// The bridge-only function, built from the Across fixture's own bridge and facet data.
			const startBridge = ({ minAmount }: { minAmount: bigint }): LifiCalldataFixture => {
				const facet = new Interface(LIFI_ACROSS_V4_ABI);
				const call = facet.parseTransaction({ data: dataOf(mockLifiCalldataAcrossEvm) });

				assertNonNullish(call);

				const [bridgeData, , acrossData] = call.fragment.inputs.map((type, index) =>
					toPlain({ value: call.args[index], type })
				);

				return withData({
					fixture: mockLifiCalldataAcrossEvm,
					data: facet.encodeFunctionData('startBridgeTokensViaAcrossV4', [
						{ ...(bridgeData as Struct), hasSourceSwaps: false, minAmount },
						acrossData
					])
				});
			};

			it('should accept the source token and amount bridged directly, with no swap calls', () => {
				expect(
					assertFixture({
						fixture: startBridge({
							minAmount: BigInt(mockLifiCalldataAcrossEvm.request.fromAmount)
						})
					})
				).toEqual([]);
			});

			it('should refuse another amount', () => {
				expectRejected(startBridge({ minAmount: 1n }));
			});
		});
	});
});
