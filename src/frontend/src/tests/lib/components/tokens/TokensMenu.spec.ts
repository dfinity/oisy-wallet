import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
import { hideTokenCategoryFilterStore, hideZeroBalancesStore } from '$lib/stores/settings.store';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('TokensMenu', () => {
	beforeEach(() => {
		hideZeroBalancesStore.reset({ key: 'hide-zero-balances' });
		hideTokenCategoryFilterStore.reset({ key: 'hide-token-category-filter' });
	});

	it('should render the menu button', () => {
		const { container } = render(TokensMenu);

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
	});

	it('should show popover with menu items when clicked', async () => {
		const { container, getByText } = render(TokensMenu);

		const button = container.querySelector('button');
		assertNonNullish(button);

		await fireEvent.click(button);

		await waitFor(() => {
			expect(getByText(en.tokens.manage.text.list_settings)).toBeInTheDocument();
			expect(getByText(en.tokens.text.hide_zero_balances)).toBeInTheDocument();
			expect(getByText(en.tokens.text.hide_asset_types)).toBeInTheDocument();
			expect(getByText(en.tokens.manage.text.title)).toBeInTheDocument();
		});
	});

	it('should mark the button as opened when popover is visible', async () => {
		const { container } = render(TokensMenu);

		const button = container.querySelector('button');

		assertNonNullish(button);

		expect(button).not.toHaveClass('opened');
		expect(button).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(button);

		await waitFor(() => {
			expect(button).toHaveClass('opened');
			expect(button).toHaveAttribute('aria-expanded', 'true');
		});
	});

	describe('notification blob', () => {
		const getNotificationBlob = (container: HTMLElement) =>
			container.querySelector('.rounded-full.bg-brand-primary');

		it('should not show blue dot when nothing is enabled', () => {
			const { container } = render(TokensMenu);

			const blob = getNotificationBlob(container);

			expect(blob).toBeInTheDocument();
			expect(blob?.classList.contains('opacity-0')).toBeTruthy();
		});

		it('should show blue dot when hide zero balances is enabled', () => {
			hideZeroBalancesStore.set({
				key: 'hide-zero-balances',
				value: { enabled: true }
			});

			const { container } = render(TokensMenu);

			const blob = getNotificationBlob(container);

			expect(blob?.classList.contains('opacity-100')).toBeTruthy();
		});

		it('should not show blue dot when only asset type filter is enabled', () => {
			hideTokenCategoryFilterStore.set({
				key: 'hide-token-category-filter',
				value: { enabled: true }
			});

			const { container } = render(TokensMenu);

			const blob = getNotificationBlob(container);

			expect(blob?.classList.contains('opacity-0')).toBeTruthy();
		});

		it('should show blue dot when both are enabled because of hide zero balances', () => {
			hideZeroBalancesStore.set({
				key: 'hide-zero-balances',
				value: { enabled: true }
			});
			hideTokenCategoryFilterStore.set({
				key: 'hide-token-category-filter',
				value: { enabled: true }
			});

			const { container } = render(TokensMenu);

			const blob = getNotificationBlob(container);

			expect(blob?.classList.contains('opacity-100')).toBeTruthy();
		});
	});
});
