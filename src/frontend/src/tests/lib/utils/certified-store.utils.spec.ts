import type { CertifiedData } from '$lib/types/store';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';
import type { Nullish } from '@dfinity/zod-schemas';

const certified = true;

describe('mapCertifiedData', () => {
	it('should return null when certifiedData is null', () => {
		const certifiedData: Nullish<CertifiedData<string>> = null;

		expect(mapCertifiedData(certifiedData)).toBeNull();
	});

	it('should return undefined when certifiedData is undefined', () => {
		const certifiedData: Nullish<CertifiedData<string>> = undefined;

		expect(mapCertifiedData(certifiedData)).toBeUndefined();
	});

	it('should return the data when certifiedData contains valid data', () => {
		const data = 'testData';
		const certifiedData: Nullish<CertifiedData<string>> = { data, certified };

		expect(mapCertifiedData(certifiedData)).toBe(data);
	});

	it('should return undefined when data inside certifiedData is undefined', () => {
		const certifiedData: Nullish<CertifiedData<string | undefined>> = {
			data: undefined,
			certified
		};

		expect(mapCertifiedData(certifiedData)).toBeUndefined();
	});

	it('should return the data when certifiedData contains an object', () => {
		interface TestData {
			prop: string;
			value: number;
		}
		const data: TestData = { prop: 'testData', value: 1 };
		const certifiedData: Nullish<CertifiedData<TestData>> = { data, certified };

		expect(mapCertifiedData(certifiedData)).toEqual(data);
	});
});
