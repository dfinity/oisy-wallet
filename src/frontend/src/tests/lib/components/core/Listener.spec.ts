import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import Listener from '$lib/components/core/Listener.svelte';
import * as authStore from '$lib/derived/auth.derived';
import * as networkUtils from '$lib/utils/network.utils';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('Listener', () => {
	const mockAuthStore = (value = true) =>
		vi.spyOn(authStore, 'authNotSignedIn', 'get').mockImplementation(() => readable(value));

	beforeEach(() => {
		vi.restoreAllMocks();

		vi.clearAllMocks();
		vi.resetAllMocks();

		mockAuthStore();
	});

	it('should render nothing if token is nullish', () => {
		const { container } = render(Listener, {
			props: { token: null }
		});

		expect(container.textContent).toBe('');
	});

	it('should render nothing if user is not connected', () => {
		mockAuthStore(false);

		const { container } = render(Listener, {
			props: { token: ETHEREUM_TOKEN }
		});

		expect(container.textContent).toBe('');
	});

	it('should render nothing if the token has an unknown network', () => {
		vi.spyOn(networkUtils, 'isNetworkIdICP').mockReturnValueOnce(false);
		vi.spyOn(networkUtils, 'isNetworkIdBitcoin').mockReturnValueOnce(false);
		vi.spyOn(networkUtils, 'isNetworkIdEthereum').mockReturnValueOnce(false);
		vi.spyOn(networkUtils, 'isNetworkIdEvm').mockReturnValueOnce(false);

		const { container } = render(Listener, {
			props: { token: ICP_TOKEN }
		});

		expect(container.textContent).toBe('');
	});

	it('should render nothing if it is an IC token', () => {
		const { container } = render(Listener, {
			props: { token: ICP_TOKEN }
		});

		expect(container.textContent).toBe('');
	});

	// TODO: add tests for rendered listeners, when it is possible to dynamically pass children to the components
});
