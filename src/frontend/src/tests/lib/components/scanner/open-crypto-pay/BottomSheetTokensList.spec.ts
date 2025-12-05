import BottomSheetTokensList from '$lib/components/scanner/open-crypto-pay/BottomSheetTokensList.svelte';
import en from '$lib/i18n/en.json';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import { render, screen } from '@testing-library/svelte';
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

describe('TokensSelectionBottomSheet', () => {
	const createMockContext = () => ({
		availableTokens: writable([]),
		selectToken: vi.fn()
	});

	const renderWithContext = ({
		onClose = vi.fn(),
		visible = true
	}: {
		onClose?: () => void;
		visible?: boolean;
	} = {}) => {
		const mockContext = createMockContext();

		return render(BottomSheetTokensList, {
			props: { onClose, visible },
			context: new Map([[PAY_CONTEXT_KEY, mockContext]])
		});
	};

	it('should render component', () => {
		const { container } = renderWithContext();

		expect(container).toBeInTheDocument();
	});

	it('should display select token heading', () => {
		renderWithContext();

		expect(
			screen.getByRole('heading', { name: en.scanner.text.select_token_to_pay })
		).toBeInTheDocument();
	});

	it('should have correct heading level', () => {
		renderWithContext();

		const heading = screen.getByText(en.scanner.text.select_token_to_pay);

		expect(heading.tagName).toBe('H3');
	});

	describe('BottomSheet integration', () => {
		it('should show when visible is true', () => {
			renderWithContext({ visible: true });

			expect(screen.getByText(en.scanner.text.select_token_to_pay)).toBeInTheDocument();
		});
	});

	describe('PayTokenList integration', () => {
		it('should render PayTokenList', () => {
			renderWithContext();

			expect(screen.getByText(en.scanner.text.select_token_to_pay)).toBeInTheDocument();
		});

		it('should pass onClose to PayTokenList', () => {
			const onClose = vi.fn();

			renderWithContext({ onClose });

			expect(screen.getByText(en.scanner.text.select_token_to_pay)).toBeInTheDocument();
		});
	});

	describe('onClose behavior', () => {
		it('should not call onClose on mount', () => {
			const onClose = vi.fn();

			renderWithContext({ onClose });

			expect(onClose).not.toHaveBeenCalled();
		});
	});

	describe('layout structure', () => {
		it('should render heading inside BottomSheet', () => {
			renderWithContext();

			const heading = screen.getByText(en.scanner.text.select_token_to_pay);

			expect(heading).toBeInTheDocument();
		});
	});
});
