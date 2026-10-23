import type { SolAddress } from '$sol/types/address';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import { decodeTransactionMessage } from '$sol/utils/sol-transactions.utils';
import { ChainId, type LiFiStep, type QuoteRequestFromAmount } from '@lifi/sdk';
import {
	address,
	decompileTransactionMessage,
	getCompiledTransactionMessageDecoder,
	type Address
} from '@solana/kit';

// Real `li.quest/v1/quote` Solana → Solana responses with `allowExchanges=jupiter`, captured on
// 2026-10-23 for the wallets below and cut down to what the binding reads. The transactions are
// LI.FI's own, byte for byte. Each lookup table is kept to the entries its message reads.

export const mockLifiSolUser = 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg';

// A wallet that has a wrapped SOL account.
export const mockLifiSolWrappedSolUser = '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9';

export interface LifiSolTransactionFixture {
	request: QuoteRequestFromAmount;
	toAmountMin: bigint;
	quote: LiFiStep;
	// The entries the message reads of each lookup table, by index.
	lookups: Record<SolAddress, Record<number, SolAddress>>;
}

const quoteWith = ({
	toAmount,
	toAmountMin,
	data
}: {
	toAmount: string;
	toAmountMin: string;
	data: string;
}): LiFiStep =>
	({
		tool: 'jupiter',
		estimate: { toAmount, toAmountMin },
		transactionRequest: { data }
	}) as LiFiStep;

// 0.1 SOL → USDC for a wallet with no token accounts: a temporary wrapped SOL account, the
// USDC account created, the fee in SOL. LI.FI rounded this `toAmountMin` up.
export const mockLifiSolSolToUsdc: LifiSolTransactionFixture = {
	request: {
		fromChain: ChainId.SOL,
		toChain: ChainId.SOL,
		fromToken: '11111111111111111111111111111111',
		toToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		fromAmount: '100000000',
		fromAddress: mockLifiSolUser,
		toAddress: mockLifiSolUser,
		slippage: 0.005,
		allowExchanges: ['jupiter']
	},
	toAmountMin: 10_338_547n,
	quote: quoteWith({
		toAmount: '10390499',
		toAmountMin: '10338547',
		data: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAKDg3DCB8iG/qh2fapNS7+A6KwO1p4JbWqXBb+DHdxyv/jHoxPq4mUSUyPHlwSh0RbKRfWDEPHmqlZFi9dYABZjTKB19GaWCSjjeRRw0rvOJBUO31dT3PPAxwTXjgLsSMPKfp5hOh3/qcoma73bNFfkJQ495Yf4ERt8eabAS/EcRUXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoPQ3SgjVP7wrjsOIn03zYnKJm+xfd+PfLfM775OvcVUTp3SGPVLsppMSOjpkw/4PzDMBCIpMnlHONn7m2M/dmjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+FmY69kS2GlZqQOdeKgbH2ACUdLF9msTqoiNem+tJzm8DwMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmzpAAAAAtD/6J/XX9kp0wJsfKVh53ksJqzbfyd1RSzIap7OM5egEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwan1RcYx3TJKFZjmGkdXraLXrijm0ttXHNVWyEAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKna8+c9AVxvgbvkM/poOBb5RaMUu8wN+DMdSpRLEseRDAoJAAUCwFwVAAkACQP1AwQAAAAAAAUCDAgJAIaSngxsJg0ABAIAAQwCAAAAkNADAAAAAAAHBgADABQEDQEBBAIAAwwCAAAAcBDyBQAAAAANAQMBEQcGAAIAEgQNAQELGgADAhQSDQ0LCgsRAA4QDxQSAwINBAAGBhMVKLtk+swxxK8UcBDyBQAAAADji54AAAAAADIAAAAAAAEAAAC1ARAnAAENAwMAAAEJARP2eHSgLfDYc9RFsZ3gHFWXI0g1IoC70DnrAmB8wlf2A9XXmQXWqZgT0A=='
	}),
	lookups: {
		'2Lvj7QkiAWMHziSQbP4yZcoYJPLTESKUWdscnpbj7Ham': {
			19: 'So11111111111111111111111111111111111111112',
			152: 'J1to1yufRnoWn81KYg1XkTWzmKjnYSnmE2VY8DGUJ9Qv',
			153: 'HgFLBWQugxt6qbPaWiwXjrqauXdQmcpMV6H6t8ttD8s1',
			169: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
			208: 'Sysvar1nstructions1111111111111111111111111',
			213: '7yD7gfXv49SFxhx9uTc11dEd7Nj98rGWeYMdZJgheZbG',
			214: '3TK9D8aoBFYjYZtKCjciPrVrRStsnvo7KmpcJqDavpaU',
			215: 'FzvRbXDdrsYVMa9KohXyQytWNAZAo4PsF8yujDH7KCfG'
		}
	}
};

// 20 USDC → SOL: the fee in USDC, a temporary wrapped SOL account receiving the output and closed
// to the user.
export const mockLifiSolUsdcToSol: LifiSolTransactionFixture = {
	request: {
		fromChain: ChainId.SOL,
		toChain: ChainId.SOL,
		fromToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		toToken: '11111111111111111111111111111111',
		fromAmount: '20000000',
		fromAddress: mockLifiSolUser,
		toAddress: mockLifiSolUser,
		slippage: 0.005,
		allowExchanges: ['jupiter']
	},
	toAmountMin: 190_558_418n,
	quote: quoteWith({
		toAmount: '191515998',
		toAmountMin: '190558418',
		data: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAKDg3DCB8iG/qh2fapNS7+A6KwO1p4JbWqXBb+DHdxyv/jcvRFs6GawEjSqSj+B3TPe4te+nxkV8vMvILs8OrJPHmB19GaWCSjjeRRw0rvOJBUO31dT3PPAxwTXjgLsSMPKfp5hOh3/qcoma73bNFfkJQ495Yf4ERt8eabAS/EcRUXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoPQ3SgjVP7wrjsOIn03zYnKJm+xfd+PfLfM775OvcVUTp3SGPVLsppMSOjpkw/4PzDMBCIpMnlHONn7m2M/dmjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+FmY69kS2GlZqQOdeKgbH2ACUdLF9msTqoiNem+tJzm8DwMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmzpAAAAAtD/6J/XX9kp0wJsfKVh53ksJqzbfyd1RSzIap7OM5egEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwan1RcYx3TJKFZjmGkdXraLXrijm0ttXHNVWyEAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKlsb8h86Eu67HpayRjT451IOpXoMFGSyo/MtKvW7Sn6owcJAAUCwFwVAAkACQOQ0AMAAAAAAAUCDAgJAFtLNB9yxScADQQCEgEACgxQwwAAAAAAAAYHBgADABQEDQEBCxoAAgMSFA0NCwoLEQAOEA8UEgMCDQQABgYTFSi7ZPrMMcSvFLBpMAEAAAAAXk1qCwAAAAAyAAAAAAABAAAAtQAQJwABDQMDAAABCQET9nh0oC3w2HPURbGd4BxVlyNINSKAu9A56wJgfMJX9gPV15kF1qmYE9A='
	}),
	lookups: {
		'2Lvj7QkiAWMHziSQbP4yZcoYJPLTESKUWdscnpbj7Ham': {
			19: 'So11111111111111111111111111111111111111112',
			152: 'J1to1yufRnoWn81KYg1XkTWzmKjnYSnmE2VY8DGUJ9Qv',
			153: 'HgFLBWQugxt6qbPaWiwXjrqauXdQmcpMV6H6t8ttD8s1',
			169: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
			208: 'Sysvar1nstructions1111111111111111111111111',
			213: '7yD7gfXv49SFxhx9uTc11dEd7Nj98rGWeYMdZJgheZbG',
			214: '3TK9D8aoBFYjYZtKCjciPrVrRStsnvo7KmpcJqDavpaU',
			215: 'FzvRbXDdrsYVMa9KohXyQytWNAZAo4PsF8yujDH7KCfG'
		}
	}
};

// 0.1 SOL → USDC for a wallet that has a wrapped SOL account, holding about 1,328 wSOL: the route
// wraps into that account and closes it. LI.FI rounded this `toAmountMin` up.
export const mockLifiSolSolToUsdcWithWsolAccount: LifiSolTransactionFixture = {
	request: {
		fromChain: ChainId.SOL,
		toChain: ChainId.SOL,
		fromToken: '11111111111111111111111111111111',
		toToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		fromAmount: '100000000',
		fromAddress: mockLifiSolWrappedSolUser,
		toAddress: mockLifiSolWrappedSolUser,
		slippage: 0.005,
		allowExchanges: ['jupiter']
	},
	toAmountMin: 10_338_656n,
	quote: quoteWith({
		toAmount: '10390609',
		toAmountMin: '10338656',
		data: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAIDEjAG1BZAFRV2dywxrzs3LT7Wy6rwamoK1c5K6qkDwTmHoxPq4mUSUyPHlwSh0RbKRfWDEPHmqlZFi9dYABZjTLexN5EZPC5fF7Dn+SK+CEsx3/tGVLagUl0jVROYkvrAA2EwXGYeJ7mWPxMVaF3vlYXCnmMNbOFc8E6pmUiBhwsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoPQ3SgjVP7wrjsOIn03zYnKJm+xfd+PfLfM775OvcVZjr2RLYaVmpA514qBsfYAJR0sX2axOqiI16b60nObwPAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAC0P/on9df2SnTAmx8pWHneSwmrNt/J3VFLMhqns4zl6AR51VvyMcBu7nTFbs5oFQf9sbLeo/SOUQKxzaJWvBOPBqfVFxjHdMkoVmOYaR1etoteuKObS21cc1VbIQAAAAAG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqWeUYrcSdde8o4mV4OfZga5myUUsr0abXS+iRM18KIkPCAcABQJIOgIABwAJA+3fAwAAAAAABQIKBgkAf4FNsFxCQwAEAgABDAIAAACQ0AMAAAAAAAQCAAMMAgAAAHAQ8gUAAAAACwEDAREJGQADAhMSCwsJCAkVEAwADQ4DAhMSCwsUEQ8ou2T6zDHErxRwEPIFAAAAAFGMngAAAAAAMgAAAAAAAQAAALIBECcAAQsDAwAAAQkBe0py0Uad3W0ewrGfk9/a250KTCImWZsSNDJ5feCtvX8DqKmgB6WipBAHp6E='
	}),
	lookups: {
		'9JGzPYdYzjGntWuHuzDSnRLKa7v6CcZ8dhZBGBSccuDp': {
			7: 'So11111111111111111111111111111111111111112',
			16: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
			160: '9t4P5wMwfFkyn92Z7hf463qYKEZf8ERVZsGBEPNp8uJx',
			161: 'TessVdML9pBGgG9yGks7o4HewRaXVAMuoVj4x83GLQH',
			162: '8ekCy2jHHUbW2yeNGFWYJT9Hm9FW7SvZcZK66dSZCDiF',
			164: 'BAT1Ndpu5gbLTp2AZkSXP79LJBZfCH4B3zGhi6LtvdhK',
			165: '4cG31VNF9TzFinNc7BmnjhFvGjxkY3sCETVMtMgbrhPs',
			167: 'Sysvar1nstructions1111111111111111111111111',
			168: '4U2JzGENeMhYuVMGMUeLdzPP9d4PwqnKX9iLxjwPXZU8',
			169: '5pVN5XZB8cYBjNLFrsBCPWkCQBan5K5Mq2dWGzwPgGJV'
		}
	}
};

// 0.1 SOL → PYUSD, a Token-2022 mint: the PYUSD account created under Token-2022, USDC as an
// intermediate, and Obsidian, outside the known programs, reached by Jupiter.
export const mockLifiSolSolToPyusd: LifiSolTransactionFixture = {
	request: {
		fromChain: ChainId.SOL,
		toChain: ChainId.SOL,
		fromToken: '11111111111111111111111111111111',
		toToken: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
		fromAmount: '100000000',
		fromAddress: mockLifiSolUser,
		toAddress: mockLifiSolUser,
		slippage: 0.005,
		allowExchanges: ['jupiter']
	},
	toAmountMin: 10_337_358n,
	quote: quoteWith({
		toAmount: '10389305',
		toAmountMin: '10337358',
		data: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAJDg3DCB8iG/qh2fapNS7+A6KwO1p4JbWqXBb+DHdxyv/jHoxPq4mUSUyPHlwSh0RbKRfWDEPHmqlZFi9dYABZjTKB19GaWCSjjeRRw0rvOJBUO31dT3PPAxwTXjgLsSMPKaY1NsgHNDOWHLkR5I3SOraO1Wx2Zzx873iVt5pm4poe+nmE6Hf+pyiZrvds0V+QlDj3lh/gRG3x5psBL8RxFRcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACg9DdKCNU/vCuOw4ifTfNicomb7F93498t8zvvk69xVjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+FmY69kS2GlZqQOdeKgbH2ACUdLF9msTqoiNem+tJzm8DwMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmzpAAAAAtD/6J/XX9kp0wJsfKVh53ksJqzbfyd1RSzIap7OM5egEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwan1RcYx3TJKFZjmGkdXraLXrijm0ttXHNVWyEAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKnXjtMi0x7E+nz8rKf++ZKAfg9DuppAtcziuYnbus30JwsJAAUCwFwVAAkACQNSDQMAAAAAAAYCDAgJACJLrrMgp6AABQIAAQwCAAAAkNADAAAAAAAHBgAEABgFDQEBBQIABAwCAAAAcBDyBQAAAAANAQQBEQcGAAIAFgUNAQEHBgADABUFGQEBCyIABAMYFQ0ZCwoLGwAaFBMEAg0cFwAAEgUDAhEOGRUNFg8QLbtk+swxxK8UcBDyBQAAAAA5h54AAAAAADIAAAAAAAIAAABtECcAAXQAECcBAg0DBAAAAQkCq3lzUZQqOcXYhbD+r7F6uqc5hN5mQxWIeGrXRlggSjUFHhodGxYFGCECEyDtdTX+0eFJCf+wcfKJEhynFBebBgfVahM1WEKch0zDuAJIFQNDREY='
	}),
	lookups: {
		CYN8QfFfXEtMZZKppoNxQwuuqnZZKHfk9G6DzprNRjBS: {
			2: 'MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms',
			19: 'So11111111111111111111111111111111111111112',
			22: 'GVJfHJsvrsWZmVj2JVQ3KyY1n7azyi8Z2FdBPxucUe58',
			24: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
			26: '5Ycu1FCKX7TTWmScXvzGkYCpJxQw8s2FYMQa9V4K86F1',
			27: 'DXK4yMpigbTSqv33nJk1tJucXB4E3rDmTXn3yZmiFAXt',
			29: 'CG8vBSopUJE3SvW3bNaerqj2rrtBX2U13AeB1tHTvcrM',
			30: '3iCcc5iXwqtnZeJ3x5aui6j4SCAGSXwz6fDYjr2nueVA',
			32: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
			33: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
		},
		GywHc7isiWUeXsHYh4XqtWvJL55yLVv8oK3qsKahXsLK: {
			21: 'F7oAPjAgMCER3RAFJ5vQAJ22Yvj8YHybCPeLZaWadeRo',
			67: '5JGaah517gVYUkNLJ4Dbm6PEpAcsX6vupRV48jnGa3PY',
			68: 'HBVw6bZtcCaezhcBrmfyXBSBRWCdv72271xQ4GPvms2z',
			70: 'Sysvar1nstructions1111111111111111111111111',
			72: 'DCikatrr1i4qAtSExtxGywxic2xhaEpSiHcb9r5wLiBo'
		}
	}
};

// 20 USDC → USDT: the fee in USDC, Deriverse reached by Jupiter, no wrapped SOL at all. LI.FI
// rounded this `toAmountMin` up.
export const mockLifiSolUsdcToUsdt: LifiSolTransactionFixture = {
	request: {
		fromChain: ChainId.SOL,
		toChain: ChainId.SOL,
		fromToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		toToken: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
		fromAmount: '20000000',
		fromAddress: mockLifiSolUser,
		toAddress: mockLifiSolUser,
		slippage: 0.005,
		allowExchanges: ['jupiter']
	},
	toAmountMin: 19_872_428n,
	quote: quoteWith({
		toAmount: '19972289',
		toAmountMin: '19872428',
		data: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAJDQ3DCB8iG/qh2fapNS7+A6KwO1p4JbWqXBb+DHdxyv/jcvRFs6GawEjSqSj+B3TPe4te+nxkV8vMvILs8OrJPHmB19GaWCSjjeRRw0rvOJBUO31dT3PPAxwTXjgLsSMPKY+JIUcYrcA2Rcc6B/O0eqxyvMfBB7A40laaSCC+VoXmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoPQ3SgjVP7wrjsOIn03zYnKJm+xfd+PfLfM775OvcVYyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZmOvZEthpWakDnXioGx9gAlHSxfZrE6qIjXpvrSc5vA8DBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAALQ/+if11/ZKdMCbHylYed5LCas238ndUUsyGqezjOXoBHnVW/IxwG7udMVuzmgVB/2xst6j9I5RArHNola8E48Gp9UXGMd0yShWY5hpHV62i164o5tLbVxzVVshAAAAAAbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpLrW88rb6VYx4onbA0h1si/kgqqw/pWHI5OOboTHMF9YGCAAFAsBcFQAIAAkDQA0DAAAAAAAFAgsHCQBg7BgfossRAAwEAhYBAAoMUMMAAAAAAAAGBgYAAwAXBAwBAQoaAAIDFhcMDAoJChUAFxYUDxMOERINEAMCDAwsu2T6zDHErxSwaTABAAAAAMHAMAEAAAAAMgAAAAAAAQAAAKEAAQAAABAnAAEB/TR9IheQagR1Tsz8n9AleE26MF6DsmSCnSKsDMVsRj8IkpCVk5yZm5gDkTZ+'
	}),
	lookups: {
		J3QZzmNmLSvrivCETneVQuBzCbMi67o2pM5gfYEeWHhx: {
			54: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
			126: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
			144: 'AYhievvcVNZ8ATrSeVTUPeEX2JAz1RhAnBp5CUmxYjy4',
			145: 'DRVSpZ2YUYYKgZP8XtLhAGtT1zYSCKzeHfb4DgRnrgqD',
			146: '5DMkwX1edkbAywTecSjP2nyPjzmi8dCKvWfQXybVLvCw',
			147: 'FCgtbMQPyLVNnvd7mpxc3SCE8Ne8qEL9xkU2gwf7xceA',
			149: 'EPUHjseXG3izk3MVUJ1PcyWT9xeBhtAnq8gUpq3j8Uni',
			152: 'UUUXQdoC85FmgUgDMfYj3UsBWMLSjU7gVj4QmYGdMRx',
			153: 'H6mmDwnQHBq68tqEhBConeRBBDUobqHrQbDUcBVNTW9M',
			155: 'H7o7KCr5n3whqcPsPkeCPWrzivKrarqzidD3kt8fijvB',
			156: 'GUGu95pqRvUk1NeZTmadqrUa1RxFcmTMCCrqTXK6976V'
		}
	}
};

// Any address, standing in for the entries a message does not read.
const UNREAD_ENTRY = address('11111111111111111111111111111111');

/**
 * A fixture's message decompiled offline, as `parseSolBase64TransactionMessage` decompiles it
 * with the lookup tables fetched.
 */
export const mockLifiSolTransactionMessage = ({
	quote,
	lookups
}: LifiSolTransactionFixture): CompilableTransactionMessage => {
	const { messageBytes } = decodeTransactionMessage(quote.transactionRequest?.data ?? '');

	const addressesByLookupTableAddress = Object.entries(lookups).reduce<Record<Address, Address[]>>(
		(acc, [table, entries]) => {
			const length = Math.max(...Object.keys(entries).map(Number)) + 1;

			acc[address(table)] = Array.from({ length }, (_, index) => {
				const entry = entries[index];

				return entry === undefined ? UNREAD_ENTRY : address(entry);
			});

			return acc;
		},
		{}
	);

	return decompileTransactionMessage(getCompiledTransactionMessageDecoder().decode(messageBytes), {
		addressesByLookupTableAddress
	});
};
