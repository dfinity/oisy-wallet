import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import ReceiveTokenStep from '$lib/components/receive/ReceiveTokenStep.svelte';
import type { Token } from '$lib/types/token';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getReceiveAssets } from '$lib/utils/receive.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { render } from '@testing-library/svelte';

describe('ReceiveTokenStep', () => {
	// An imported token with the same ticker as a verified one, outside its group.
	const importedUsdc = {
		...BASE_USDC_TOKEN,
		id: parseTokenId('imported-USDC'),
		address: '0x0000000000000000000000000000000000000001',
		groupData: undefined
	} as Token & { address: string };

	const verifiedUsdc = { ...USDC_TOKEN, groupData: undefined } as Token & { address: string };

	const assets = getReceiveAssets({ tokens: [verifiedUsdc, importedUsdc] });

	const props = {
		assets,
		autofocus: false,
		onSelect: vi.fn(),
		onImport: vi.fn(),
		onClose: vi.fn()
	};

	const importedLabel = shortenWithMiddleEllipsis({ text: importedUsdc.address, splitLength: 6 });

	it('should tell two tokens with the same ticker apart by network and contract', () => {
		const { container } = render(ReceiveTokenStep, { props: { ...props, filter: '' } });

		expect(container).toHaveTextContent(importedLabel);
		expect(container).toHaveTextContent(ETHEREUM_NETWORK.name);
	});

	it('should keep the contract on a match that hides its namesake', () => {
		const { container } = render(ReceiveTokenStep, {
			props: { ...props, filter: importedUsdc.address }
		});

		expect(container).not.toHaveTextContent(
			shortenWithMiddleEllipsis({ text: verifiedUsdc.address, splitLength: 6 })
		);
		expect(container).toHaveTextContent(importedLabel);
	});
});
