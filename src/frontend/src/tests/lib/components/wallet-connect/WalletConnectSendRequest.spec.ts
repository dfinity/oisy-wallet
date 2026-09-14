import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ERC_SET_APPROVAL_FOR_ALL_HASH } from '$eth/constants/erc.constants';
import {
	ERC20_APPROVE_HASH,
	ERC20_INCREASE_ALLOWANCE_HASH,
	ERC20_TRANSFER_HASH
} from '$eth/constants/erc20.constants';
import { MULTICALL_HASH } from '$eth/constants/multicall.constants';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import WalletConnectSend from '$lib/components/wallet-connect/WalletConnectSend.svelte';
import { MAX_UINT_256 } from '$lib/constants/app.constants';
import { modalStore } from '$lib/stores/modal.store';
import en from '$tests/mocks/i18n.mock';
import { nonNullish } from '@dfinity/utils';
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
	const HOLDER = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';
	const UNKNOWN_TITLE = en.wallet_connect.text.unknown_call_title;

	const encodeArgs = ({
		selector,
		types,
		values
	}: {
		selector: string;
		types: string[];
		values: unknown[];
	}) => `${selector}${AbiCoder.defaultAbiCoder().encode(types, values).slice(2)}`;

	const encodeCall = ({ selector, value }: { selector: string; value: bigint }) =>
		encodeArgs({ selector, types: ['address', 'uint256'], values: [SPENDER, value] });

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

	// Every selector a researcher demonstrated could move assets through this review, each carrying
	// the arguments its own ABI declares rather than filler. Filler is worse than useless here: it
	// fails to decode for every one of these shapes, so each case would take the fail-closed path
	// and the table would pass while proving nothing about the decoded review it claims to cover.
	//
	// Four are decoded, and are asserted to name the party they hand something to. Five are not,
	// and are covered by the fallback rather than by five more decoders. What every row shares is
	// the claim that matters: none is summarized as a zero-value native send.
	describe.each([
		{
			name: 'approve',
			data: encodeCall({ selector: ERC20_APPROVE_HASH, value: MAX_UINT_256 }),
			title: en.core.text.approve,
			names: SPENDER
		},
		// A decoded ERC-20 transfer really is a send, of tokens, to the recipient its calldata
		// names. It is titled Send because that is what it is, not because nothing was read.
		{
			name: 'transfer',
			data: encodeCall({ selector: ERC20_TRANSFER_HASH, value: 1_000_000n }),
			title: en.send.text.send,
			names: SPENDER
		},
		{
			name: 'setApprovalForAll',
			data: encodeArgs({
				selector: ERC_SET_APPROVAL_FOR_ALL_HASH,
				types: ['address', 'bool'],
				values: [SPENDER, true]
			}),
			title: en.core.text.approve,
			names: SPENDER
		},
		{
			name: 'increaseAllowance',
			data: encodeCall({ selector: ERC20_INCREASE_ALLOWANCE_HASH, value: MAX_UINT_256 }),
			title: en.core.text.approve,
			names: SPENDER
		},
		{
			name: 'transferFrom',
			data: encodeArgs({
				selector: '0x23b872dd',
				types: ['address', 'address', 'uint256'],
				values: [HOLDER, SPENDER, 1n]
			}),
			title: UNKNOWN_TITLE
		},
		{
			name: 'ERC-721 safeTransferFrom',
			data: encodeArgs({
				selector: '0x42842e0e',
				types: ['address', 'address', 'uint256'],
				values: [HOLDER, SPENDER, 1n]
			}),
			title: UNKNOWN_TITLE
		},
		{
			name: 'ERC-721 safeTransferFrom with data',
			data: encodeArgs({
				selector: '0xb88d4fde',
				types: ['address', 'address', 'uint256', 'bytes'],
				values: [HOLDER, SPENDER, 1n, '0x']
			}),
			title: UNKNOWN_TITLE
		},
		{
			name: 'ERC-1155 safeTransferFrom',
			data: encodeArgs({
				selector: '0xf242432a',
				types: ['address', 'address', 'uint256', 'uint256', 'bytes'],
				values: [HOLDER, SPENDER, 1n, 1n, '0x']
			}),
			title: UNKNOWN_TITLE
		},
		{
			name: 'ERC-1155 safeBatchTransferFrom',
			data: encodeArgs({
				selector: '0x2eb2c2d6',
				types: ['address', 'address', 'uint256[]', 'uint256[]', 'bytes'],
				values: [HOLDER, SPENDER, [1n], [1n], '0x']
			}),
			title: UNKNOWN_TITLE
		}
	])('$name', ({ data, title, names }) => {
		it('should never be summarized as a zero-value native send', async () => {
			const { container } = await deliver(data);

			expect(container).not.toHaveTextContent(`0 ${ETHEREUM_TOKEN.symbol}`);
		});

		it(`should be titled ${title}`, async () => {
			const { container } = await deliver(data);

			expect(container).toHaveTextContent(title);
		});

		if (nonNullish(names)) {
			// Proves the arguments were read rather than the request having fallen through to the
			// fail-closed path, which would satisfy both assertions above while stating nothing.
			it('should name the party its calldata hands something to', async () => {
				const { container } = await deliver(data);

				expect(container).toHaveTextContent(names);
				expect(container).not.toHaveTextContent(en.wallet_connect.text.unverifiable_erc20_request);
				expect(container).not.toHaveTextContent(
					en.wallet_connect.text.unverifiable_approval_for_all_request
				);
			});
		}
	});

	it('should still describe a request carrying no calldata as an ordinary send', async () => {
		const { container } = await deliver(undefined);

		expect(container).not.toHaveTextContent(en.wallet_connect.text.unknown_call);
	});
});
