import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import {
	createMockEthTransactionsUi,
	createMockNftTransactionsUi
} from '$tests/mocks/eth-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

const [mockEthTransactionUi] = createMockEthTransactionsUi(1);
const [mockErc721TransactionUi] = createMockNftTransactionsUi(1);

describe('EthTransactionModal', () => {
	it('should render the ETH transaction modal', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(getByText('send')).toBeInTheDocument();
	});

	it('should display correct amount and currency for fungible token', () => {
		const { getAllByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		const formattedAmount = `${formatToken({
			value: mockEthTransactionUi.value ?? 0n,
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
			value: mockErc721TransactionUi.value ?? 0n,
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

		expect(getByText(mockEthTransactionUi.to as string)).toBeInTheDocument();
	});

	it('should display tx block number', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(getByText(mockEthTransactionUi.blockNumber as number)).toBeInTheDocument();
	});

	it('should display tx hash', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockEthTransactionUi.hash as string }))
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
});
