/* eslint-disable linebreak-style */
import { API_ROUTES } from './Enum';
import type {
	HttpResponse,
	Options,
	PingResponse,
	SimplePriceResponse,
	TokenPriceCurrencyResponse
} from './Interface';

/**
 * The wrap client to access all api on coin gecko
 */
export class CoinGeckoClient {
	private static readonly API_V3_URL = 'https://api.coingecko.com/api/v3';

	private static readonly PRO_API_V3_URL = 'https://pro-api.coingecko.com/api/v3';

	options: Options = {
		timeout: 30000,
		autoRetry: true
	};

	baseURL: string;

	apiKey?: string;

	/**
	 * Constructor
	 * @param options the options passed for client library, at the moment only timeout are support
	 */
	constructor(options?: Options, apiKey?: string) {
		this.options = { ...this.options, ...options };
		if (!apiKey) {
			this.baseURL = CoinGeckoClient.API_V3_URL;
		} else {
			this.baseURL = CoinGeckoClient.PRO_API_V3_URL;
			this.apiKey = apiKey;
		}
	}

	private withPathParams(path: string, replacements: { [x: string]: string } = {}) {
		let pathStr = path;
		Object.entries(replacements).forEach(([key, value]) => {
			pathStr = pathStr.replace(`{${key}}`, value as string);
		});
		return pathStr;
	}

	/**
	 * Make HTTP request to the given endpoint
	 * @param url the full https URL
	 * @returns json content
	 */
	private async httpGet<T>(url: string) {
		const options = {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'User-Agent': 'Oisy/0.1'
			}
		};

		return new Promise<HttpResponse<T | any>>((resolve, reject) => {
			const req = fetch(url, options)
				.then((res) => {
					if (res.status && res.status === 429) {
						resolve({
							statusCode: res.status,
							data: {
								error: 'HTTP 429 - Too many request'
							},
							headers: res.headers as any
						});
					}
					resolve({
						statusCode: res.status as number,
						data: res.json() as T,
						headers: res.headers as any
					});
				})
				.catch((error) => {
					reject(error);
				});
		});
	}

	/**
	 * Generic function to make request use in internal function
	 * @param action
	 * @param params
	 * @returns
	 */
	private async makeRequest<T>(
		action: API_ROUTES,
		params: { [key: string]: any } = {}
	): Promise<T> {
		if (this.apiKey) {
			params.x_cg_pro_api_key = this.apiKey;
		}
		const qs = Object.entries(params)
			.map(([key, value]) => `${key}=${value}`)
			.join('&');
		const requestUrl = `${this.baseURL + this.withPathParams(action, params)}?${qs}`;
		const res = await this.httpGet<T>(requestUrl); // await this.http.get<T>(requestUrl);
		if (res.statusCode === 429 && this.options.autoRetry) {
			// console.warn("retrying........", requestUrl, res.headers);
			const retryAfter = +res.headers['retry-after'] * 1000;
			// console.log("retrying after ", retryAfter);
			await new Promise((r) => setTimeout(r, retryAfter));
			return (await this.makeRequest<T>(action, params)) as T;
		}

		if (res.statusCode.toString().slice(0, 1) !== '2') {
			throw new Error(`got error from coin gecko. status code: ${res.statusCode}`);
		}

		return res.data as T;
	}

	/**
	 * Check API server status
	 * @returns {PingResponse}
	 */
	public async ping() {
		return this.makeRequest<PingResponse>(API_ROUTES.PING);
	}

	/**
	 * Get the current price of any cryptocurrencies in any other supported currencies that you need.
	 * @param input.vs_currencies vs_currency of coins, comma-separated if querying more than 1 vs_currency. *refers to simple/supported_vs_currencies
	 * @param input.ids The ids of the coin, comma separated crytocurrency symbols (base). refers to /coins/list. When left empty, returns numbers the coins observing the params limit and start
	 * @param input.include_market_cap @default false
	 * @returns {SimplePriceResponse}
	 * @category Simple
	 */
	public async simplePrice(input: {
		vs_currencies: string;
		ids: string;
		include_market_cap?: boolean;
		include_24hr_vol?: boolean;
		include_24hr_change?: boolean;
		include_last_updated_at?: boolean;
	}) {
		return this.makeRequest<SimplePriceResponse>(API_ROUTES.SIMPLE_PRICE, input);
	}

	/**
	 * Get current price of tokens (using contract addresses) for a given platform in any other currency that you need.
	 * @param input.id The id of the platform issuing tokens (Only ethereum is supported for now)
	 * @param input.contract_addresses The contract address of tokens, comma separated
	 * @param input.vs_currencies vs_currency of coins, comma-separated if querying more than 1 vs_currency. *refers to simple/supported_vs_currencies
	 * @returns The dictionary of price pair with details
	 * * Example output
	 * ```json
	 * {
	 *    "0x8207c1ffc5b6804f6024322ccf34f29c3541ae26": {
	 *      "btc": 0.00003754,
	 *      "btc_market_cap": 7914.297728099776,
	 *      "btc_24h_vol": 2397.477480037078,
	 *      "btc_24h_change": 3.7958858800037834,
	 *      "eth": 0.0009474,
	 *      "eth_market_cap": 199730.22336519035,
	 *      "eth_24h_vol": 60504.258122696505,
	 *      "eth_24h_change": 2.8068351977135007,
	 *      "last_updated_at": 1618664199
	 *   }
	 *}
	 *```
	 * @category Simple
	 */
	public async simpleTokenPrice(input: {
		id: 'ethereum';
		contract_addresses: string;
		vs_currencies: string;
		include_market_cap?: boolean;
		include_24hr_vol?: boolean;
		include_24hr_change?: boolean;
		include_last_updated_at?: boolean;
	}) {
		return this.makeRequest<TokenPriceCurrencyResponse>(API_ROUTES.SIMPLE_TOKEN_PRICE, input);
	}
}
