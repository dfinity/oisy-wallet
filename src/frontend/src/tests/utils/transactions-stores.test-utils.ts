import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import type { CertifiedData } from '$lib/types/store';

const createIcTransactionUiMock = (id: string): IcTransactionUi => ({
	id,
	timestamp: nowInBigIntNanoSeconds(),
	type: 'send',
	value: 100n,
	from: 'sender',
	to: 'receiver',
	status: 'pending'
});

export const createCertifiedIcTransactionUiMock = (id: string): CertifiedData<IcTransactionUi> => ({
	certified: true,
	data: createIcTransactionUiMock(id)
});

export const createIcTransactionUiMockList = (n: number): IcTransactionUi[] =>
	Array.from({ length: n }, (_, i) => createIcTransactionUiMock(`tx${i}`));
