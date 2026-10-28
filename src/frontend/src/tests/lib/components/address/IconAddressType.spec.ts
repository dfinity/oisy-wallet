import IconAddressType from '$lib/components/address/IconAddressType.svelte';
import { TOKEN_ACCOUNT_ID_TYPES } from '$lib/constants/token-account-id.constants';
import { render } from '@testing-library/svelte';

describe('IconAddressType', () => {
	it.each(TOKEN_ACCOUNT_ID_TYPES)('renders an icon for the %s address type', (addressType) => {
		const { container } = render(IconAddressType, {
			props: { addressType, size: '32' }
		});

		const icon = container.querySelector('svg');

		expect(icon).not.toBeNull();
		expect(icon?.getAttribute('width')).toBe('32');
	});

	it('wraps the icon in a bordered circle by default', () => {
		const { container } = render(IconAddressType, { props: { addressType: 'Xrp' } });

		expect(container.querySelector('div.rounded-full > svg')).not.toBeNull();
	});

	it('renders the icon without the circle when transparent', () => {
		const { container } = render(IconAddressType, {
			props: { addressType: 'Xrp', transparent: true }
		});

		expect(container.querySelector('div.rounded-full')).toBeNull();
		expect(container.querySelector('svg')).not.toBeNull();
	});
});
