import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import type { IcCkInterface, IcCkToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { ChainFusionFee, ChainFusionPair } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import {
	asCkTwinOf,
	chainFusionCompatibleDestinations,
	chainFusionSupportedSourceTokens,
	computeChainFusionReceiveAmount,
	toChainFusionPairs
} from '$lib/utils/chain-fusion-swap.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcCkToken, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';

let mockEnabled = true;

vi.mock('$env/chain-fusion-swap.env', () => ({
	get CHAIN_FUSION_SWAP_ENABLED() {
		return mockEnabled;
	}
}));

const CKUSDC_LEDGER_CANISTER_ID = 'xevnm-gaaaa-aaaar-qafnq-cai';
const CKETH_MINTER_CANISTER_ID = 'sv3dd-oaaaa-aaaar-qacoa-cai';

const makeCkInterface = ({
	ledgerCanisterId,
	twinToken
}: {
	ledgerCanisterId: string;
	twinToken?: Token;
}): IcCkInterface => ({
	ledgerCanisterId,
	minterCanisterId: CKETH_MINTER_CANISTER_ID,
	...(twinToken !== undefined && { twinToken })
});

const makeCkToken = ({
	ledgerCanisterId,
	twinToken,
	symbol
}: {
	ledgerCanisterId: string;
	twinToken: Token;
	symbol: string;
}): IcCkToken => ({
	...mockValidIcCkToken,
	id: parseTokenId(symbol),
	symbol,
	ledgerCanisterId,
	twinToken
});

const CKETH_INTERFACE = makeCkInterface({
	ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
	twinToken: ETHEREUM_TOKEN
});
const CKUSDC_INTERFACE = makeCkInterface({
	ledgerCanisterId: CKUSDC_LEDGER_CANISTER_ID,
	twinToken: USDC_TOKEN
});
const CKBTC_INTERFACE = makeCkInterface({
	ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
	twinToken: BTC_MAINNET_TOKEN
});

const PAIRS: ChainFusionPair[] = toChainFusionPairs([
	CKETH_INTERFACE,
	CKUSDC_INTERFACE,
	CKBTC_INTERFACE
]);

const ckEthToken = makeCkToken({
	ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
	twinToken: ETHEREUM_TOKEN,
	symbol: 'ckETH'
});
const ckUsdcToken = makeCkToken({
	ledgerCanisterId: CKUSDC_LEDGER_CANISTER_ID,
	twinToken: USDC_TOKEN,
	symbol: 'ckUSDC'
});
const ckBtcToken = makeCkToken({
	ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
	twinToken: BTC_MAINNET_TOKEN,
	symbol: 'ckBTC'
});

const importedUsdcToken: Token = { ...USDC_TOKEN, id: parseTokenId('USDC') };

// `mockValidIcrcToken` carries the mainnet ckBTC ledger id, which is a ck ledger now that
// the Bitcoin pair is enabled — so a genuinely unrelated ICRC token needs its own id.
const nonCkIcrcToken = {
	...mockValidIcrcToken,
	ledgerCanisterId: 'uf2wh-taaaa-aaaaq-aabna-cai'
};

const makeFee = (fee: bigint): ChainFusionFee => ({
	fee,
	token: ETHEREUM_TOKEN,
	labelPath: 'fee.text.estimated_eth',
	deductedFromAmount: true
});

const makeOnTopFee = (fee: bigint): ChainFusionFee => ({
	fee,
	token: ETHEREUM_TOKEN,
	labelPath: 'fee.text.fee'
});

describe('chain-fusion-swap.utils', () => {
	beforeEach(() => {
		mockEnabled = true;
	});

	describe('toChainFusionPairs', () => {
		it('should map every mainnet ck definition to a pair', () => {
			expect(PAIRS).toStrictEqual([
				{ ckLedgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID, twinToken: ETHEREUM_TOKEN },
				{ ckLedgerCanisterId: CKUSDC_LEDGER_CANISTER_ID, twinToken: USDC_TOKEN },
				{ ckLedgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID, twinToken: BTC_MAINNET_TOKEN }
			]);
		});

		it('should drop definitions without a twin token', () => {
			expect(
				toChainFusionPairs([makeCkInterface({ ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID })])
			).toStrictEqual([]);
		});

		it('should drop testnet twins', () => {
			expect(
				toChainFusionPairs([
					makeCkInterface({
						ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
						twinToken: SEPOLIA_TOKEN
					}),
					makeCkInterface({
						ledgerCanisterId: CKUSDC_LEDGER_CANISTER_ID,
						twinToken: SEPOLIA_USDC_TOKEN
					})
				])
			).toStrictEqual([]);
		});

		it('should keep the first definition of a duplicated ck ledger', () => {
			expect(
				toChainFusionPairs([
					CKETH_INTERFACE,
					makeCkInterface({
						ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
						twinToken: BASE_ETH_TOKEN
					})
				])
			).toStrictEqual([
				{ ckLedgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID, twinToken: ETHEREUM_TOKEN }
			]);
		});
	});

	describe('chainFusionSupportedSourceTokens', () => {
		it('should return every enabled ck ledger for the icp category', () => {
			expect(chainFusionSupportedSourceTokens({ category: 'icp', pairs: PAIRS })).toStrictEqual(
				new Set([
					IC_CKETH_LEDGER_CANISTER_ID,
					CKUSDC_LEDGER_CANISTER_ID,
					IC_CKBTC_LEDGER_CANISTER_ID
				])
			);
		});

		it('should return the native identifier for the btc category', () => {
			expect(chainFusionSupportedSourceTokens({ category: 'btc', pairs: PAIRS })).toStrictEqual(
				new Set([BTC_MAINNET_TOKEN.symbol.toLowerCase()])
			);
		});

		it('should return the native identifiers for the evm category', () => {
			expect(chainFusionSupportedSourceTokens({ category: 'evm', pairs: PAIRS })).toStrictEqual(
				new Set([ETHEREUM_TOKEN.symbol.toLowerCase(), USDC_TOKEN.address.toLowerCase()])
			);
		});

		it('should return nothing for an unrelated category', () => {
			expect(chainFusionSupportedSourceTokens({ category: 'sol', pairs: PAIRS })).toStrictEqual(
				new Set()
			);
		});

		it('should return nothing when the flag is off', () => {
			mockEnabled = false;

			expect(chainFusionSupportedSourceTokens({ category: 'icp', pairs: PAIRS })).toStrictEqual(
				new Set()
			);
			expect(chainFusionSupportedSourceTokens({ category: 'evm', pairs: PAIRS })).toStrictEqual(
				new Set()
			);
		});
	});

	describe('chainFusionCompatibleDestinations', () => {
		it('should narrow a ck source to its native twin', () => {
			expect(
				chainFusionCompatibleDestinations({ sourceToken: ckEthToken, pairs: PAIRS })
			).toStrictEqual({ evm: new Set([ETHEREUM_TOKEN.symbol.toLowerCase()]) });

			expect(
				chainFusionCompatibleDestinations({ sourceToken: ckUsdcToken, pairs: PAIRS })
			).toStrictEqual({ evm: new Set([USDC_TOKEN.address.toLowerCase()]) });
		});

		it('should narrow a native source to its ck twin', () => {
			expect(
				chainFusionCompatibleDestinations({ sourceToken: ETHEREUM_TOKEN, pairs: PAIRS })
			).toStrictEqual({ icp: new Set([IC_CKETH_LEDGER_CANISTER_ID]) });

			expect(
				chainFusionCompatibleDestinations({ sourceToken: USDC_TOKEN, pairs: PAIRS })
			).toStrictEqual({ icp: new Set([CKUSDC_LEDGER_CANISTER_ID]) });
		});

		it('should offer nothing for a same-symbol token from another EVM network', () => {
			expect(
				chainFusionCompatibleDestinations({ sourceToken: BASE_USDC_TOKEN, pairs: PAIRS })
			).toBeUndefined();

			expect(
				chainFusionCompatibleDestinations({ sourceToken: BASE_ETH_TOKEN, pairs: PAIRS })
			).toBeUndefined();
		});

		it('should narrow the Bitcoin pair in both directions', () => {
			expect(
				chainFusionCompatibleDestinations({ sourceToken: ckBtcToken, pairs: PAIRS })
			).toStrictEqual({ btc: new Set([BTC_MAINNET_TOKEN.symbol.toLowerCase()]) });

			expect(
				chainFusionCompatibleDestinations({ sourceToken: BTC_MAINNET_TOKEN, pairs: PAIRS })
			).toStrictEqual({ icp: new Set([IC_CKBTC_LEDGER_CANISTER_ID]) });
		});

		it('should offer nothing for a testnet Bitcoin token', () => {
			expect(
				chainFusionCompatibleDestinations({ sourceToken: BTC_TESTNET_TOKEN, pairs: PAIRS })
			).toBeUndefined();
		});

		it('should offer nothing for an IC token that is not a ck ledger', () => {
			expect(
				chainFusionCompatibleDestinations({ sourceToken: nonCkIcrcToken, pairs: PAIRS })
			).toBeUndefined();
		});

		it('should offer nothing when the flag is off', () => {
			mockEnabled = false;

			expect(
				chainFusionCompatibleDestinations({ sourceToken: ckEthToken, pairs: PAIRS })
			).toBeUndefined();

			expect(
				chainFusionCompatibleDestinations({ sourceToken: ETHEREUM_TOKEN, pairs: PAIRS })
			).toBeUndefined();
		});
	});

	describe('asCkTwinOf', () => {
		it('should accept a ck token against its native twin', () => {
			expect(asCkTwinOf({ ckToken: ckEthToken, nativeToken: ETHEREUM_TOKEN })).toBeDefined();
			expect(asCkTwinOf({ ckToken: ckUsdcToken, nativeToken: USDC_TOKEN })).toBeDefined();
			expect(asCkTwinOf({ ckToken: ckBtcToken, nativeToken: BTC_MAINNET_TOKEN })).toBeDefined();
		});

		it('should reject the pair given the wrong way round', () => {
			expect(asCkTwinOf({ ckToken: ETHEREUM_TOKEN, nativeToken: ckEthToken })).toBeUndefined();
		});

		it('should reject a mismatched ck pair', () => {
			expect(asCkTwinOf({ ckToken: ckEthToken, nativeToken: USDC_TOKEN })).toBeUndefined();
		});

		it('should reject a same-symbol token from another EVM network', () => {
			expect(asCkTwinOf({ ckToken: ckUsdcToken, nativeToken: BASE_USDC_TOKEN })).toBeUndefined();
			expect(asCkTwinOf({ ckToken: ckEthToken, nativeToken: BASE_ETH_TOKEN })).toBeUndefined();
		});

		it('should reject a user-imported duplicate of a curated token', () => {
			expect(asCkTwinOf({ ckToken: ckUsdcToken, nativeToken: importedUsdcToken })).toBeUndefined();
		});

		it('should reject an IC token carrying no twin', () => {
			expect(
				asCkTwinOf({ ckToken: mockValidIcrcToken, nativeToken: ETHEREUM_TOKEN })
			).toBeUndefined();
		});

		it('should reject a non-IC token on the ck side', () => {
			expect(asCkTwinOf({ ckToken: USDC_TOKEN, nativeToken: ETHEREUM_TOKEN })).toBeUndefined();
		});
	});

	describe('computeChainFusionReceiveAmount', () => {
		it('should subtract every source fee', () => {
			expect(
				computeChainFusionReceiveAmount({
					amount: 100n,
					sourceFees: [makeFee(10n), makeFee(5n)]
				})
			).toBe(85n);
		});

		it('should return the amount when there is no fee', () => {
			expect(computeChainFusionReceiveAmount({ amount: 100n, sourceFees: [] })).toBe(100n);
		});

		it('should ignore a fee charged on top of the amount', () => {
			expect(
				computeChainFusionReceiveAmount({ amount: 100n, sourceFees: [makeOnTopFee(10n)] })
			).toBe(100n);
		});

		it('should subtract only the deducted fee when the two are mixed', () => {
			expect(
				computeChainFusionReceiveAmount({
					amount: 100n,
					sourceFees: [makeOnTopFee(10n), makeFee(5n)]
				})
			).toBe(95n);
		});

		it('should clamp at zero when the fees reach the amount', () => {
			expect(computeChainFusionReceiveAmount({ amount: 100n, sourceFees: [makeFee(100n)] })).toBe(
				ZERO
			);

			expect(
				computeChainFusionReceiveAmount({ amount: 100n, sourceFees: [makeFee(80n), makeFee(80n)] })
			).toBe(ZERO);
		});
	});
});
