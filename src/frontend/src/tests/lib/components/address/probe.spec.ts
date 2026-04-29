import InputAddress from '$lib/components/address/InputAddress.svelte';
import { fireEvent, render } from '@testing-library/svelte';

describe('probe toHaveStyle', () => {
	const defaultProps = {
		value: undefined,
		placeholder: 'Enter BTC address',
		name: 'btc-address-input',
		testId: 'input-address-test'
	};

	it('check var() works', async () => {
		const { getByPlaceholderText, container } = render(InputAddress, defaultProps);
		const input = getByPlaceholderText('Enter BTC address');
		const initialDiv = container.querySelector('div')!;

		console.log('STYLE ATTR:', initialDiv.getAttribute('style'));
		console.log('CSSOM inherit:', (initialDiv.style as any).getPropertyValue('--input-custom-border-color'));

		await fireEvent.input(input, { target: { value: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlx' } });

		console.log('STYLE ATTR after invalid:', initialDiv.getAttribute('style'));
		console.log('CSSOM after invalid:', (initialDiv.style as any).getPropertyValue('--input-custom-border-color'));
	});
});
