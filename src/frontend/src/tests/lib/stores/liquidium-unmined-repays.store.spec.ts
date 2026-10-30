import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { liquidiumUnminedRepaysStore } from '$lib/stores/liquidium-unmined-repays.store';
import { get } from 'svelte/store';

describe('liquidium-unmined-repays.store', () => {
	const hashA = `0x${'ab'.repeat(32)}`;
	const hashB = `0x${'cd'.repeat(32)}`;

	beforeEach(() => {
		liquidiumUnminedRepaysStore.reset();
	});

	it('starts empty', () => {
		expect(get(liquidiumUnminedRepaysStore)).toEqual({});
	});

	it('holds each transfer under its hash', () => {
		liquidiumUnminedRepaysStore.add({ hash: hashA, tokenId: USDC_TOKEN.id, amount: 10n });
		liquidiumUnminedRepaysStore.add({ hash: hashB, tokenId: ETHEREUM_TOKEN.id, amount: 20n });

		expect(get(liquidiumUnminedRepaysStore)).toEqual({
			[hashA]: { tokenId: USDC_TOKEN.id, amount: 10n },
			[hashB]: { tokenId: ETHEREUM_TOKEN.id, amount: 20n }
		});
	});

	it('removes only the given transfer', () => {
		liquidiumUnminedRepaysStore.add({ hash: hashA, tokenId: USDC_TOKEN.id, amount: 10n });
		liquidiumUnminedRepaysStore.add({ hash: hashB, tokenId: USDC_TOKEN.id, amount: 20n });

		liquidiumUnminedRepaysStore.remove(hashA);

		expect(get(liquidiumUnminedRepaysStore)).toEqual({
			[hashB]: { tokenId: USDC_TOKEN.id, amount: 20n }
		});
	});

	it('ignores removing a transfer it does not hold', () => {
		liquidiumUnminedRepaysStore.add({ hash: hashA, tokenId: USDC_TOKEN.id, amount: 10n });

		liquidiumUnminedRepaysStore.remove(hashB);

		expect(get(liquidiumUnminedRepaysStore)).toEqual({
			[hashA]: { tokenId: USDC_TOKEN.id, amount: 10n }
		});
	});

	it('empties on reset', () => {
		liquidiumUnminedRepaysStore.add({ hash: hashA, tokenId: USDC_TOKEN.id, amount: 10n });

		liquidiumUnminedRepaysStore.reset();

		expect(get(liquidiumUnminedRepaysStore)).toEqual({});
	});
});
