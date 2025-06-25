import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import EnableTokenToggle from '$lib/components/tokens/EnableTokenToggle.svelte';
import { MANAGE_TOKENS_MODAL_TOKEN_TOGGLE } from '$lib/constants/test-ids.constants';
import type { Token } from '$lib/types/token';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { expect } from 'vitest';

describe('EnableTokenToggle', () => {
	const getTestIdForToggle = (token: Token) =>
		`${MANAGE_TOKENS_MODAL_TOKEN_TOGGLE}-${token.symbol}-${token.network.id.description}`;

	const mockTogglableIcToken = { ...mockValidIcrcToken, enabled: true };
	const mockTogglableSplToken = { ...BONK_TOKEN, enabled: true };
	const mockTogglableBtcToken = { ...BTC_MAINNET_TOKEN, enabled: true };
	const mockTogglableSolToken = { ...SOLANA_TOKEN, enabled: true };

	it('renders toggle IC token', () => {
		const { getByTestId } = render(EnableTokenToggle, {
			props: {
				token: mockTogglableIcToken as Token,
				onToggle: () => {}
			}
		});

		expect(getByTestId(getTestIdForToggle(mockTogglableIcToken as Token))).toBeInTheDocument();
	});

	it('renders toggle Spl token', () => {
		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockTogglableSplToken as Token, onToggle: () => {} }
		});

		expect(getByTestId(getTestIdForToggle(mockTogglableSplToken))).toBeInTheDocument();
	});

	it('should call onToggle on clicking it', async () => {
		const fn = vi.fn();

		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockTogglableIcToken as Token, onToggle: () => fn() }
		});

		await fireEvent.click(getByTestId(getTestIdForToggle(mockTogglableIcToken as Token)));

		expect(fn).toHaveBeenCalledOnce();
	});

	it('should not call onToggle on clicking BTC Native token', async () => {
		const fn = vi.fn();

		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockTogglableBtcToken as Token, onToggle: () => fn() }
		});

		await fireEvent.click(getByTestId('toggle'));

		expect(fn).toHaveBeenCalledTimes(0);
	});

	it('should not call onToggle on clicking SOL Native token', async () => {
		const fn = vi.fn();

		const { getByTestId } = render(EnableTokenToggle, {
			props: { token: mockTogglableSolToken as Token, onToggle: () => fn() }
		});

		await fireEvent.click(getByTestId('toggle'));

		expect(fn).toHaveBeenCalledTimes(0);
	});
});
