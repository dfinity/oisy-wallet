import {render} from "@testing-library/svelte";
import HiddenTransactionsModal from '$lib/components/transactions/HiddenTransactionsModal.svelte';
import {get} from "svelte/store";
import {i18n} from "$lib/stores/i18n.store";
import {HIDDEN_TRANSACTIONS_INFO_BOX} from "$lib/constants/test-ids.constants";
import {btcTransactionsStore} from "$btc/stores/btc-transactions.store";
import {BTC_MAINNET_TOKEN_ID} from "$env/tokens/tokens.btc.env";
import {ethTransactionsStore} from "$eth/stores/eth-transactions.store";
import {ETHEREUM_TOKEN_ID} from "$env/tokens/tokens.eth.env";
import {icTransactionsStore} from "$icp/stores/ic-transactions.store";
import {ICP_TOKEN_ID} from "$env/tokens/tokens.icp.env";
import {solTransactionsStore} from "$sol/stores/sol-transactions.store";
import {SOLANA_TOKEN_ID} from "$env/tokens/tokens.sol.env";
import {replaceOisyPlaceholders} from "$lib/utils/i18n.utils";
import {createMockBtcTransactionsUi} from "$tests/mocks/btc-transactions.mock";
import {createMockEthTransactions} from "$tests/mocks/eth-transactions.mock";
import {createMockIcTransactionsUi} from "$tests/mocks/ic-transactions.mock";
import {exchangeStore} from "$lib/stores/exchange.store";
import {nonNullish} from "@dfinity/utils";

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
    const provider = vi.fn();
    return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('HiddenTransactionsModal', () => {
    const messageBoxSelector = `div[data-tid="${HIDDEN_TRANSACTIONS_INFO_BOX}"]`;

    it('should render the modal content', () => {
        const { container, getByText } = render(HiddenTransactionsModal);

        expect(getByText(get(i18n).transactions.text.hidden_transactions_title)).toBeInTheDocument();

        const messageBox: HTMLDivElement | null = container.querySelector(messageBoxSelector);
        expect(messageBox).toBeInTheDocument();
    });

    describe('when the transactions list is empty', () => {
        beforeEach(() => {
            btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);
            ethTransactionsStore.nullify(ETHEREUM_TOKEN_ID);
            icTransactionsStore.reset(ICP_TOKEN_ID);
            solTransactionsStore.reset(SOLANA_TOKEN_ID);
        });

        it('should render the placeholder',  () => {
            const { getByText } = render(HiddenTransactionsModal);

            expect(getByText(get(i18n).transactions.text.hidden_transaction_history)).toBeInTheDocument();
            expect(getByText(replaceOisyPlaceholders(get(i18n).transactions.text.hidden_receive))).toBeInTheDocument();
        });
    });

    describe('when the transactions list is not empty', () => {
        const btcTransactionsNumber = 5;
        const ethTransactionsNumber = 3;
        const icTransactionsNumber = 7;

        const todayTimestamp = new Date().getTime();
        const yesterdayTimestamp = todayTimestamp - 24 * 60 * 60 * 1000;

        beforeEach(() => {
            btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);
            ethTransactionsStore.nullify(ETHEREUM_TOKEN_ID);
            icTransactionsStore.reset(ICP_TOKEN_ID);
            solTransactionsStore.reset(SOLANA_TOKEN_ID);
            exchangeStore.reset();

            exchangeStore.set([{ bitcoin: { usd: 1 } }]);
            exchangeStore.set([{ ethereum: { usd: 200 } }]);

            btcTransactionsStore.append({
                tokenId: BTC_MAINNET_TOKEN_ID,
                transactions: createMockBtcTransactionsUi(btcTransactionsNumber).map((transaction) => ({
                    data: { ...transaction, timestamp: BigInt(todayTimestamp) },
                    certified: false
                }))
            });

            ethTransactionsStore.add({
                tokenId: ETHEREUM_TOKEN_ID,
                transactions: createMockEthTransactions(ethTransactionsNumber).map((transaction) => ({
                    ...transaction,
                    timestamp: yesterdayTimestamp
                }))
            });

            icTransactionsStore.append({
                tokenId: ICP_TOKEN_ID,
                transactions: createMockIcTransactionsUi(icTransactionsNumber).map((transaction) => ({
                    data: { ...transaction, timestamp: BigInt(yesterdayTimestamp) },
                    certified: false
                }))
            });

            solTransactionsStore.reset(SOLANA_TOKEN_ID);
        });

        it('should render the transactions list for hidden transactions with group of dates', () => {
            const { getByText, getByTestId } = render(HiddenTransactionsModal);

            const todayDateGroup = getByTestId('all-transactions-date-group-0');
            expect(todayDateGroup).toBeInTheDocument();
            expect(getByText('today')).toBeInTheDocument();

            const yesterdayDateGroup = getByTestId('all-transactions-date-group-1');
            expect(yesterdayDateGroup).toBeInTheDocument();
            expect(getByText('yesterday')).toBeInTheDocument();
        });

        it('should render the transactions list with all the receive micro transactions', () => {
            const { container } = render(HiddenTransactionsModal);

            const transactionGroupComponents = Array.from(container.querySelectorAll('div[data-tid*="all-transactions-date-group"]'));
            const transactionComponents = Array.from(container.querySelectorAll('div')).filter((el) =>
                nonNullish(el.parentElement) && transactionGroupComponents.includes(el.parentElement)
            );

            expect(transactionComponents).toHaveLength(
                btcTransactionsNumber + ethTransactionsNumber
            );
        });
    });
});