import IcNoIndexPlaceholder from '$icp/components/transactions/IcNoIndexPlaceholder.svelte';
import IconAlertTriangle from '$lib/components/icons/lucide/IconAlertTriangle.svelte';
import IconSearchClose from '$lib/components/icons/lucide/IconSearchClose.svelte';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('IcNoIndexPlaceholder', () => {
	it('should render the title', () => {
		const { getByText } = render(IcNoIndexPlaceholder);

		expect(getByText(en.transactions.text.transaction_history_unavailable)).toBeInTheDocument();
	});

	it('should default to "missing" placeholderType', () => {
		const { getByText } = render(IcNoIndexPlaceholder);

		expect(
			getByText(replaceOisyPlaceholders(en.transactions.text.missing_index_canister_explanation))
		).toBeInTheDocument();
	});

	describe('when placeholderType is "missing"', () => {
		it('should render the correct text', () => {
			const { getByText } = render(IcNoIndexPlaceholder, { placeholderType: 'missing' });

			expect(
				getByText(replaceOisyPlaceholders(en.transactions.text.missing_index_canister_explanation))
			).toBeInTheDocument();
		});

		it('should render the correct icon', () => {
			const { container } = render(IcNoIndexPlaceholder, { placeholderType: 'missing' });

			const { container: iconContainer } = render(IconSearchClose, {
				size: '16'
			});

			expect(container.innerHTML).toContain(iconContainer.innerHTML);
		});
	});

	describe('when placeholderType is "not-working"', () => {
		it('should render the correct text', () => {
			const { getByText } = render(IcNoIndexPlaceholder, {
				placeholderType: 'not-working'
			});

			expect(
				getByText(
					replaceOisyPlaceholders(en.transactions.text.index_canister_not_working_explanation)
				)
			).toBeInTheDocument();
		});

		it('should render the correct icon', () => {
			const { container } = render(IcNoIndexPlaceholder, {
				placeholderType: 'not-working'
			});

			const { container: iconContainer } = render(IconAlertTriangle, {
				size: '16'
			});

			expect(container.innerHTML).toContain(iconContainer.innerHTML);
		});
	});
});