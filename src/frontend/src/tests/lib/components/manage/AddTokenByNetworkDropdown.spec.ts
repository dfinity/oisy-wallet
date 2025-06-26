import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import AddTokenByNetworkDropdown from '$lib/components/manage/AddTokenByNetworkDropdown.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('AddTokenByNetworkDropdown', () => {
	const props = {
		availableNetworks: [ICP_NETWORK, ETHEREUM_NETWORK]
	};

	it('should render all expected values when networkName is not provided', () => {
		const { container } = render(AddTokenByNetworkDropdown, { props });

		expect(container).toHaveTextContent(en.tokens.manage.text.network);
		expect(container).toHaveTextContent(en.tokens.manage.placeholder.select_network);
	});

	it('should render all expected values when networkName is provided', () => {
		const { container } = render(AddTokenByNetworkDropdown, {
			props: {
				...props,
				networkName: ICP_NETWORK.name
			}
		});

		expect(container).toHaveTextContent(en.tokens.manage.text.network);
		expect(container).toHaveTextContent(ICP_NETWORK.name);
	});
});
