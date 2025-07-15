import type { SignableDeltaOrderData } from '@velora-dex/sdk';
import { Signature, TypedDataEncoder } from 'ethers';

export const getSignParamsEIP712 = (params: SignableDeltaOrderData): string => {
	const { domain: orderDomain, types: orderTypes, data } = params;
	return TypedDataEncoder.hash(orderDomain, orderTypes, data);
};

export const getCompactSignature = (signature: string) =>
	Signature.from(signature).compactSerialized;
