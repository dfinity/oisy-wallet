export interface CertifiedData<T> {
	data: T;
	certified: boolean;
}

export type AlwaysCertifiedData<T> = Omit<CertifiedData<T>, 'certified'> & { certified: true };
