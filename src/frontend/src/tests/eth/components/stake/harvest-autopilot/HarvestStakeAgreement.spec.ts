import HarvestStakeAgreement from '$eth/components/stake/harvest-autopilot/HarvestStakeAgreement.svelte';
import { fireEvent, render } from '@testing-library/svelte';

describe('HarvestStakeAgreement', () => {
	it('should render the checkbox', () => {
		const { getByRole } = render(HarvestStakeAgreement, {
			props: { checked: false }
		});

		const checkbox = getByRole('checkbox') as HTMLInputElement;

		expect(checkbox).toBeInTheDocument();
		expect(checkbox.checked).toBeFalsy();
	});

	it('should render the terms text', () => {
		const { container } = render(HarvestStakeAgreement, {
			props: { checked: false }
		});

		const span = container.querySelector('span.text-sm');

		expect(span).toBeInTheDocument();
	});

	it('should render links to Risk Disclosures and Terms and Conditions', () => {
		const { getAllByRole } = render(HarvestStakeAgreement, {
			props: { checked: false }
		});

		const links = getAllByRole('link');

		expect(links).toHaveLength(2);
		expect(links[0]).toHaveAttribute('href', 'https://docs.harvest.finance/legal/risk-disclosures');
		expect(links[1]).toHaveAttribute(
			'href',
			'https://docs.harvest.finance/legal/terms-and-conditions'
		);
	});

	it('should toggle checked state when checkbox is clicked', async () => {
		const { getByRole } = render(HarvestStakeAgreement, {
			props: { checked: false }
		});

		const checkbox = getByRole('checkbox') as HTMLInputElement;

		expect(checkbox.checked).toBeFalsy();

		await fireEvent.click(checkbox);

		expect(checkbox.checked).toBeTruthy();
	});

	it('should render checked when checked prop is true', () => {
		const { getByRole } = render(HarvestStakeAgreement, {
			props: { checked: true }
		});

		const checkbox = getByRole('checkbox') as HTMLInputElement;

		expect(checkbox.checked).toBeTruthy();
	});
});
