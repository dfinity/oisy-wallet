import {
	btcAddressToOutputScript,
	getBtcAddressString,
	parseBtcAddress
} from '$btc/utils/btc-address.utils';
import type { BtcAddress } from '$declarations/backend/backend.did';
import { assertNonNullish } from '@dfinity/utils';
import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import { address as btcAddressLib, networks, payments, type Network } from 'bitcoinjs-lib';

describe('btc-address.utils', () => {
	describe('parseBtcAddress', () => {
		it('should parse P2PKH addresses (legacy addresses starting with 1)', () => {
			const p2pkhAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

			const result = parseBtcAddress(p2pkhAddress);

			expect(result).toEqual({ P2PKH: p2pkhAddress });
		});

		it('should parse P2SH addresses (legacy addresses starting with 3)', () => {
			const p2shAddress = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';

			const result = parseBtcAddress(p2shAddress);

			expect(result).toEqual({ P2SH: p2shAddress });
		});

		it('should parse P2WPKH addresses (segwit addresses starting with bc1q)', () => {
			const p2wpkhAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

			const result = parseBtcAddress(p2wpkhAddress);

			expect(result).toEqual({ P2WPKH: p2wpkhAddress });
		});

		it('should parse P2WSH addresses (segwit script addresses)', () => {
			const p2wshAddress = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';

			const result = parseBtcAddress(p2wshAddress);

			expect(result).toEqual({ P2WSH: p2wshAddress });
		});

		it('should parse P2TR addresses (taproot addresses starting with bc1p)', () => {
			const p2trAddress = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';

			const result = parseBtcAddress(p2trAddress);

			expect(result).toEqual({ P2TR: p2trAddress });
		});

		it('should return undefined for invalid BTC addresses', () => {
			// Invalid BTC addresses (wrong checksums or formats)
			const invalidAddresses = [
				'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlx', // Invalid checksum
				'1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3', // Invalid P2PKH
				'3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLz', // Invalid P2SH
				'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mda', // Invalid P2WPKH
				'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj1', // Invalid P2TR
				'', // Empty string
				'not-a-bitcoin-address', // Completely invalid format
				'0x71C7656EC7ab88b098defB751B7401B5f6d8976F' // Ethereum address
			];

			invalidAddresses.forEach((address) => {
				const result = parseBtcAddress(address);

				expect(result).toBeUndefined();
			});
		});

		it('should return undefined for non-string inputs', () => {
			// @ts-expect-error Testing invalid input types
			expect(parseBtcAddress(123)).toBeUndefined();
			// @ts-expect-error Testing invalid input types
			expect(parseBtcAddress(null)).toBeUndefined();
			// @ts-expect-error Testing invalid input types
			expect(parseBtcAddress(undefined)).toBeUndefined();
			// @ts-expect-error Testing invalid input types
			expect(parseBtcAddress({})).toBeUndefined();
		});
	});

	describe('getBtcAddressString', () => {
		it('should extract address string from P2PKH address object', () => {
			const addressStr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
			const addressObj: BtcAddress = { P2PKH: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should extract address string from P2SH address object', () => {
			const addressStr = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
			const addressObj: BtcAddress = { P2SH: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should extract address string from P2WPKH address object', () => {
			const addressStr = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
			const addressObj: BtcAddress = { P2WPKH: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should extract address string from P2WSH address object', () => {
			const addressStr = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';
			const addressObj: BtcAddress = { P2WSH: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should extract address string from P2TR address object', () => {
			const addressStr = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';
			const addressObj: BtcAddress = { P2TR: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should return undefined for invalid BtcAddress objects', () => {
			// @ts-expect-error Testing invalid input
			expect(() => getBtcAddressString({})).toThrow();
			// @ts-expect-error Testing invalid input
			expect(() => getBtcAddressString({ InvalidType: 'address' })).toThrow();
		});
	});

	describe('roundtrip conversion', () => {
		it('should handle all valid BTC address types in a roundtrip conversion', () => {
			const validAddresses = [
				'1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', // P2PKH
				'3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', // P2SH
				'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', // P2WPKH
				'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3', // P2WSH
				'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0' // P2TR
			];

			validAddresses.forEach((address) => {
				const parsedAddress = parseBtcAddress(address);
				assertNonNullish(parsedAddress);
				const recoveredAddress = getBtcAddressString(parsedAddress);

				expect(recoveredAddress).toEqual(address);
			});
		});
	});

	describe('btcAddressToOutputScript', () => {
		const hash20 = Buffer.alloc(20, 0x11);
		const hash32 = Buffer.alloc(32, 0x22);

		const addressTypes = ['P2PKH', 'P2SH', 'P2WPKH', 'P2WSH', 'P2TR'] as const;

		type AddressType = (typeof addressTypes)[number];

		// P2TR through `toBech32`: `payments.p2tr` needs an ECC library, which the frontend lacks.
		const addressesFor = (network: Network): Record<AddressType, string | undefined> => ({
			P2PKH: payments.p2pkh({ hash: hash20, network }).address,
			P2SH: payments.p2sh({ hash: hash20, network }).address,
			P2WPKH: payments.p2wpkh({ hash: hash20, network }).address,
			P2WSH: payments.p2wsh({ hash: hash32, network }).address,
			P2TR: btcAddressLib.toBech32(hash32, 1, network.bech32)
		});

		const expectedScripts: Record<AddressType, string> = {
			P2PKH: `76a914${hash20.toString('hex')}88ac`,
			P2SH: `a914${hash20.toString('hex')}87`,
			P2WPKH: `0014${hash20.toString('hex')}`,
			P2WSH: `0020${hash32.toString('hex')}`,
			P2TR: `5120${hash32.toString('hex')}`
		};

		const scriptHex = (params: {
			address: string | undefined;
			network: BitcoinNetwork;
		}): string => {
			assertNonNullish(params.address);

			return Buffer.from(btcAddressToOutputScript({ ...params, address: params.address })).toString(
				'hex'
			);
		};

		describe.each([
			{ network: 'mainnet', bitcoinJsNetwork: networks.bitcoin },
			{ network: 'testnet', bitcoinJsNetwork: networks.testnet },
			{ network: 'regtest', bitcoinJsNetwork: networks.regtest }
		] as const)('on $network', ({ network, bitcoinJsNetwork }) => {
			it.each(addressTypes)('builds the standard %s script', (type) => {
				expect(scriptHex({ address: addressesFor(bitcoinJsNetwork)[type], network })).toBe(
					expectedScripts[type]
				);
			});
		});

		it('matches the BIP350 test vectors, P2TR included, without an ECC library', () => {
			expect(
				scriptHex({ address: 'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4', network: 'mainnet' })
			).toBe('0014751e76e8199196d454941c45d1b3a323f1433bd6');
			expect(
				scriptHex({
					address: 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0',
					network: 'mainnet'
				})
			).toBe('512079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
			expect(
				scriptHex({
					address: 'tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c',
					network: 'testnet'
				})
			).toBe('5120000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433');
		});

		it.each(addressTypes)('refuses a mainnet %s address on testnet and regtest', (type) => {
			const address = addressesFor(networks.bitcoin)[type];

			expect(() => scriptHex({ address, network: 'testnet' })).toThrow('is not a testnet address');
			expect(() => scriptHex({ address, network: 'regtest' })).toThrow('is not a regtest address');
		});

		it.each(addressTypes)('refuses a testnet %s address on mainnet', (type) => {
			expect(() =>
				scriptHex({ address: addressesFor(networks.testnet)[type], network: 'mainnet' })
			).toThrow('is not a mainnet address');
		});

		it.each(['P2WPKH', 'P2WSH', 'P2TR'] as const)(
			'tells a testnet %s address from a regtest one by its Bech32 prefix',
			(type) => {
				expect(() =>
					scriptHex({ address: addressesFor(networks.testnet)[type], network: 'regtest' })
				).toThrow('is not a regtest address');
				expect(() =>
					scriptHex({ address: addressesFor(networks.regtest)[type], network: 'testnet' })
				).toThrow('is not a testnet address');
			}
		);

		it.each(['P2PKH', 'P2SH'] as const)(
			'accepts a testnet %s address on regtest, which shares its Base58 versions',
			(type) => {
				expect(
					scriptHex({ address: addressesFor(networks.testnet)[type], network: 'regtest' })
				).toBe(expectedScripts[type]);
			}
		);

		it.each([
			// Witness version 1 with a 40-byte program, version 2 and version 16 (BIP350 vectors).
			'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y',
			'bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs',
			'BC1SW50QGDZ25J'
		])('refuses the unsupported segwit address %s', (address) => {
			expect(() => scriptHex({ address, network: 'mainnet' })).toThrow(
				'Unsupported Bitcoin address type'
			);
		});

		it.each(['', 'not-an-address', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdx'])(
			'refuses the invalid address "%s"',
			(address) => {
				expect(() => scriptHex({ address, network: 'mainnet' })).toThrow();
			}
		);
	});
});
