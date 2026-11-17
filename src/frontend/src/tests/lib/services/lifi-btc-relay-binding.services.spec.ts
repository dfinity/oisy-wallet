import { fetchRelayIntentStatus } from '$lib/rest/relay.rest';
import { bindLifiRelayPayout } from '$lib/services/lifi-btc-relay-binding.services';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import { isLifiRouteExecutable } from '$lib/utils/lifi-calldata.utils';
import { decodeLifiBtcTransaction, lifiBtcMemoText } from '$lib/utils/lifi-swap.utils';
import type { LifiRelayToolData } from '$lib/validation/lifi-relay.validation';
import {
	mockLifiBtcFeeAddress,
	mockLifiBtcRelayQuote,
	mockRelayOrderId,
	mockRelayRequestId
} from '$tests/mocks/lifi-btc.mock';
import { ChainId, type LiFiStep, type QuoteRequestFromAmount } from '@lifi/sdk';

vi.mock('$lib/rest/relay.rest', () => ({
	fetchRelayIntentStatus: vi.fn()
}));

describe('lifi-btc-relay-binding.services', () => {
	const quote = mockLifiBtcRelayQuote;
	const { action } = quote;
	const userAddress = action.fromAddress ?? '';

	const request: QuoteRequestFromAmount = {
		fromChain: ChainId.BTC,
		toChain: action.toChainId,
		fromToken: 'bitcoin',
		toToken: action.toToken.address,
		fromAddress: userAddress,
		toAddress: action.toAddress,
		fromAmount: action.fromAmount,
		slippage: 0.015,
		allowBridges: ['relaydepository']
	};

	const { deposit, memo } = decodeLifiBtcTransaction({
		quote,
		amount: BigInt(action.fromAmount),
		userAddress
	});

	const displayedToAmountMin = BigInt(quote.estimate.toAmountMin);

	const { toolData } = quote.estimate as unknown as { toolData: LifiRelayToolData };

	// The quote with its embedded Relay quote replaced by `edit`'s.
	const withToolData = (edit: (data: LifiRelayToolData) => unknown): LiFiStep => ({
		...quote,
		estimate: {
			...quote.estimate,
			toolData: edit(structuredClone(toolData))
		} as LiFiStep['estimate']
	});

	const bind = (overrides: Partial<Parameters<typeof bindLifiRelayPayout>[0]> = {}) =>
		bindLifiRelayPayout({ quote, deposit, memo, request, displayedToAmountMin, ...overrides });

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(fetchRelayIntentStatus).mockResolvedValue({ status: 'waiting' });
	});

	it('should read the order id from the memo', () => {
		expect(lifiBtcMemoText(memo).split('=')[0]).toBe(mockRelayOrderId);
	});

	it('should take a Relay route as one LI.FI may execute from Bitcoin', () => {
		expect(isLifiRouteExecutable(quote)).toBeTruthy();
	});

	it('should accept the quote, and ask Relay about the request it opened', async () => {
		await expect(bind()).resolves.toBeUndefined();

		expect(fetchRelayIntentStatus).toHaveBeenCalledExactlyOnceWith({
			requestId: mockRelayRequestId
		});
	});

	it.each([
		{
			case: 'no Relay quote',
			quote: {
				...quote,
				estimate: { ...mockLifiBtcRelayQuote.estimate, toolData: undefined } as LiFiStep['estimate']
			}
		},
		{
			case: 'a malformed request id',
			quote: withToolData((data) => ({ ...data, steps: [{ requestId: '0x1234' }] }))
		},
		{
			case: 'a deposit to the Bitcoin chain of another name',
			quote: withToolData((data) => {
				(data.protocol.v2.paymentDetails as { chainId: string }).chainId = 'bitcoin-testnet';

				return data;
			})
		}
	])('should refuse $case as missing or malformed', async ({ quote: badQuote }) => {
		await expect(bind({ quote: badQuote })).rejects.toThrow(
			new LifiQuoteRejectedError('LI.FI quote rejected: its Relay quote is missing or malformed')
		);

		expect(fetchRelayIntentStatus).not.toHaveBeenCalled();
	});

	it.each([
		{
			case: 'another order than the memo',
			edit: (data: LifiRelayToolData) => {
				data.protocol.v2.orderId = `0x${'ab'.repeat(32)}`;
			},
			reason: 'names another order than the memo'
		},
		{
			case: 'another depository',
			edit: (data: LifiRelayToolData) => {
				data.protocol.v2.paymentDetails.depository = mockLifiBtcFeeAddress;
			},
			reason: 'does not take the deposit'
		},
		{
			case: 'another deposit amount',
			edit: (data: LifiRelayToolData) => {
				data.protocol.v2.paymentDetails.amount = '119699';
			},
			reason: 'does not take the deposit'
		},
		{
			case: 'a depository that is no address',
			edit: (data: LifiRelayToolData) => {
				data.protocol.v2.paymentDetails.depository = 'not-an-address';
			},
			reason: 'does not take the deposit'
		},
		{
			case: 'another destination chain',
			edit: (data: LifiRelayToolData) => {
				data.details.currencyOut.currency.chainId = 8453;
			},
			reason: 'pays out another asset than the one reviewed'
		},
		{
			case: 'another destination token',
			edit: (data: LifiRelayToolData) => {
				data.details.currencyOut.currency.address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
			},
			reason: 'pays out another asset than the one reviewed'
		},
		{
			case: 'a minimum below the one displayed',
			edit: (data: LifiRelayToolData) => {
				data.details.currencyOut.minimumAmount = `${displayedToAmountMin - 1n}`;
			},
			reason: 'pays out less than the displayed minimum'
		}
	])('should refuse a Relay quote with $case, without asking Relay', async ({ edit, reason }) => {
		await expect(
			bind({
				quote: withToolData((data) => {
					edit(data);

					return data;
				})
			})
		).rejects.toThrow(
			new LifiQuoteRejectedError(`LI.FI quote rejected: its Relay quote ${reason}`)
		);

		expect(fetchRelayIntentStatus).not.toHaveBeenCalled();
	});

	it('should compare an EVM destination token in any case', async () => {
		await expect(
			bind({
				quote: withToolData((data) => {
					data.details.currencyOut.currency.address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

					return data;
				}),
				request: { ...request, toToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' }
			})
		).resolves.toBeUndefined();
	});

	describe('a Solana destination', () => {
		const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
		const solanaRequest = { ...request, toChain: ChainId.SOL, toToken: usdcMint };

		const toSolana = ({ chainId, address }: { chainId: number; address: string }) =>
			withToolData((data) => {
				data.details.currencyOut.currency = { chainId, address };

				return data;
			});

		it("should accept Relay's own Solana chain id and the exact mint", async () => {
			await expect(
				bind({ quote: toSolana({ chainId: 792703809, address: usdcMint }), request: solanaRequest })
			).resolves.toBeUndefined();
		});

		it.each([
			{ case: "LI.FI's Solana chain id", chainId: ChainId.SOL, address: usdcMint },
			{ case: 'the mint in another case', chainId: 792703809, address: usdcMint.toLowerCase() }
		])('should refuse $case', async ({ chainId, address }) => {
			await expect(
				bind({ quote: toSolana({ chainId, address }), request: solanaRequest })
			).rejects.toThrow('pays out another asset than the one reviewed');
		});
	});

	it.each(['unknown', 'success', 'pending'])(
		'should refuse a request Relay reports as %s',
		async (status) => {
			vi.mocked(fetchRelayIntentStatus).mockResolvedValue({ status });

			await expect(bind()).rejects.toThrow(
				new LifiQuoteRejectedError(
					`LI.FI quote rejected: its Relay quote is not one Relay awaits a deposit for (${status})`
				)
			);
		}
	);

	it('should refuse when Relay cannot be asked', async () => {
		const err = new Error('Relay status lookup failed: 503');
		vi.mocked(fetchRelayIntentStatus).mockRejectedValue(err);

		await expect(bind()).rejects.toBe(err);
	});
});
