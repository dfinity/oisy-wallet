import BtcTokenModal from '$btc/components/tokens/BtcTokenModal.svelte';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { token } from '$lib/stores/token.store';
import { render } from '@testing-library/svelte';
import { beforeEach } from 'node:test';
import { get } from 'svelte/store';

describe('BtcTokenModal', () => {
	beforeEach(() => {
		token.reset();
	});

	it('necessary content is displayed', () => {
		token.set(BTC_MAINNET_TOKEN);

		const { container } = render(BtcTokenModal);

		expect(container?.textContent).includes(get(token)?.network.name);
		expect(container?.textContent).includes(get(token)?.name);
		expect(container?.textContent).includes(get(token)?.symbol);
		expect(container?.textContent).includes(get(token)?.decimals);
	});
});
