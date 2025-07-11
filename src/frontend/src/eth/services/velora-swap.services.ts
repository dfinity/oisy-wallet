// // import { isNullish } from '@dfinity/utils';
// // import { constructSimpleSDK, type SimpleFetchSDK } from '@velora-dex/sdk';

import { isNullish } from '@dfinity/utils';
import { constructSimpleSDK, type SimpleFetchSDK } from '@velora-dex/sdk';

// // // VeloraSwapService.ts

// // interface GetDeltaPriceParams {
// // 	srcToken: string;
// // 	destToken: string;
// // 	amount: string;
// // 	userAddress: string;
// // 	srcDecimals: number;
// // 	destDecimals: number;
// // 	destChainId: number;
// // }

// // export class VeloraSwapService {
// // 	private static sdks: Map<number, SimpleFetchSDK> = new Map<number, SimpleFetchSDK>();

// // 	private constructor(private readonly sdk: SimpleFetchSDK) {}

// // 	static create(chainId: number): VeloraSwapService {
// // 		if (!this.sdks.has(chainId)) {
// // 			const sdk = constructSimpleSDK({
// // 				chainId,
// // 				fetch: window.fetch
// // 			});
// // 			this.sdks.set(chainId, sdk);
// // 		}

// // 		const sdk = this.sdks.get(chainId);

// // 		if (isNullish(sdk)) {
// // 			throw new Error(`[Velora] Failed to initialize SDK for chainId ${chainId}`);
// // 		}

// // 		return new VeloraSwapService(sdk);
// // 	}

// // 	/**
// // 	 * Get Velora delta swap prices
// // 	 */
// // 	async getDeltaPrice(params: GetDeltaPriceParams): Promise<any | null> {
// // 		try {
// // 			return await this.sdk.delta.getDeltaPrice(params);
// // 		} catch (error) {
// // 			console.error('[Velora] Failed to get delta price:', error);
// // 			return null;
// // 		}
// // 	}

// // 	/**
// // 	 * Get Delta Contract address
// // 	 */
// // 	async getDeltaContract(): Promise<string | null> {
// // 		try {
// // 			return await this.sdk.delta.getDeltaContract();
// // 		} catch (error) {
// // 			console.error('[Velora] Failed to get delta contract address:', error);
// // 			return null;
// // 		}
// // 	}

// // 	/**
// // 	 * Build Delta Order
// // 	 */
// // 	async buildDeltaOrder({ params }: any): Promise<any | null> {
// // 		try {
// // 			return await this.sdk.delta.buildDeltaOrder(params);
// // 		} catch (error) {
// // 			console.error('[Velora] Failed to build delta order:', error);
// // 			return null;
// // 		}
// // 	}

// // 	/**
// // 	 * Post Delta Order
// // 	 */
// // 	async postDeltaOrder({ params }: any): Promise<any | null> {
// // 		try {
// // 			return await this.sdk.delta.postDeltaOrder(params);
// // 		} catch (error) {
// // 			console.error('[Velora] Failed to post delta order:', error);
// // 			return null;
// // 		}
// // 	}
// // }

// import {
// 	constructSimpleSDK,
// 	type BuildDeltaOrderDataParams,
// 	type DeltaAuction,
// 	type SignableDeltaOrderData,
// 	type SimpleFetchSDK
// } from '@velora-dex/sdk';

// export interface GetDeltaPriceParams {
// 	srcToken: string;
// 	destToken: string;
// 	amount: string;
// 	userAddress?: string;
// 	srcDecimals: number;
// 	destDecimals: number;
// 	destChainId?: number;
// }

// export interface BuildDeltaOrderParams {
// 	srcToken: string;
// 	destToken: string;
// 	amount: string;
// 	userAddress: string;
// 	destChainId: number;
// }

// export interface PostDeltaOrderParams {
// 	orderId: string;
// 	signature: string;
// 	order: any;
// }

// // ---------- SDK Client ----------
// class VeloraSDKClient {
// 	private static sdkMap: Map<number, SimpleFetchSDK> = new Map();

// 	static get(chainId: number): SimpleFetchSDK {
// 		if (!this.sdkMap.has(chainId)) {
// 			const sdk = constructSimpleSDK({
// 				chainId,
// 				fetch: window.fetch
// 			});
// 			this.sdkMap.set(chainId, sdk);
// 		}

// 		const sdk = this.sdkMap.get(chainId);
// 		if (!sdk) {
// 			throw new Error(`[Velora] Failed to initialize SDK for chainId ${chainId}`);
// 		}

// 		return sdk;
// 	}
// }

// // ---------- Swap Service ----------
// export class VeloraSwapService {
// 	private sdk: SimpleFetchSDK;

// 	constructor(chainId: number) {
// 		this.sdk = VeloraSDKClient.get(chainId);
// 	}

// 	async getDeltaPrice(params: GetDeltaPriceParams): Promise<any | null> {
// 		try {
// 			return await this.sdk.delta.getDeltaPrice(params);
// 		} catch (error) {
// 			console.error('[Velora] getDeltaPrice error:', error);
// 			return null;
// 		}
// 	}

// 	// async getQuote(params: GetDeltaPriceParams): Promise<any | null> {
// 	// 	try {
// 	// 		return await this.sdk.quote.getQuote(params);
// 	// 	} catch (error) {
// 	// 		console.error('[Velora] getDeltaPrice error:', error);
// 	// 		return null;
// 	// 	}
// 	// }

// 	async getDeltaContract(): Promise<string | null> {
// 		try {
// 			return await this.sdk.delta.getDeltaContract();
// 		} catch (error) {
// 			console.error('[Velora] getDeltaContract error:', error);
// 			return null;
// 		}
// 	}

// 	async buildDeltaOrder(params: BuildDeltaOrderDataParams): Promise<SignableDeltaOrderData | null> {
// 		try {
// 			return await this.sdk.delta.buildDeltaOrder(params);
// 		} catch (error) {
// 			console.error('[Velora] buildDeltaOrder error:', error);
// 			return null;
// 		}
// 	}

// 	async postDeltaOrder(params: PostDeltaOrderParams): Promise<DeltaAuction | null> {
// 		try {
// 			return await this.sdk.delta.postDeltaOrder(params);
// 		} catch (error) {
// 			console.error('[Velora] postDeltaOrder error:', error);
// 			return null;
// 		}
// 	}
// }

// VeloraSwapService.ts

interface GetDeltaPriceParams {
	srcToken: string;
	destToken: string;
	amount: string;
	userAddress: string;
	srcDecimals: number;
	destDecimals: number;
	destChainId: number;
}

export class VeloraSwapService {
	private static sdks: Map<number, SimpleFetchSDK> = new Map();

	private constructor(private readonly sdk: SimpleFetchSDK) {}

	static create({ chainId }: { chainId: number }): VeloraSwapService {
		if (!this.sdks.has(chainId)) {
			const sdk = constructSimpleSDK({
				chainId,
				fetch: window.fetch
			});
			this.sdks.set(chainId, sdk);
		}

		const sdk = this.sdks.get(chainId);

		if (isNullish(sdk)) {
			throw new Error(`[Velora] Failed to initialize SDK for chainId ${chainId}`);
		}

		return new VeloraSwapService(sdk);
	}

	/**
	 * Get Velora delta swap prices
	 */
	async getDeltaPrice(params: any): Promise<any | null> {
		try {
			return await this.sdk.delta.getDeltaPrice(params);
		} catch (error) {
			console.error('[Velora] Failed to get delta price:', error);
			return null;
		}
	}

	/**
	 * Get Delta Contract address
	 */
	async getDeltaContract(): Promise<string | null> {
		try {
			return await this.sdk.delta.getDeltaContract();
		} catch (error) {
			console.error('[Velora] Failed to get delta contract address:', error);
			return null;
		}
	}

	/**
	 * Build Delta Order
	 */
	async buildDeltaOrder({ params }: any): Promise<any | null> {
		try {
			return await this.sdk.delta.buildDeltaOrder(params);
		} catch (error) {
			console.error('[Velora] Failed to build delta order:', error);
			return null;
		}
	}

	/**
	 * Post Delta Order
	 */
	async postDeltaOrder({ params }: any): Promise<any | null> {
		try {
			return await this.sdk.delta.postDeltaOrder(params);
		} catch (error) {
			console.error('[Velora] Failed to post delta order:', error);
			return null;
		}
	}

	/**
	 * Get Quote
	 */
	async getQuote(params: any): Promise<any> {
		try {
			return await this.sdk.quote.getQuote(params);
		} catch (error) {
			console.error('[Velora] Failed to build delta order:', error);
			// return null;
		}
	}

	async getDeltaOrderById(params: any): Promise<any> {
		try {
			return await this.sdk.delta.getDeltaOrderById(params);
		} catch (error) {
			console.error('[Velora] Failed to build delta order:', error);
			// return null;
		}
	}
}
