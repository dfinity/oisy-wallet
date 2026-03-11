import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
import { ERC20_DEPOSIT_HASH } from '$eth/constants/erc20.constants';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import {
	createMockEthTransactionsUi,
	createMockNftTransactionsUi
} from '$tests/mocks/eth-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$eth/providers/alchemy.providers', () => ({
	initMinedTransactionsListener: () => ({
		disconnect: async () => {}
	})
}));

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

	it('should not display fee for ERC20 deposit transaction', () => {
		const mockDepositData = `${ERC20_DEPOSIT_HASH}000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000`;

		const { queryByText } = render(EthTransactionModal, {
			transaction: {
				...mockEthTransactionUi,
				type: 'deposit' as const,
				data: mockDepositData,
				gasUsed: 21_000n,
				gasPrice: 1_000_000_000n
			},
			token: ETHEREUM_TOKEN
		});

		expect(queryByText(get(i18n).fee.text.fee)).not.toBeInTheDocument();
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
});
