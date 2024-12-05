import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';

const certified = true;

describe('mapCertifiedData', () => {
	it('should return null when certifiedData is null', () => {
		const certifiedData: Option<CertifiedData<string>> = null;

		expect(mapCertifiedData(certifiedData)).toBeNull();
	});

	it('should return undefined when certifiedData is undefined', () => {
		const certifiedData: Option<CertifiedData<string>> = undefined;

		expect(mapCertifiedData(certifiedData)).toBeUndefined();
	});

	it('should return the data when certifiedData contains valid data', () => {
		const data = 'testData';
		const certifiedData: Option<CertifiedData<string>> = { data, certified };

		expect(mapCertifiedData(certifiedData)).toBe(data);
	});

	it('should return undefined when data inside certifiedData is undefined', () => {
		const certifiedData: Option<CertifiedData<string | undefined>> = { data: undefined, certified };

		expect(mapCertifiedData(certifiedData)).toBeUndefined();
	});

	it('should return the data when certifiedData contains an object', () => {
		interface TestData {
			prop: string;
			value: number;
		}
		const data: TestData = { prop: 'testData', value: 1 };
		const certifiedData: Option<CertifiedData<TestData>> = { data, certified };

		expect(mapCertifiedData(certifiedData)).toEqual(data);
	});
});
