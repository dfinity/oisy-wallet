import { isNullish, nonNullish } from '@dfinity/utils';

import {
	constructSimpleSDK,
	type BridgePrice,
	type BuildDeltaOrderDataParams,
	type BuildTxInput,
	type DeltaAuction,
	type DeltaPriceParams,
	type PostDeltaOrderParams,
	type QuoteParams,
	type QuoteResponse,
	type SignableDeltaOrderData,
	type SimpleFetchSDK,
	type TransactionParams
} from '@velora-dex/sdk';

interface SdkErrorResponse {
	error: string;
	errorType?: string;
}
type SdkResult<T> = T | SdkErrorResponse;

const isSdkError = <T>(res: SdkResult<T>): res is SdkErrorResponse =>
	nonNullish(res) && typeof res === 'object' && 'error' in res;

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
			throw new Error(`Failed to initialize SDK for chainId ${chainId}`);
		}

		return new VeloraSwapService(sdk);
	}

	async getDeltaPrice(
		params: DeltaPriceParams & {
			destChainId: number;
		}
	): Promise<BridgePrice> {
		const res = await this.sdk.delta.getDeltaPrice(params);
		if (isSdkError(res)) {
			throw new Error(res.error);
		}
		return res;
	}

	async getDeltaContract(): Promise<string | null> {
		const res = await this.sdk.delta.getDeltaContract();
		if (isSdkError(res)) {
			throw new Error(res.error);
		}
		return res;
	}

	async buildDeltaOrder(params: BuildDeltaOrderDataParams): Promise<SignableDeltaOrderData> {
		const res = await this.sdk.delta.buildDeltaOrder(params);
		if (isSdkError(res)) {
			throw new Error(res.error);
		}
		return res;
	}

	async postDeltaOrder(params: PostDeltaOrderParams): Promise<DeltaAuction> {
		const res = await this.sdk.delta.postDeltaOrder(params);
		if (isSdkError(res)) {
			throw new Error(res.error);
		}
		return res;
	}

	async getDeltaOrderById(params: string): Promise<Omit<DeltaAuction, 'signature'>> {
		const res = await this.sdk.delta.getDeltaOrderById(params);
		if (isSdkError(res)) {
			throw new Error(res.error);
		}
		return res;
	}

	async getQuote(
		params: QuoteParams<'all'> & {
			destChainId?: number;
		}
	): Promise<QuoteResponse> {
		const res = await this.sdk.quote.getQuote(params);
		if (isSdkError(res)) {
			throw new Error(res.error);
		}
		return res;
	}

	async getSpender(): Promise<string> {
		const res = await this.sdk.swap.getSpender();
		if (isSdkError(res)) {
			throw new Error(res.error);
		}
		return res;
	}

	async buildTx(params: BuildTxInput): Promise<TransactionParams> {
		const res = await this.sdk.swap.buildTx(params);
		if (isSdkError(res)) {
			throw new Error(res.error);
		}
		return res;
	}
}
