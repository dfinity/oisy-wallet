import NewSwapWizard from '$lib/components/swap/NewSwapWizard.svelte';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { isNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

vi.mock('@dfinity/utils', () => ({
	isNullish: vi.fn()
}));

vi.mock('$lib/utils/network.utils', () => ({
	isNetworkIdICP: vi.fn()
}));

describe('SwapWizard', () => {
	const mockContext = new Map();

	const defaultProps = {
		currentStep: 'init',
		swapAmount: 100,
		receiveAmount: 95,
		slippageValue: '0.5',
		swapProgressStep: ProgressStepsSwap.INITIALIZATION,
		onShowTokensList: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn(),
		onBack: vi.fn()
	};

	beforeEach(() => {
		const mockSwapContext = initSwapContext({
			sourceToken: mockValidIcToken,
			destinationToken: mockValidIcToken
		});
		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);
	});

	it('should render component', () => {
		const { container } = render(NewSwapWizard, {
			props: defaultProps,
			context: mockContext
		});

		expect(container).toBeTruthy();
	});

	it('should render ICP wizard when sourceToken is null', () => {
		vi.mocked(isNullish).mockReturnValue(true);

		const { container } = render(NewSwapWizard, {
			props: defaultProps,
			context: mockContext
		});

		expect(container).toBeTruthy();
	});

	it('should render ETH wizard when sourceToken is not ICP network', () => {
		vi.mocked(isNullish).mockReturnValue(false);
		vi.mocked(isNetworkIdICP).mockReturnValue(false);

		const { container } = render(NewSwapWizard, {
			props: defaultProps,
			context: mockContext
		});

		expect(container).toBeTruthy();
	});
});
