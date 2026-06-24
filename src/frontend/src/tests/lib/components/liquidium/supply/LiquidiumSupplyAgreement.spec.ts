import LiquidiumSupplyAgreement from '$lib/components/liquidium/supply/LiquidiumSupplyAgreement.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('LiquidiumSupplyAgreement', () => {
	it('renders the agreement text and an unchecked checkbox', () => {
		const { container } = render(LiquidiumSupplyAgreement, { props: { checked: false } });

		expect(container).toHaveTextContent(en.liquidium.text.supply_agreement);

		const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');

		expect(checkbox).not.toBeNull();
		expect(checkbox?.checked).toBeFalsy();
	});

	it('toggles the checkbox on click', async () => {
		const { container } = render(LiquidiumSupplyAgreement, { props: { checked: false } });

		const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');

		await fireEvent.click(checkbox as HTMLInputElement);

		expect(checkbox?.checked).toBeTruthy();
	});
});
