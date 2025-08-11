import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import EnableTokenToggle from '$lib/components/tokens/EnableTokenToggle.svelte';
import { MANAGE_TOKENS_MODAL_TOKEN_TOGGLE } from '$lib/constants/test-ids.constants';
import type { Token } from '$lib/types/token';
import * as tokenToggleUtils from '$lib/utils/token-toggle.utils';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('EnableTokenToggle', () => {
	const getTestIdForToggle = (token: Token) =>
		`${MANAGE_TOKENS_MODAL_TOKEN_TOGGLE}-${token.symbol}-${token.network.id.description}`;

	const mockToggleableIcToken = { ...mockValidIcrcToken, enabled: true };
	const mockToggleableErc721Token = { ...mockValidErc721Token, enabled: true };
	const mockToggleableSplToken = { ...BONK_TOKEN, enabled: true };
	const mockToggleableBtcToken = { ...BTC_MAINNET_TOKEN, enabled: true };
	const mockToggleableSolToken = { ...SOLANA_TOKEN, enabled: true };

	const mockOnToggle = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(tokenToggleUtils, 'isIcrcTokenToggleDisabled').mockReturnValue(false);
	});

	it('renders toggle IC token', () => {
		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockToggleableIcToken, onToggle: mockOnToggle }
		});

		expect(getByTestId(getTestIdForToggle(mockToggleableIcToken))).toBeInTheDocument();
	});

	it('renders toggle Spl token', () => {
		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockToggleableSplToken, onToggle: mockOnToggle }
		});

		expect(getByTestId(getTestIdForToggle(mockToggleableSplToken))).toBeInTheDocument();
	});

	it('renders toggle Erc721 token', () => {
		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockToggleableErc721Token, onToggle: mockOnToggle }
		});

		expect(getByTestId(getTestIdForToggle(mockToggleableErc721Token))).toBeInTheDocument();
	});

	it('should call onToggle on clicking it', async () => {
		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockToggleableIcToken, onToggle: mockOnToggle }
		});

		const toggleElement = getByTestId(getTestIdForToggle(mockToggleableIcToken));

		expect(toggleElement).toBeInTheDocument();

		const checkbox = toggleElement.querySelector('input[type="checkbox"]') as HTMLInputElement;

		expect(checkbox).toBeInTheDocument();

		await fireEvent.click(checkbox);

		expect(mockOnToggle).toHaveBeenCalledOnce();
	});

	it('should not call onToggle on clicking it if it is disabled', async () => {
		vi.spyOn(tokenToggleUtils, 'isIcrcTokenToggleDisabled').mockReturnValue(true);

		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockToggleableIcToken, onToggle: mockOnToggle }
		});

		const toggleElement = getByTestId(getTestIdForToggle(mockToggleableIcToken));

		expect(toggleElement).toBeInTheDocument();

		const checkbox = toggleElement.querySelector('input[type="checkbox"]') as HTMLInputElement;

		expect(checkbox).toBeInTheDocument();

		await fireEvent.click(checkbox);

		expect(mockOnToggle).not.toHaveBeenCalled();
	});

	it('should not call onToggle on clicking BTC Native token', async () => {
		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockToggleableBtcToken, onToggle: mockOnToggle }
		});

		const toggleElement = getByTestId('gix-cmp-toggle');

		expect(toggleElement).toBeInTheDocument();

		const checkbox = toggleElement.querySelector('input[type="checkbox"]') as HTMLInputElement;

		expect(checkbox).toBeInTheDocument();

		await fireEvent.click(checkbox);

		expect(mockOnToggle).not.toHaveBeenCalled();
	});

	it('should not call onToggle on clicking SOL Native token', async () => {
		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockToggleableSolToken, onToggle: mockOnToggle }
		});

		const toggleElement = getByTestId('gix-cmp-toggle');

		expect(toggleElement).toBeInTheDocument();

		const checkbox = toggleElement.querySelector('input[type="checkbox"]') as HTMLInputElement;

		expect(checkbox).toBeInTheDocument();

		await fireEvent.click(checkbox);

		expect(mockOnToggle).not.toHaveBeenCalled();
	});
});
