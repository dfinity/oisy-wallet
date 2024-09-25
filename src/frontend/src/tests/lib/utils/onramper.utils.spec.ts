import { ONRAMPER_API_KEY, ONRAMPER_BASE_URL } from '$env/onramper.env';
import { buildOnramperLink, type BuildOnramperLinkParams } from '$lib/utils/onramper.utils';
import { describe, expect, it } from 'vitest';

describe('buildOnramperLink', () => {
	it('should build the correct URL with all parameters', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'usd',
			defaultCrypto: 'icp',
			onlyCryptos: ['btc', 'eth', 'icp'],
			onlyCryptoNetworks: ['bitcoin', 'ethereum'],
			wallets: [
				{ cryptoId: 'btc', wallet: 'bitcoin_wallet_address' },
				{ cryptoId: 'icp', wallet: 'icp_wallet_address' }
			],
			supportRecurringPayments: true,
			enableCountrySelector: false
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=usd&defaultCrypto=icp` +
			`&onlyCryptos=btc,eth,icp&onlyCryptoNetworks=bitcoin,ethereum` +
			`&supportRecurringPayments=true&enableCountrySelector=false` +
			`&wallets=btc:bitcoin_wallet_address,icp:icp_wallet_address`;

		const result = buildOnramperLink(params);
		expect(result).toBe(expectedUrl);
	});

	it('should build the correct URL with only required parameters', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'eur',
			onlyCryptos: ['btc'],
			onlyCryptoNetworks: ['bitcoin'],
			wallets: [{ cryptoId: 'btc', wallet: 'bitcoin_wallet_address' }],
			supportRecurringPayments: false,
			enableCountrySelector: true
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=eur` +
			`&onlyCryptos=btc&onlyCryptoNetworks=bitcoin` +
			`&supportRecurringPayments=false&enableCountrySelector=true` +
			`&wallets=btc:bitcoin_wallet_address`;

		const result = buildOnramperLink(params);
		expect(result).toBe(expectedUrl);
	});

	it('should handle empty wallets array', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'eur',
			onlyCryptos: ['btc', 'eth'],
			onlyCryptoNetworks: ['bitcoin', 'ethereum'],
			wallets: [],
			supportRecurringPayments: false,
			enableCountrySelector: true
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=eur` +
			`&onlyCryptos=btc,eth&onlyCryptoNetworks=bitcoin,ethereum` +
			`&supportRecurringPayments=false&enableCountrySelector=true&wallets=`;

		const result = buildOnramperLink(params);

		expect(result).toBe(expectedUrl);
	});

	it('should handle empty onlyCryptos and onlyCryptoNetworks arrays', () => {
		const params: BuildOnramperLinkParams = {
			mode: 'buy',
			defaultFiat: 'usd',
			onlyCryptos: [],
			onlyCryptoNetworks: [],
			wallets: [{ cryptoId: 'btc', wallet: 'bitcoin_wallet_address' }],
			supportRecurringPayments: false,
			enableCountrySelector: true
		};

		const expectedUrl =
			`${ONRAMPER_BASE_URL}?apiKey=${ONRAMPER_API_KEY}` +
			`&mode=buy&defaultFiat=usd` +
			`&supportRecurringPayments=false&enableCountrySelector=true&wallets=btc:bitcoin_wallet_address`;

		const result = buildOnramperLink(params);

		expect(result).toBe(expectedUrl);
	});
});
