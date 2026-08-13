import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
import { ERC20_DEPOSIT_HASH, ERC20_TRANSFER_HASH } from '$eth/constants/erc20.constants';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { mapAddressToName } from '$eth/utils/transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getTokenDisplayName } from '$lib/utils/token.utils';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import {
	createMockEthTransactionsUi,
	createMockNftTransactionsUi
} from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress2 } from '$tests/mocks/eth.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$eth/providers/alchemy.providers', () => ({
	initMinedTransactionsListener: () => ({
		disconnect: async () => {}
	})
}));

vi.mock(import('$eth/derived/erc721.derived'), async (importOriginal) => {
	const { readable } = await import('svelte/store');
	const { mockValidErc721Token } = await import('$tests/mocks/erc721-tokens.mock');

	const mockToken = { ...mockValidErc721Token, enabled: true };

	return {
		...importOriginal,
		erc721Tokens: readable([mockToken]),
		enabledErc721Tokens: readable([mockToken])
	};
});

vi.mock(import('$eth/derived/erc-fungible.derived'), async (importOriginal) => {
	const actual = await importOriginal();
	const { readable } = await import('svelte/store');
	const { USDC_TOKEN } = await import('$env/tokens/tokens-erc20/tokens.usdc.env');

	const mockToken = { ...USDC_TOKEN, enabled: true };

	return {
		...actual,
		ercFungibleTokens: readable([mockToken]),
		enabledErcFungibleTokens: readable([mockToken])
	};
});

vi.mock(import('$eth/utils/transactions.utils'), async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...actual,
		mapAddressToName: vi.fn(() => undefined)
	};
});

vi.mock(import('$eth/derived/native-tokens.derived'), async () => {
	const { readable } = await import('svelte/store');
	const { ETHEREUM_TOKEN } = await import('$env/tokens/tokens.eth.env');

	return {
		enabledEthEvmNativeTokens: readable([ETHEREUM_TOKEN])
	};
});

const [mockEthTransactionUi] = createMockEthTransactionsUi(1);
const [mockErc721TransactionUi] = createMockNftTransactionsUi(1);

describe('EthTransactionModal', () => {
	const mockApproveSpender = '0x1234567890abcdef1234567890abcdef12345678';

	// { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: 1000000n }
	const mockData =
		'0x095ea7b3000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f4240';

	const mockApproveTransactionUi = {
		...mockEthTransactionUi,
		type: 'approve' as const,
		approveSpender: mockApproveSpender,
		data: mockData,
		gasUsed: 21_000n,
		gasPrice: 1_000_000_000n
	};

	it('should render the ETH transaction modal', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(getByText(get(i18n).transaction.type.send)).toBeInTheDocument();
	});

	it('should display correct amount and currency for fungible token', () => {
		const { getAllByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		const formattedAmount = `${formatToken({
			value: mockEthTransactionUi.value ?? ZERO,
			unitName: ETHEREUM_TOKEN.decimals,
			displayDecimals: ETHEREUM_TOKEN.decimals
		})} ${ETHEREUM_TOKEN.symbol}`;

		expect(getAllByText(formattedAmount)[0]).toBeInTheDocument();
	});

	it('should not display amount and currency for non fungible token', () => {
		const { queryByText } = render(EthTransactionModal, {
			transaction: mockErc721TransactionUi,
			token: mockValidErc721Token
		});

		const formattedAmount = `${formatToken({
			value: mockErc721TransactionUi.value ?? ZERO,
			unitName: mockValidErc721Token.decimals,
			displayDecimals: mockValidErc721Token.decimals
		})} ${mockValidErc721Token.symbol}`;

		expect(queryByText(formattedAmount)).not.toBeInTheDocument();
	});

	it('should display correct to and from addresses for send', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		assertNonNullish(mockEthTransactionUi.to);

		expect(getByText(mockEthTransactionUi.to)).toBeInTheDocument();
	});

	it('should display tx block number', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		assertNonNullish(mockEthTransactionUi.blockNumber);

		expect(getByText(mockEthTransactionUi.blockNumber.toString())).toBeInTheDocument();
	});

	it('should display tx hash', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		assertNonNullish(mockEthTransactionUi.hash);

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockEthTransactionUi.hash }))
		).toBeInTheDocument();
	});

	it('should display token id for non fungible tokens', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockErc721TransactionUi,
			token: mockValidErc721Token
		});

		assertNonNullish(mockErc721TransactionUi.tokenId);

		expect(getByText(mockErc721TransactionUi.tokenId.toString())).toBeInTheDocument();
	});

	it('should display the network', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(getByText(get(i18n).networks.network)).toBeInTheDocument();
		expect(getByText(ETHEREUM_TOKEN.network.name)).toBeInTheDocument();
	});

	it('should display spender address fallback when spender name is not resolved', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockApproveTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(getByText(shortenWithMiddleEllipsis({ text: mockApproveSpender }))).toBeInTheDocument();
	});

	it('should display approved amount for approve transaction', () => {
		const { getAllByText } = render(EthTransactionModal, {
			transaction: mockApproveTransactionUi,
			token: ETHEREUM_TOKEN
		});

		const formattedAmount = `${formatToken({
			value: 1000000n,
			unitName: ETHEREUM_TOKEN.decimals,
			displayDecimals: ETHEREUM_TOKEN.decimals
		})} ${ETHEREUM_TOKEN.symbol}`;

		expect(getAllByText(formattedAmount)[0]).toBeInTheDocument();
	});

	it('should display fee for approve transaction', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockApproveTransactionUi,
			token: ETHEREUM_TOKEN
		});

		const fee = mockApproveTransactionUi.gasUsed * mockApproveTransactionUi.gasPrice;

		const formattedFee = `${formatToken({
			value: fee,
			unitName: ETHEREUM_TOKEN.decimals,
			displayDecimals: ETHEREUM_TOKEN.decimals
		})} ${ETHEREUM_TOKEN.symbol}`;

		expect(getByText(get(i18n).fee.text.fee)).toBeInTheDocument();
		expect(getByText(formattedFee)).toBeInTheDocument();
	});

	it('should not display fee for transaction without gas data', () => {
		const { queryByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(queryByText(get(i18n).fee.text.fee)).not.toBeInTheDocument();
	});

	it('should display fee for send transaction with gas data', () => {
		const gasUsed = 21_000n;
		const gasPrice = 1_000_000_000n;

		const { getByText } = render(EthTransactionModal, {
			transaction: { ...mockEthTransactionUi, type: 'send' as const, gasUsed, gasPrice },
			token: ETHEREUM_TOKEN
		});

		const fee = gasUsed * gasPrice;

		const formattedFee = `${formatToken({
			value: fee,
			unitName: ETHEREUM_TOKEN.decimals,
			displayDecimals: ETHEREUM_TOKEN.decimals
		})} ${ETHEREUM_TOKEN.symbol}`;

		expect(getByText(get(i18n).fee.text.fee)).toBeInTheDocument();
		expect(getByText(formattedFee)).toBeInTheDocument();
	});

	it('should display fee for ERC20 deposit transaction', () => {
		const gasUsed = 21_000n;
		const gasPrice = 1_000_000_000n;

		const mockDepositData = `${ERC20_DEPOSIT_HASH}000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000`;

		const { getByText } = render(EthTransactionModal, {
			transaction: {
				...mockEthTransactionUi,
				type: 'deposit' as const,
				data: mockDepositData,
				gasUsed,
				gasPrice
			},
			token: ETHEREUM_TOKEN
		});

		const fee = gasUsed * gasPrice;

		const formattedFee = `${formatToken({
			value: fee,
			unitName: ETHEREUM_TOKEN.decimals,
			displayDecimals: ETHEREUM_TOKEN.decimals
		})} ${ETHEREUM_TOKEN.symbol}`;

		expect(getByText(get(i18n).fee.text.fee)).toBeInTheDocument();
		expect(getByText(formattedFee)).toBeInTheDocument();
	});

	it('should display gas fee as value for ERC20 deposit transaction', () => {
		const gasUsed = 21_000n;
		const gasPrice = 1_000_000_000n;
		const gasFee = gasUsed * gasPrice;

		const mockDepositData = `${ERC20_DEPOSIT_HASH}000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000`;

		const { getAllByText } = render(EthTransactionModal, {
			transaction: {
				...mockEthTransactionUi,
				type: 'deposit' as const,
				data: mockDepositData,
				gasUsed,
				gasPrice
			},
			token: ETHEREUM_TOKEN
		});

		const formattedGasFee = `${formatToken({
			value: gasFee,
			unitName: ETHEREUM_TOKEN.decimals,
			displayDecimals: ETHEREUM_TOKEN.decimals
		})} ${ETHEREUM_TOKEN.symbol}`;

		expect(getAllByText(formattedGasFee)[0]).toBeInTheDocument();
	});

	describe('with ERC20 transfer transactions', () => {
		const gasUsed = 21_000n;
		const gasPrice = 1_000_000_000n;

		// Decoded: { to: '0x1234567890abcdef1234567890abcdef12345678', value: 10000000n }
		const mockTransferData = `${ERC20_TRANSFER_HASH}0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000000000000989680`;

		const mockTransferRecipient = '0x1234567890AbcdEF1234567890aBcdef12345678';

		// As listed among the native token transactions: no value, addressed to the ERC20 contract,
		// with the recipient decoded from the calldata by `mapEthTransactionUi`.
		const mockTransferTransactionUi = {
			...mockEthTransactionUi,
			type: 'send' as const,
			value: ZERO,
			to: USDC_TOKEN.address,
			transferRecipient: mockTransferRecipient,
			data: mockTransferData,
			gasUsed,
			gasPrice
		};

		it('should display the transferred amount instead of the native token value', () => {
			const { getByText } = render(EthTransactionModal, {
				transaction: mockTransferTransactionUi,
				token: ETHEREUM_TOKEN
			});

			const formattedAmount = `${formatToken({
				value: 10000000n,
				unitName: USDC_TOKEN.decimals,
				displayDecimals: USDC_TOKEN.decimals
			})} ${USDC_TOKEN.symbol}`;

			expect(getByText(formattedAmount)).toBeInTheDocument();
		});

		it('should still display the fee paid with the native token', () => {
			const { getByText } = render(EthTransactionModal, {
				transaction: mockTransferTransactionUi,
				token: ETHEREUM_TOKEN
			});

			const formattedFee = `${formatToken({
				value: gasUsed * gasPrice,
				unitName: ETHEREUM_TOKEN.decimals,
				displayDecimals: ETHEREUM_TOKEN.decimals
			})} ${ETHEREUM_TOKEN.symbol}`;

			expect(getByText(get(i18n).fee.text.fee)).toBeInTheDocument();
			expect(getByText(formattedFee)).toBeInTheDocument();
		});

		describe('with the token contract resolving to a name', () => {
			beforeEach(() => {
				vi.mocked(mapAddressToName).mockImplementation(({ address }) =>
					address === USDC_TOKEN.address ? USDC_TOKEN.name : undefined
				);
			});

			afterEach(() => {
				vi.mocked(mapAddressToName).mockReturnValue(undefined);
			});

			it('should not display the interacted with row for a resolved transfer', () => {
				const { queryByText } = render(EthTransactionModal, {
					transaction: mockTransferTransactionUi,
					token: ETHEREUM_TOKEN
				});

				expect(queryByText(get(i18n).transaction.text.interacted_with)).not.toBeInTheDocument();

				expect(queryByText(USDC_TOKEN.name)).not.toBeInTheDocument();
			});

			it('should display the interacted with row for a contract call that is not a transfer', () => {
				const { getByText } = render(EthTransactionModal, {
					transaction: {
						...mockTransferTransactionUi,
						transferRecipient: undefined,
						data: '0xabcdef'
					},
					token: ETHEREUM_TOKEN
				});

				expect(getByText(get(i18n).transaction.text.interacted_with)).toBeInTheDocument();

				expect(getByText(USDC_TOKEN.name)).toBeInTheDocument();
			});

			it('should display the interacted with row for an approve transaction', () => {
				const { getByText } = render(EthTransactionModal, {
					transaction: { ...mockApproveTransactionUi, to: USDC_TOKEN.address },
					token: ETHEREUM_TOKEN
				});

				expect(getByText(get(i18n).transaction.text.interacted_with)).toBeInTheDocument();
			});
		});

		it('should fall back to the contract call rendering when the calldata does not decode', () => {
			const { getByText, queryByText } = render(EthTransactionModal, {
				transaction: {
					...mockTransferTransactionUi,
					transferRecipient: undefined,
					data: `${ERC20_TRANSFER_HASH}00`
				},
				token: ETHEREUM_TOKEN
			});

			// The contract stays the counterparty rather than a recipient we could not read.
			expect(getByText(USDC_TOKEN.address)).toBeInTheDocument();

			expect(
				queryByText(
					`${formatToken({
						value: 10000000n,
						unitName: USDC_TOKEN.decimals,
						displayDecimals: USDC_TOKEN.decimals
					})} ${USDC_TOKEN.symbol}`
				)
			).not.toBeInTheDocument();
		});

		it('should display the native token value when the transaction is not addressed to a known token', () => {
			const { getAllByText } = render(EthTransactionModal, {
				transaction: {
					...mockTransferTransactionUi,
					to: mockEthAddress2,
					value: 123450000000000n
				},
				token: ETHEREUM_TOKEN
			});

			const formattedAmount = `${formatToken({
				value: 123450000000000n,
				unitName: ETHEREUM_TOKEN.decimals,
				displayDecimals: ETHEREUM_TOKEN.decimals
			})} ${ETHEREUM_TOKEN.symbol}`;

			expect(getAllByText(formattedAmount)[0]).toBeInTheDocument();
		});

		it('should display the recipient of the transfer instead of the token contract', () => {
			const { getByText, queryByText } = render(EthTransactionModal, {
				transaction: mockTransferTransactionUi,
				token: ETHEREUM_TOKEN
			});

			expect(getByText(mockTransferRecipient)).toBeInTheDocument();

			expect(queryByText(USDC_TOKEN.address)).not.toBeInTheDocument();
		});

		describe('with the transfer loaded for its own token', () => {
			// A router send: the calldata is not a plain `transfer`, so only the loaded transfer describes it.
			const mockRouterTransactionUi = {
				...mockTransferTransactionUi,
				to: mockEthAddress2,
				transferRecipient: undefined,
				data: '0xabcdef'
			};

			const mockErc20Transfer = {
				...mockEthTransactionUi,
				hash: mockRouterTransactionUi.hash,
				to: mockTransferRecipient,
				value: 20000000n
			};

			beforeEach(() => {
				ethTransactionsStore.set({
					tokenId: USDC_TOKEN.id,
					transactions: [{ data: mockErc20Transfer, certified: false }]
				});
			});

			afterEach(() => {
				ethTransactionsStore.reset(USDC_TOKEN.id);
			});

			it('should describe a non-fungible transfer by collection and token id', () => {
				// Only the NFT transfer may share the hash, or it would resolve to nothing.
				ethTransactionsStore.reset(USDC_TOKEN.id);

				ethTransactionsStore.set({
					tokenId: mockValidErc721Token.id,
					transactions: [
						{ data: { ...mockErc20Transfer, value: 1n, tokenId: 123 }, certified: false }
					]
				});

				const { getByText } = render(EthTransactionModal, {
					transaction: mockRouterTransactionUi,
					token: ETHEREUM_TOKEN
				});

				expect(getByText(`${getTokenDisplayName(mockValidErc721Token)} #123`)).toBeInTheDocument();

				ethTransactionsStore.reset(mockValidErc721Token.id);
			});

			it('should display amount and recipient of the loaded transfer', () => {
				const { getByText } = render(EthTransactionModal, {
					transaction: mockRouterTransactionUi,
					token: ETHEREUM_TOKEN
				});

				expect(
					getByText(
						`${formatToken({
							value: 20000000n,
							unitName: USDC_TOKEN.decimals,
							displayDecimals: USDC_TOKEN.decimals
						})} ${USDC_TOKEN.symbol}`
					)
				).toBeInTheDocument();

				expect(getByText(mockTransferRecipient)).toBeInTheDocument();
			});
		});
	});
});
