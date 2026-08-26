import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { balancesStore } from '$lib/stores/balances.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import SolWalletConnectSignReview from '$sol/components/wallet-connect/SolWalletConnectSignReview.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockAtaAddress, mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('SolWalletConnectSignReview', () => {
	const props = {
		amount: 1_000_000n,
		application: 'https://example.com',
		destination: mockSolAddress2,
		source: mockSolAddress,
		token: SOLANA_TOKEN,
		feeToken: SOLANA_TOKEN,
		onApprove: vi.fn(),
		onReject: vi.fn()
	};

	// What OISY would pay to prioritise the same transaction: 800_000 micro-lamports per compute
	// unit over a 1_400_000 unit budget.
	const networkEstimate = 1_120_000n;

	// At this rate the ten cent floor sits at 500_000 lamports, below the network estimate above.
	const solUsdPrice = 200;

	beforeEach(() => {
		balancesStore.reset(SOLANA_TOKEN.id);
		exchangeStore.reset();
	});

	it('should render the unreviewed instructions warning', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				unreviewed: true
			}
		});

		expect(getByText(en.wallet_connect.text.unreviewed_instructions)).toBeInTheDocument();
	});

	it('should render the unreviewed instructions warning above the application', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				unreviewed: true
			}
		});

		const warning = getByText(en.wallet_connect.text.unreviewed_instructions);
		const application = getByText(en.wallet_connect.text.application);

		expect(warning.compareDocumentPosition(application) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
	});

	it('should not render the unreviewed instructions warning by default', () => {
		const { queryByText } = render(SolWalletConnectSignReview, {
			props
		});

		expect(queryByText(en.wallet_connect.text.unreviewed_instructions)).not.toBeInTheDocument();
	});

	it('should render the base network fee as a labelled row', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
		expect(getByText('0.000005 SOL')).toBeInTheDocument();
	});

	it('should render the prioritization fee at the full precision of the token', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				prioritizationFee: 238_217n
			}
		});

		expect(getByText(en.fee.text.prioritization_fee)).toBeInTheDocument();
		// the ninth decimal must survive: rounding it away would alter the very number this review
		// exists to disclose
		expect(getByText('0.000238217 SOL')).toBeInTheDocument();
	});

	it('should render each fee row as a label above its value', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				prioritizationFee: 238_217n
			}
		});

		expect(getByText(en.fee.text.network_fee).tagName).toBe('LABEL');
		expect(getByText(en.fee.text.prioritization_fee).tagName).toBe('LABEL');
	});

	it('should show the fiat approximation next to a fee', () => {
		exchangeStore.set([{ solana: { usd: solUsdPrice } }]);

		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				prioritizationFee: 500_000_000n
			}
		});

		expect(getByText('~$100.00')).toBeInTheDocument();
	});

	it('should not render the prioritization fee when the transaction requests none', () => {
		const { queryByText } = render(SolWalletConnectSignReview, {
			props
		});

		expect(queryByText(en.fee.text.prioritization_fee)).not.toBeInTheDocument();
	});

	describe('comparing the requested fee against the baseline', () => {
		it('should say nothing about a fee in line with the network', () => {
			const { queryByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					prioritizationFee: 238_217n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			expect(queryByText(en.wallet_connect.text.dapp_prioritization_fee)).not.toBeInTheDocument();
			expect(queryByText(en.wallet_connect.text.high_prioritization_fee)).not.toBeInTheDocument();
		});

		it('should say nothing about a swap priced off the same congestion data', () => {
			// a routine aggregator swap tips around 0.0016 SOL, under twice the network estimate
			const { queryByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					prioritizationFee: 1_600_000n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			expect(queryByText(en.wallet_connect.text.dapp_prioritization_fee)).not.toBeInTheDocument();
			expect(queryByText(en.wallet_connect.text.high_prioritization_fee)).not.toBeInTheDocument();
		});

		it('should name the dApp as the author of a fee between two and five times the baseline', () => {
			const { getByText, queryByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					prioritizationFee: 3_000_000n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			expect(getByText(en.wallet_connect.text.dapp_prioritization_fee)).toBeInTheDocument();
			expect(queryByText(en.wallet_connect.text.high_prioritization_fee)).not.toBeInTheDocument();
		});

		it('should warn about a fee above five times the baseline', () => {
			const { getByText, queryByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					prioritizationFee: 5_600_000n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			expect(getByText(en.wallet_connect.text.high_prioritization_fee)).toBeInTheDocument();
			expect(queryByText(en.wallet_connect.text.dapp_prioritization_fee)).not.toBeInTheDocument();
		});

		it('should take the fiat floor as the baseline when it beats the network estimate', () => {
			exchangeStore.set([{ solana: { usd: solUsdPrice } }]);

			// against the 100_000 lamport estimate this fee would be twelve times over and warn;
			// against the 500_000 lamport floor it is between two and five times
			const { getByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					prioritizationFee: 1_200_000n,
					prioritizationFeeEstimate: 100_000n
				}
			});

			expect(getByText(en.wallet_connect.text.dapp_prioritization_fee)).toBeInTheDocument();
		});

		it('should take the network estimate as the baseline when it beats the fiat floor', () => {
			exchangeStore.set([{ solana: { usd: solUsdPrice } }]);

			// the same fee that the 500_000 lamport floor would flag passes unremarked once the
			// network itself is asking 1_120_000
			const { queryByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					prioritizationFee: 1_200_000n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			expect(queryByText(en.wallet_connect.text.dapp_prioritization_fee)).not.toBeInTheDocument();
			expect(queryByText(en.wallet_connect.text.high_prioritization_fee)).not.toBeInTheDocument();
		});

		it('should fall back to the fiat floor when the network estimate is unavailable', () => {
			exchangeStore.set([{ solana: { usd: solUsdPrice } }]);

			const { getByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					prioritizationFee: 5_000_000n
				}
			});

			expect(getByText(en.wallet_connect.text.high_prioritization_fee)).toBeInTheDocument();
		});

		it('should say nothing when neither the exchange rate nor the estimate is known', () => {
			const { queryByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					prioritizationFee: 1_000_000_001n
				}
			});

			expect(queryByText(en.wallet_connect.text.dapp_prioritization_fee)).not.toBeInTheDocument();
			expect(queryByText(en.wallet_connect.text.high_prioritization_fee)).not.toBeInTheDocument();
		});

		it('should surface and warn about a fee hidden behind a dust transfer', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					amount: 1n,
					prioritizationFee: 1_000_000_001n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			// 1 lamport moved, against a 1_000_000_001 lamport prioritization fee and the 5_000
			// lamport base fee
			expect(getByText('1.000000001 SOL')).toBeInTheDocument();
			expect(getByText('0.000005 SOL')).toBeInTheDocument();
			expect(getByText(en.wallet_connect.text.high_prioritization_fee)).toBeInTheDocument();
		});
	});

	describe('when the decode produced no amount', () => {
		const undecodedProps = { ...props, amount: undefined };

		it('should render neither the amount, the balance nor the destination', () => {
			const { queryByText } = render(SolWalletConnectSignReview, { props: undecodedProps });

			expect(queryByText(en.core.text.amount)).not.toBeInTheDocument();
			expect(queryByText(en.send.text.balance)).not.toBeInTheDocument();
			expect(queryByText(en.send.text.destination)).not.toBeInTheDocument();
		});

		it('should not claim that the amount could not be retrieved', () => {
			const { queryByText } = render(SolWalletConnectSignReview, { props: undecodedProps });

			expect(queryByText(en.send.error.unable_to_retrieve_amount)).not.toBeInTheDocument();
		});

		it('should still render everything that does not depend on the decode', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: { ...undecodedProps, data: 'AQID', prioritizationFee: 238_217n }
			});

			expect(getByText(en.wallet_connect.text.application)).toBeInTheDocument();
			expect(getByText(en.send.text.network)).toBeInTheDocument();
			expect(getByText(en.wallet_connect.text.signer)).toBeInTheDocument();
			expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
			expect(getByText(en.fee.text.prioritization_fee)).toBeInTheDocument();
			expect(getByText(en.wallet_connect.text.hex_data)).toBeInTheDocument();
		});

		it('should still render the simulated changes', () => {
			const { getByText, getByTestId } = render(SolWalletConnectSignReview, {
				props: {
					...undecodedProps,
					preview: { solDelta: -10_000_000n, tokenDeltas: [], controlChanges: [] }
				}
			});

			expect(getByText(en.wallet_connect.text.simulated_changes)).toBeInTheDocument();
			expect(getByTestId('simulated-sol-delta')).toHaveTextContent('-0.01 SOL');
			expect(getByText(en.wallet_connect.text.simulation_note)).toBeInTheDocument();
		});
	});

	// The two rows describe what will be signed, which the simulation only predicts.
	it('should render the amount and the balance of a decoded transfer', () => {
		balancesStore.set({ id: SOLANA_TOKEN.id, data: { data: 5_000_000_000n, certified: false } });

		const { getByText, container } = render(SolWalletConnectSignReview, { props });

		expect(getByText(en.core.text.amount)).toBeInTheDocument();
		expect(container.querySelector('#amount')).toHaveTextContent('0.001 SOL');

		expect(getByText(en.send.text.balance)).toBeInTheDocument();
		expect(container.querySelector('#balance')).toHaveTextContent('5 SOL');
	});

	// The delegate of an approval is not a recipient, so it keeps its own row even though the
	// review names no destination.
	it('should render the spender of an approval', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: { ...props, isApproval: true }
		});

		expect(getByText(en.wallet_connect.text.spender)).toBeInTheDocument();
		expect(getByText(mockSolAddress2)).toBeInTheDocument();
	});

	describe('transfer parties', () => {
		// Where the value ends up is described by the balance changes, so neither the lists nor the
		// single field the lists once replaced name a recipient.
		it('should render no destination at all', () => {
			const { queryByText, container } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					parties: {
						sources: [{ address: mockAtaAddress, own: true }],
						destinations: [{ address: mockSolAddress2, own: false }],
						partial: false
					}
				}
			});

			expect(queryByText(en.send.text.destination)).not.toBeInTheDocument();
			expect(container.querySelector('#destination')).toBeNull();
			expect(queryByText(en.wallet_connect.text.transfer_destinations)).not.toBeInTheDocument();
		});

		it('should render the sources of the transaction', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					parties: {
						sources: [{ address: mockAtaAddress, own: true }],
						destinations: [],
						partial: false
					}
				}
			});

			expect(getByText(en.wallet_connect.text.transfer_sources)).toBeInTheDocument();
			expect(getByText(mockAtaAddress)).toBeInTheDocument();
		});

		it('should render no destination either when the lists are empty', () => {
			const { getByText, queryByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					parties: { sources: [], destinations: [], partial: true }
				}
			});

			expect(queryByText(en.send.text.destination)).not.toBeInTheDocument();
			expect(getByText(en.wallet_connect.text.transfer_parties_partial)).toBeInTheDocument();
		});

		it('should render no lists at all until the decode settles', () => {
			const { queryByText } = render(SolWalletConnectSignReview, { props });

			expect(queryByText(en.wallet_connect.text.transfer_sources)).not.toBeInTheDocument();
			expect(queryByText(en.wallet_connect.text.transfer_parties_partial)).not.toBeInTheDocument();
		});
	});

	it('should render the network row with the same label-above-value shape as the other rows', () => {
		const { container } = render(SolWalletConnectSignReview, { props });

		const label = container.querySelector('label[for="network"]');
		const value = container.querySelector('#network');

		expect(label).toHaveTextContent(en.send.text.network);
		expect(value).toHaveTextContent(SOLANA_TOKEN.network.name);
	});

	it('should render the network logo within the network row', () => {
		const { container } = render(SolWalletConnectSignReview, { props });

		const logo = container.querySelector(
			`#network img[alt="${replacePlaceholders(en.core.alt.logo, {
				$name: SOLANA_TOKEN.network.name
			})}"]`
		);

		expect(logo).toBeInTheDocument();
	});
});
