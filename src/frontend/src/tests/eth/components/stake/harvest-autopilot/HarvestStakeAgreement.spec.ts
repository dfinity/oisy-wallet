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

	it('should render the terms text in a label bound to the checkbox', () => {
		const { container } = render(HarvestStakeAgreement, {
			props: { checked: false }
		});

		const label = container.querySelector('label.text-sm[for="harvest-stake-agreement"]');

		expect(label).toBeInTheDocument();
	});

	it('should not nest the text label inside another label', () => {
		const { container } = render(HarvestStakeAgreement, {
			props: { checked: false }
		});

		const labels = container.querySelectorAll('label');

		expect(labels).not.toHaveLength(0);

		labels.forEach((label) => {
			expect(label.parentElement?.closest('label')).toBeNull();
		});
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
