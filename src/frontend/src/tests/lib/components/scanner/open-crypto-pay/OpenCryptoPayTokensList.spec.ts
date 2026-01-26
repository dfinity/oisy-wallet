import OpenCryptoPayTokensList from '$lib/components/scanner/open-crypto-pay/OpenCryptoPayTokensList.svelte';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$eth/derived/tokens.derived', () => ({
	enabledEthereumTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$evm/derived/tokens.derived', () => ({
	enabledEvmTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$lib/derived/exchange.derived', () => ({
	exchanges: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

vi.mock('$lib/stores/balances.store', () => ({
	balancesStore: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

vi.mock('$eth/utils/token.utils', () => ({
	enrichEthEvmToken: vi.fn(({ token }) => ({
		...token
	}))
}));

describe('TokensSelection', () => {
	const createMockContext = () => ({
		availableTokens: writable([]),
		selectToken: vi.fn()
	});

	const renderWithContext = (onClose = vi.fn()) => {
		const mockContext = createMockContext();

		return render(OpenCryptoPayTokensList, {
			props: { onClose },
			context: new Map([[PAY_CONTEXT_KEY, mockContext]])
		});
	};

	it('should render component', () => {
		const { container } = renderWithContext();

		expect(container.firstChild).toBeInTheDocument();
	});

	it('should render PayTokenList', () => {
		const { container } = renderWithContext();

		expect(container.querySelector('[class*="flex"]')).toBeInTheDocument();
	});
});
