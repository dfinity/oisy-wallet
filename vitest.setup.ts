import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

vi.mock('./src/lib/constants/mockable.constants.ts', () => ({
	LOCAL: false
}));
