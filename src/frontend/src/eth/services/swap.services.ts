import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { ICPSwapFactoryCanister } from '$lib/canisters/icp-swap-factory.canister';
import { ICP_SWAP_FACTORY_CANISTER_ID } from '$lib/constants/app.constants';
import type { ICPSwapGetPoolParams } from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { constructSimpleSDK, type SimpleFetchSDK } from '@velora-dex/sdk';

let canister: ICPSwapFactoryCanister | undefined = undefined;

export const getPoolCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId,
	...restParams
}: CanisterApiFunctionParams<ICPSwapGetPoolParams>): Promise<PoolData> => {
	const { getPool } = await icpSwapFactoryCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return getPool(restParams);
};

const icpSwapFactoryCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = ICP_SWAP_FACTORY_CANISTER_ID
}: CanisterApiFunctionParams): Promise<ICPSwapFactoryCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await ICPSwapFactoryCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};

const swap = async () => {
	if (nonNullish($ethAddress) && nonNullish($authIdentity)) {
		const deltaSDK = constructSimpleSDK({ chainId: 8453, fetch: window.fetch });

		const deltaPrice = await deltaSDK.delta.getDeltaPrice({
			srcToken,
			destToken,
			amount,
			userAddress: $ethAddress,
			srcDecimals,
			destDecimals,
			destChainId: 137
		});

		const slippagePercent = 0.5;
		const decimalDestAmount = Number(formatUnits(deltaPrice.destAmount, destDecimals));
		const adjustedDecimalAmount = decimalDestAmount * (1 - slippagePercent / 100);
		const destAmountAfterSlippage = parseUnits(
			adjustedDecimalAmount.toFixed(destDecimals),
			destDecimals
		).toString();

		const deltaContract = await deltaSDK.delta.getDeltaContract();
		const chainId = 8453;
		const now = Math.floor(Date.now() / 1000);
		const sigDeadline = now + 30 * 60;
		const nonce = 0n;

		console.log('in swapModal');

		if (isNullish(evmNativeEthereumToken)) {
			console.log('Empty evmNativeEthereumToken', evmNativeEthereumToken);
			return;
		}

		console.log({
			$ckEthMinterInfoStore,
			ckinfoStore: $ckEthMinterInfoStore?.[evmNativeEthereumToken.id],
			evmNativeEthereumTokenId: evmNativeEthereumToken.id
		});

		const permit2 = await createPermit2WithApproval({
			token: USDC_TOKEN,
			from: $ethAddress,
			identity: $authIdentity,
			spender: deltaContract!,
			amount,
			decimals: USDC_TOKEN.decimals,
			chainId,
			deadline: sigDeadline,
			nonce,
			sourceNetwork: USDC_TOKEN.network,
			minterInfo: $ckEthMinterInfoStore?.[evmNativeEthereumToken.id]
		});

		const signableOrderData = await deltaSDK.delta.buildDeltaOrder({
			deltaPrice,
			owner: $ethAddress,
			srcToken: srcToken,
			destToken: destToken,
			srcAmount: amount,
			destAmount: destAmountAfterSlippage,
			deadline: sigDeadline,
			destChainId: 137
			// permit: permit2
		});

		const { domain: orderDomain, types: orderTypes, data } = signableOrderData;
		const eip712OrderHash = TypedDataEncoder.hash(orderDomain, orderTypes, data);
		const orderSignature = await signPrehash({
			hash: eip712OrderHash,
			identity: $authIdentity
		});
		const compactOrderSig = Signature.from(orderSignature).compactSerialized;

		// Submit to Velora
		try {
			const result = await deltaSDK.delta.postDeltaOrder({
				order: signableOrderData.data,
				signature: compactOrderSig
			});

			console.log('✅ SUCCESS! Order submitted to Velora:', result);
			return result;
		} catch (e: any) {
			console.error('❌ FAILED! Detailed analysis:', e);

			if (e?.response?.text) {
				const errorText = await e.response.text();
				console.error('❌ Velora error response:', errorText);
			} else {
				console.error('❌ Raw error:', e);
			}
			throw e;
		}
	}
};

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
	private static sdks: Map<number, SimpleFetchSDK> = new Map<number, SimpleFetchSDK>();

	private constructor(private readonly sdk: SimpleFetchSDK) {}

	static create(chainId: number): VeloraSwapService {
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
	async getDeltaPrice(params: GetDeltaPriceParams): Promise<any | null> {
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
}
