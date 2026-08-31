import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { balancesStore } from '$lib/stores/balances.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import SolWalletConnectSignReview from '$sol/components/wallet-connect/SolWalletConnectSignReview.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockAtaAddress, mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { fireEvent, render } from '@testing-library/svelte';

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

	// The operations are a tab of their own, so what they contain is only in the DOM once it is
	// selected.
	const showOperations = async (queries: { getByText: (text: string) => HTMLElement }) => {
		await fireEvent.click(queries.getByText(en.wallet_connect.text.tab_operations));
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

	it('should not render the signer row', () => {
		const { queryByText, container } = render(SolWalletConnectSignReview, {
			props
		});

		expect(queryByText(en.wallet_connect.text.signer)).not.toBeInTheDocument();
		expect(container.querySelector('#signer')).toBeNull();
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

	// One heading, and the parts under it: three headings read as three unrelated costs.
	it('should gather the costs under a single fee heading', () => {
		const { getByText } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				prioritizationFee: 238_217n
			}
		});

		expect(getByText(en.fee.text.fee).tagName).toBe('LABEL');
		expect(getByText(en.fee.text.network_fee).tagName).not.toBe('LABEL');
		expect(getByText(en.fee.text.prioritization_fee).tagName).not.toBe('LABEL');
	});

	it('should charge the rent of the accounts the message opens as its own line', () => {
		const { getByTestId } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				instructions: [
					{ kind: 'createTokenAccount' as const, account: 'ata-one', rent: 2_039_280n },
					{ kind: 'createTokenAccount' as const, account: 'ata-two', rent: 2_039_280n }
				]
			}
		});

		expect(getByTestId('ata-fee')).toHaveTextContent('0.00407856');
	});

	// A message that opens one account and closes another charges the difference, and a refund
	// larger than the rent must not read as a negative fee.
	it('should net the rent against what the message closes', () => {
		const { getByTestId } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				instructions: [
					{ kind: 'createTokenAccount' as const, account: 'opened', rent: 2_039_280n },
					{ kind: 'closeTokenAccount' as const, account: 'closed', returned: 1_000_000n }
				]
			}
		});

		expect(getByTestId('ata-fee')).toHaveTextContent('0.00103928');
	});

	it('should charge nothing when the message closes more than it opens', () => {
		const { queryByTestId } = render(SolWalletConnectSignReview, {
			props: {
				...props,
				instructions: [
					{ kind: 'createTokenAccount' as const, account: 'opened', rent: 2_039_280n },
					{ kind: 'closeTokenAccount' as const, account: 'closed', returned: 9_000_000n }
				]
			}
		});

		expect(queryByTestId('ata-fee')).not.toBeInTheDocument();
	});

	it('should charge no rent when the message opens no account', () => {
		const { queryByTestId } = render(SolWalletConnectSignReview, {
			props: { ...props, instructions: [{ kind: 'send' as const, amount: 1n }] }
		});

		expect(queryByTestId('ata-fee')).not.toBeInTheDocument();
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

	// The message states almost nothing a routed swap does; the simulation is what knows.
	it('should list what the simulated run does', async () => {
		const queries = render(SolWalletConnectSignReview, {
			props: {
				...props,
				instructions: [
					{ kind: 'createTokenAccount' as const, account: mockAtaAddress, rent: 2_039_280n },
					{ kind: 'send' as const, amount: 1_000_000n, counterparty: mockSolAddress2 }
				]
			}
		});

		await showOperations(queries);

		expect(queries.getByTestId('sol-instructions-list')).toBeInTheDocument();
		expect(queries.getAllByTestId('sol-instruction')).toHaveLength(2);
	});

	// An unchecked transfer states no decimals, so without the simulated deltas the amount would
	// be printed in raw base units: a hundredth of a token would read as ten thousand.
	it('should scale an unlisted mint by the decimals the simulation reports', async () => {
		const tokenAddress = 'unlisted-mint';

		const queries = render(SolWalletConnectSignReview, {
			props: {
				...props,
				instructions: [
					{ kind: 'send' as const, amount: 10_000n, tokenAddress, counterparty: mockSolAddress2 }
				],
				preview: {
					tokenDeltas: [{ account: mockAtaAddress, tokenAddress, decimals: 6, delta: -10_000n }],
					controlChanges: []
				}
			}
		});

		await showOperations(queries);

		expect(queries.getByTestId('sol-instruction')).toHaveTextContent('0.01');
	});

	describe('the two tabs', () => {
		it('should open on the summary', () => {
			const { getByText, queryByText } = render(SolWalletConnectSignReview, {
				props: { ...props, data: 'AQID' }
			});

			expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
			expect(queryByText(en.wallet_connect.text.hex_data)).not.toBeInTheDocument();
		});

		// The warnings are about the request as a whole, so they belong to neither tab: hiding one
		// behind a tab the user never opens is how it goes unread.
		it('should keep the warnings above both tabs', async () => {
			const queries = render(SolWalletConnectSignReview, {
				props: { ...props, data: 'AQID', unreviewed: true }
			});

			expect(queries.getByText(en.wallet_connect.text.unreviewed_instructions)).toBeInTheDocument();

			await showOperations(queries);

			expect(queries.getByText(en.wallet_connect.text.unreviewed_instructions)).toBeInTheDocument();
		});
	});

	describe('the line that says what the message does', () => {
		const messageSummary = {
			kind: 'send' as const,
			spent: { delta: -1_000_000n },
			counterparty: mockSolAddress2
		};

		it('should state the message when the simulated run agrees with it', () => {
			const { getByTestId } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					messageSummary,
					preview: { solDelta: -1_005_000n, tokenDeltas: [], controlChanges: [] }
				}
			});

			expect(getByTestId('message-summary')).toHaveTextContent(en.send.text.send);
		});

		// A sentence the user would check the figures against, over a transaction that does
		// something else, is worse than no sentence at all.
		it('should say nothing when the run moves more than the message states', () => {
			const { queryByTestId } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					messageSummary,
					preview: {
						solDelta: -1_005_000n,
						tokenDeltas: [
							{
								account: mockAtaAddress,
								tokenAddress: 'unlisted-mint',
								decimals: 6,
								delta: -9_000_000n
							}
						],
						controlChanges: []
					}
				}
			});

			expect(queryByTestId('message-summary')).not.toBeInTheDocument();
		});

		// The simulation is best effort, and an unchecked reading is not worth stating.
		it('should say nothing when no simulation was obtained', () => {
			const { queryByTestId } = render(SolWalletConnectSignReview, {
				props: { ...props, messageSummary }
			});

			expect(queryByTestId('message-summary')).not.toBeInTheDocument();
		});
	});

	// A program is the closest thing a Solana message has to a recipient, and the one party the
	// user can look up before signing.
	describe('the programs the run goes through', () => {
		const ORCA = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';
		const JUPITER = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

		it('should list each program once, with its actions', () => {
			const { getAllByTestId } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					instructions: [
						{ kind: 'route' as const, program: ORCA },
						{ kind: 'route' as const, program: JUPITER },
						{ kind: 'route' as const, program: ORCA }
					]
				}
			});

			const venues = getAllByTestId('venue');

			expect(venues).toHaveLength(2);
			expect(venues[0]).toHaveTextContent(shortenWithMiddleEllipsis({ text: ORCA }));
			expect(venues[1]).toHaveTextContent(shortenWithMiddleEllipsis({ text: JUPITER }));
		});

		it('should show no group when the run named no program', () => {
			const { queryByTestId } = render(SolWalletConnectSignReview, { props });

			expect(queryByTestId('venue')).not.toBeInTheDocument();
		});
	});

	it('should show no instruction list when the simulation produced none', async () => {
		const queries = render(SolWalletConnectSignReview, { props });

		await showOperations(queries);

		expect(queries.queryByTestId('sol-instructions-list')).not.toBeInTheDocument();
	});

	describe('the warnings about what the transaction does', () => {
		it('should warn about a control change, above the fee notices', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					preview: {
						tokenDeltas: [],
						controlChanges: [
							{ account: mockSolAddress2, field: 'owner' as const, to: mockSolAddress }
						]
					},
					prioritizationFee: 5_600_000n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			const control = getByText(en.wallet_connect.text.simulation_control_change);
			const fee = getByText(en.wallet_connect.text.high_prioritization_fee);

			expect(control.compareDocumentPosition(fee) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING
			);
		});

		it('should not warn about a control change when nothing about control changed', () => {
			const { queryByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					preview: { solDelta: -5_000n, tokenDeltas: [], controlChanges: [] }
				}
			});

			expect(queryByText(en.wallet_connect.text.simulation_control_change)).not.toBeInTheDocument();
		});

		it('should say that the parties are partial, above the fee notices', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					parties: { sources: [], destinations: [], partial: true },
					prioritizationFee: 5_600_000n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			const partial = getByText(en.wallet_connect.text.transfer_parties_partial);
			const fee = getByText(en.wallet_connect.text.high_prioritization_fee);

			expect(partial.compareDocumentPosition(fee) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING
			);
		});

		it('should say nothing about partial parties when the lists are complete', () => {
			const { queryByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					parties: { sources: [], destinations: [], partial: false }
				}
			});

			expect(queryByText(en.wallet_connect.text.transfer_parties_partial)).not.toBeInTheDocument();
		});
	});

	describe('the placement of the fees', () => {
		it('should render the fees below the simulated changes', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					preview: { solDelta: -5_000n, tokenDeltas: [], controlChanges: [] }
				}
			});

			const changes = getByText(en.wallet_connect.text.simulated_changes);
			const fee = getByText(en.fee.text.network_fee);

			expect(changes.compareDocumentPosition(fee) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING
			);
		});

		// What it costs belongs with what it does; the raw message is material to check it against.
		it('should render the fees with the summary and the hex data with the operations', async () => {
			const queries = render(SolWalletConnectSignReview, {
				props: { ...props, data: 'AQID', prioritizationFee: 238_217n }
			});

			expect(queries.getByText(en.fee.text.prioritization_fee)).toBeInTheDocument();
			expect(queries.queryByText(en.wallet_connect.text.hex_data)).not.toBeInTheDocument();

			await showOperations(queries);

			expect(queries.getByText(en.wallet_connect.text.hex_data)).toBeInTheDocument();
			expect(queries.queryByText(en.fee.text.prioritization_fee)).not.toBeInTheDocument();
		});
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

		it('should render the notice above the transaction data', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					prioritizationFee: 3_000_000n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			const notice = getByText(en.wallet_connect.text.dapp_prioritization_fee);
			const application = getByText(en.wallet_connect.text.application);

			expect(notice.compareDocumentPosition(application) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING
			);
		});

		it('should render the warning below the unreviewed instructions warning', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: {
					...props,
					unreviewed: true,
					prioritizationFee: 5_600_000n,
					prioritizationFeeEstimate: networkEstimate
				}
			});

			const unreviewed = getByText(en.wallet_connect.text.unreviewed_instructions);
			const warning = getByText(en.wallet_connect.text.high_prioritization_fee);

			expect(unreviewed.compareDocumentPosition(warning) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING
			);
		});
	});

	describe('the notice about how the review was obtained', () => {
		const preview = { solDelta: -5_000n, tokenDeltas: [], controlChanges: [] };

		it('should state that the review is simulated once a simulation ran', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: { ...props, preview }
			});

			expect(getByText(en.wallet_connect.text.simulated_review)).toBeInTheDocument();
		});

		// Two notices about the same thing are one too many: an undecodable message already says
		// the review comes from a simulation, in stronger terms.
		it('should not repeat itself when the instructions could not be decoded', () => {
			const { getByText, queryByText } = render(SolWalletConnectSignReview, {
				props: { ...props, unreviewed: true, preview }
			});

			expect(
				getByText(en.wallet_connect.text.unreviewed_instructions_simulated)
			).toBeInTheDocument();
			expect(queryByText(en.wallet_connect.text.simulated_review)).not.toBeInTheDocument();
		});

		// A simulation is best effort and can come back with nothing; the warning must not claim
		// one ran when none did.
		it('should not claim a simulation when none was obtained', () => {
			const { getByText, queryByText } = render(SolWalletConnectSignReview, {
				props: { ...props, unreviewed: true }
			});

			expect(getByText(en.wallet_connect.text.unreviewed_instructions)).toBeInTheDocument();
			expect(
				queryByText(en.wallet_connect.text.unreviewed_instructions_simulated)
			).not.toBeInTheDocument();
		});

		it('should say nothing when no simulation was obtained', () => {
			const { queryByText } = render(SolWalletConnectSignReview, { props });

			expect(queryByText(en.wallet_connect.text.simulated_review)).not.toBeInTheDocument();
		});

		it('should render the note above the transaction data', () => {
			const { getByText } = render(SolWalletConnectSignReview, {
				props: { ...props, preview }
			});

			const note = getByText(en.wallet_connect.text.simulated_review);
			const application = getByText(en.wallet_connect.text.application);

			expect(note.compareDocumentPosition(application) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING
			);
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

		it('should still render everything that does not depend on the decode', async () => {
			const queries = render(SolWalletConnectSignReview, {
				props: { ...undecodedProps, data: 'AQID', prioritizationFee: 238_217n }
			});

			expect(queries.getByText(en.wallet_connect.text.application)).toBeInTheDocument();
			expect(queries.getByText(en.send.text.network)).toBeInTheDocument();
			expect(queries.getByText(en.fee.text.network_fee)).toBeInTheDocument();
			expect(queries.getByText(en.fee.text.prioritization_fee)).toBeInTheDocument();

			await showOperations(queries);

			expect(queries.getByText(en.wallet_connect.text.hex_data)).toBeInTheDocument();
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
			expect(getByText(en.wallet_connect.text.simulated_review)).toBeInTheDocument();
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
			expect(container.querySelector('#transfer-destinations')).toBeNull();
			expect(queryByText(mockSolAddress2)).not.toBeInTheDocument();
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
