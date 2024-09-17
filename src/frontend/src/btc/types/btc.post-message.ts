import type { CertifiedData } from '$lib/types/store';

export type PostMessageWalletData = {
	balance: CertifiedData<bigint>;
};
