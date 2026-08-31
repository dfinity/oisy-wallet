import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ERC20_APPROVE_HASH, ERC20_INCREASE_ALLOWANCE_HASH } from '$eth/constants/erc20.constants';
import { MULTICALL_HASH } from '$eth/constants/multicall.constants';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import WalletConnectSend from '$lib/components/wallet-connect/WalletConnectSend.svelte';
import { MAX_UINT_256 } from '$lib/constants/app.constants';
import { modalStore } from '$lib/stores/modal.store';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { AbiCoder } from 'ethers/abi';

// What the review renders is covered against the components themselves. What is covered here is the
// wiring: that a session request as WalletConnect delivers it reaches that review at all, carrying
// the calldata the dApp sent. A review that describes an unreadable call correctly is worth nothing
// if the request never arrives at it.
describe('an eth_sendTransaction request reaching the review', () => {
	const SPENDER = '0x2222222222222222222222222222222222222222';
	const UNKNOWN_SELECTOR = '0x87517c45';
	const UNKNOWN_TITLE = en.wallet_connect.text.unknown_call_title;

	const encodeCall = ({ selector, value }: { selector: string; value: bigint }) =>
		`${selector}${AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SPENDER, value]).slice(2)}`;

	const request = (data: string | undefined): WalletKitTypes.SessionRequest =>
		({
			id: 1,
			topic: 'mock-topic',
			params: {
				request: {
					method: 'eth_sendTransaction',
					params: [
						{
							from: '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a',
							to: USDC_TOKEN.address,
							value: '0x0',
							data
						}
					]
				},
				chainId: `eip155:${ETHEREUM_NETWORK.chainId}`
			},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					validation: 'VALID',
					origin: 'https://dapp.example',
					isScam: false
				}
			}
		}) as unknown as WalletKitTypes.SessionRequest;

	const deliver = async (data: string | undefined) => {
		const rendered = render(WalletConnectSend);

		modalStore.openWalletConnectSend({ id: Symbol(), data: request(data) });

		await waitFor(() => expect(rendered.container).toHaveTextContent('https://dapp.example'));

		return rendered;
	};

	beforeEach(() => {
		modalStore.close();

		erc20DefaultTokensStore.reset();
		erc20CustomTokensStore.resetAll();

		erc20DefaultTokensStore.add(USDC_TOKEN);
		erc20CustomTokensStore.setAll([{ data: { ...USDC_TOKEN, enabled: true }, certified: false }]);
	});

	// The reported shape: calldata granting an unlimited allowance, delivered as a request whose
	// value field is zero.
	it('should describe an increaseAllowance as an allowance, never as a zero-value send', async () => {
		const { container } = await deliver(
			encodeCall({ selector: ERC20_INCREASE_ALLOWANCE_HASH, value: MAX_UINT_256 })
		);

		expect(container).toHaveTextContent(en.wallet_connect.text.allowance_increase);
		expect(container).toHaveTextContent(SPENDER);
		expect(container).not.toHaveTextContent(`0 ${ETHEREUM_TOKEN.symbol}`);
	});

	it('should reach the review as an unknown call for a selector nobody decoded', async () => {
		const { container } = await deliver(`${UNKNOWN_SELECTOR}deadbeef`);

		expect(container).toHaveTextContent(en.wallet_connect.text.unknown_call);
		expect(container).not.toHaveTextContent(`0 ${ETHEREUM_TOKEN.symbol}`);
	});

	it('should carry the calls batched inside a multicall through to the review', async () => {
		const inner = encodeCall({ selector: ERC20_APPROVE_HASH, value: MAX_UINT_256 });
		const data = `${MULTICALL_HASH}${AbiCoder.defaultAbiCoder()
			.encode(['bytes[]'], [[inner]])
			.slice(2)}`;

		const { container, getByRole } = await deliver(data);

		expect(container).toHaveTextContent(en.wallet_connect.text.unknown_call);

		// The calls it contains live on the second tab, which is where the warning points.
		await fireEvent.click(getByRole('button', { name: en.wallet_connect.text.tab_raw_data }));

		expect(container).toHaveTextContent(MULTICALL_HASH);
		expect(container).toHaveTextContent(ERC20_APPROVE_HASH);
	});

	// Every selector a researcher demonstrated could move assets through this review. Four of them
	// OISY decodes; five it does not, and those are the point: covering them is the fallback's job
	// rather than five more decoders. What every one of them must satisfy is the same, whether
	// decoded or not: it is never summarized as a zero-value native send.
	describe.each([
		{ name: 'approve', selector: ERC20_APPROVE_HASH, title: en.core.text.approve },
		// A decoded ERC-20 transfer really is a send, of tokens, with its recipient and amount
		// stated. It is titled Send because that is what it is, not because nothing was read.
		{ name: 'transfer', selector: '0xa9059cbb', title: en.send.text.send },
		{ name: 'setApprovalForAll', selector: '0xa22cb465', title: en.core.text.approve },
		{
			name: 'increaseAllowance',
			selector: ERC20_INCREASE_ALLOWANCE_HASH,
			title: en.core.text.approve
		},
		{ name: 'transferFrom', selector: '0x23b872dd', title: UNKNOWN_TITLE },
		{ name: 'ERC-721 safeTransferFrom', selector: '0x42842e0e', title: UNKNOWN_TITLE },
		{ name: 'ERC-721 safeTransferFrom with data', selector: '0xb88d4fde', title: UNKNOWN_TITLE },
		{ name: 'ERC-1155 safeTransferFrom', selector: '0xf242432a', title: UNKNOWN_TITLE },
		{ name: 'ERC-1155 safeBatchTransferFrom', selector: '0x2eb2c2d6', title: UNKNOWN_TITLE }
	])('$name', ({ selector, title }) => {
		const calldata = `${selector}${'de'.repeat(96)}`;

		it('should never be summarized as a zero-value native send', async () => {
			const { container } = await deliver(calldata);

			expect(container).not.toHaveTextContent(`0 ${ETHEREUM_TOKEN.symbol}`);
		});

		it(`should be titled ${title}`, async () => {
			const { container } = await deliver(calldata);

			expect(container).toHaveTextContent(title);
		});
	});

	it('should still describe a request carrying no calldata as an ordinary send', async () => {
		const { container } = await deliver(undefined);

		expect(container).not.toHaveTextContent(en.wallet_connect.text.unknown_call);
	});
});
