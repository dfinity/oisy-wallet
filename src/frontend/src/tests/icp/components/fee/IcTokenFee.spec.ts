import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { render } from '@testing-library/svelte';

describe('IcTokenFee', () => {
	const mockContext = new Map([]);

	beforeEach(() => {
		mockContext.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				token: ICP_TOKEN
			})
		);
	});

	it('should render the token fee', () => {
		const { container } = render(IcTokenFee, {
			context: mockContext
		});

		expect(container).toHaveTextContent(
			`${formatToken({ value: ICP_TOKEN.fee, displayDecimals: ICP_TOKEN.decimals, unitName: ICP_TOKEN.decimals })} ${ICP_TOKEN.symbol}`
		);
	});

	it('should render zero for EXT tokens', () => {
		mockContext.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				token: mockValidExtV2Token
			})
		);

		const { container } = render(IcTokenFee, {
			context: mockContext
		});

		expect(container).toHaveTextContent(`0 ${mockValidExtV2Token.symbol}`);
	});

	it('should render zero if sent to the minting account', () => {
		const { sendDestination, ...rest } = initSendContext({
			token: { ...ICP_TOKEN, mintingAccount: getIcrcAccount(mockPrincipal) } as Token
		});

		mockContext.set(SEND_CONTEXT_KEY, { sendDestination, ...rest });

		sendDestination.set(mockPrincipal.toText());

		const { container } = render(IcTokenFee, {
			context: mockContext
		});

		expect(container).toHaveTextContent(`0 ${ICP_TOKEN.symbol}`);
	});
});
