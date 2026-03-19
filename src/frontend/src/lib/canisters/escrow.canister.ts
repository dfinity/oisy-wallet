import type {
	AcceptDealArgs,
	Account,
	ClaimableDealView,
	CreateDealArgs,
	DealView,
	EscrowError,
	_SERVICE as EscrowService,
	FundDealArgs
} from '$declarations/escrow/escrow.did';
import { idlFactory as idlCertifiedFactoryEscrow } from '$declarations/escrow/escrow.factory.certified.did';
import { idlFactory as idlFactoryEscrow } from '$declarations/escrow/escrow.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, toNullable } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

const mapEscrowError = (err: EscrowError): Error => {
	const [key] = Object.keys(err);
	const [value] = Object.values(err);

	if (value === null) {
		return new Error(`Escrow error: ${key}`);
	}
	if (typeof value === 'string') {
		return new Error(`Escrow error: ${key} — ${value}`);
	}
	return new Error(`Escrow error: ${key} — ${JSON.stringify(value)}`);
};

export class EscrowCanister extends Canister<EscrowService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<EscrowService>): Promise<EscrowCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<EscrowService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryEscrow,
			certifiedIdlFactory: idlCertifiedFactoryEscrow
		});

		return new EscrowCanister(canisterId, service, certifiedService);
	}

	createDeal = async ({
		amount,
		tokenLedger,
		expiresAtNs,
		title,
		note
	}: {
		amount: bigint;
		tokenLedger: Principal;
		expiresAtNs: bigint;
		title?: string;
		note?: string;
	}): Promise<DealView> => {
		const { create_deal } = this.caller({ certified: true });

		const args: CreateDealArgs = {
			amount,
			token_ledger: tokenLedger,
			expires_at_ns: expiresAtNs,
			title: toNullable(title),
			note: toNullable(note),
			recipient: toNullable<Principal>(),
			payer: toNullable<Principal>()
		};

		const result = await create_deal(args);

		if ('Ok' in result) {
			return result.Ok;
		}
		throw mapEscrowError(result.Err);
	};

	fundDeal = async ({ dealId }: { dealId: bigint }): Promise<DealView> => {
		const { fund_deal } = this.caller({ certified: true });

		const args: FundDealArgs = { deal_id: dealId };
		const result = await fund_deal(args);

		if ('Ok' in result) {
			return result.Ok;
		}
		throw mapEscrowError(result.Err);
	};

	acceptDeal = async ({
		dealId,
		claimCode
	}: {
		dealId: bigint;
		claimCode?: string;
	}): Promise<DealView> => {
		const { accept_deal } = this.caller({ certified: true });

		const args: AcceptDealArgs = {
			deal_id: dealId,
			claim_code: toNullable(claimCode)
		};
		const result = await accept_deal(args);

		if ('Ok' in result) {
			return result.Ok;
		}
		throw mapEscrowError(result.Err);
	};

	getClaimableDeal = async ({ dealId }: { dealId: bigint }): Promise<ClaimableDealView> => {
		const { get_claimable_deal } = this.caller({ certified: false });

		const result = await get_claimable_deal(dealId);

		if ('Ok' in result) {
			return result.Ok;
		}
		throw mapEscrowError(result.Err);
	};

	getDeal = async ({ dealId }: { dealId: bigint }): Promise<DealView> => {
		const { get_deal } = this.caller({ certified: true });

		const result = await get_deal(dealId);

		if ('Ok' in result) {
			return result.Ok;
		}
		throw mapEscrowError(result.Err);
	};

	getEscrowAccount = async ({ dealId }: { dealId: bigint }): Promise<Account> => {
		const { get_escrow_account } = this.caller({ certified: false });

		const result = await get_escrow_account(dealId);

		if ('Ok' in result) {
			return result.Ok;
		}
		throw mapEscrowError(result.Err);
	};

	cancelDeal = async ({ dealId }: { dealId: bigint }): Promise<DealView> => {
		const { cancel_deal } = this.caller({ certified: true });

		const result = await cancel_deal({ deal_id: dealId });

		if ('Ok' in result) {
			return result.Ok;
		}
		throw mapEscrowError(result.Err);
	};
}
