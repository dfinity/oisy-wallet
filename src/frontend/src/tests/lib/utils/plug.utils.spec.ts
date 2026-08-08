import {
	derivePlugAccount,
	derivePlugAccounts,
	derivePlugBtcAddress,
	derivePlugEvmAddress,
	derivePlugIdentity,
	derivePlugSolAddress,
	isValidPlugSeedPhrase
} from '$lib/utils/plug.utils';

// Verified against a real Plug test wallet (extension 2.18.0): all four values
// below are what Plug itself displays for this phrase. They are the regression
// value of this suite — a change in any of them means the derivation broke.
const PHRASE = 'two dismiss express kingdom ceiling tape media maid unveil horn tell basket';
const PRINCIPAL = 'zb3p7-rkico-haofj-x7utu-caljs-csbui-dhix7-ubqqq-x53wi-ltrso-fae';
const EVM_ADDRESS = '0xab9aEB30eAE740497aADb1Ae0F347db548457ac4';
const BTC_ADDRESS = 'bc1pwn0fe4xjvuvf6dx3saep25azwv74jyzksf5ggys28al4t8mg5j5qtdmdej';
const SOL_ADDRESS = 'EUxq91X9hA2s2qDDHKmS8bHjQ8GX2XMNkakgRiDgksx';

describe('plug.utils', () => {
	describe('isValidPlugSeedPhrase', () => {
		it('accepts a valid BIP39 phrase', () => {
			expect(isValidPlugSeedPhrase(PHRASE)).toBeTruthy();
		});

		it('tolerates surrounding and repeated whitespace', () => {
			expect(isValidPlugSeedPhrase(`  ${PHRASE.replace(/ /g, '   ')}  `)).toBeTruthy();
		});

		it('rejects a phrase that fails the checksum', () => {
			const [, ...rest] = PHRASE.split(' ');

			expect(isValidPlugSeedPhrase(['abandon', ...rest].join(' '))).toBeFalsy();
		});

		it('rejects an empty phrase', () => {
			expect(isValidPlugSeedPhrase('')).toBeFalsy();
		});
	});

	describe('derivePlugIdentity', () => {
		it('derives the principal Plug shows for the first account', () => {
			expect(derivePlugIdentity({ phrase: PHRASE, index: 0 }).getPrincipal().toText()).toBe(
				PRINCIPAL
			);
		});

		it('derives a distinct principal per account index', () => {
			const principals = [0, 1, 2].map((index) =>
				derivePlugIdentity({ phrase: PHRASE, index }).getPrincipal().toText()
			);

			expect(new Set(principals).size).toBe(3);
		});

		it('throws on an invalid phrase', () => {
			expect(() => derivePlugIdentity({ phrase: 'not a seed phrase', index: 0 })).toThrow();
		});
	});

	describe('chain-key address derivation', () => {
		it('derives the EVM address', () => {
			expect(derivePlugEvmAddress(PRINCIPAL)).toBe(EVM_ADDRESS);
		});

		it('derives the untweaked P2TR Bitcoin address', () => {
			expect(derivePlugBtcAddress(PRINCIPAL)).toBe(BTC_ADDRESS);
		});

		it('derives the Solana address', () => {
			expect(derivePlugSolAddress(PRINCIPAL)).toBe(SOL_ADDRESS);
		});

		it('derives different addresses for a different principal', () => {
			const other = derivePlugIdentity({ phrase: PHRASE, index: 1 }).getPrincipal().toText();

			expect(derivePlugEvmAddress(other)).not.toBe(EVM_ADDRESS);
			expect(derivePlugBtcAddress(other)).not.toBe(BTC_ADDRESS);
			expect(derivePlugSolAddress(other)).not.toBe(SOL_ADDRESS);
		});
	});

	describe('derivePlugAccount', () => {
		it('returns the full account for the first index', () => {
			expect(derivePlugAccount({ phrase: PHRASE, index: 0 })).toEqual({
				index: 0,
				principal: PRINCIPAL,
				evmAddress: EVM_ADDRESS,
				btcAddress: BTC_ADDRESS,
				solAddress: SOL_ADDRESS
			});
		});
	});

	describe('derivePlugAccounts', () => {
		it('derives the requested number of accounts, indexed from zero', () => {
			const accounts = derivePlugAccounts({ phrase: PHRASE, depth: 3 });

			expect(accounts).toHaveLength(3);
			expect(accounts.map(({ index }) => index)).toEqual([0, 1, 2]);
			expect(accounts[0].principal).toBe(PRINCIPAL);
		});

		it('returns an empty list for a depth of zero', () => {
			expect(derivePlugAccounts({ phrase: PHRASE, depth: 0 })).toEqual([]);
		});
	});
});
