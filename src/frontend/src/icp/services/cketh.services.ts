import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { loadCkData } from '$icp/services/ck.services';
import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';

export const loadEip1559TransactionPrice = async (params: IcToken & Partial<IcCkCanisters>) =>
	loadCkData({
		...params,
		store: eip1559TransactionPriceStore,
		request: (params) => eip1559TransactionPrice(params),
		strategy: 'update'
	});
