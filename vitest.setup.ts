import '@testing-library/jest-dom';
import { navigating, page } from './src/frontend/src/tests/mocks/stores.mock';

vi.mock('$app/stores', () => ({
	page,
	navigating
}));
