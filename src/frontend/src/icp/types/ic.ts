import { CanisterIdTextSchema } from '$lib/types/canister';
import { CoingeckoCoinsIdSchema } from '$lib/types/coingecko';
import { TokenSchema } from '$lib/types/token';
import type { TransactionType } from '$lib/types/transaction';
import type { Option } from '$lib/types/utils';
import { UrlSchema } from '$lib/validation/url.validation';
import type { Transaction, TransactionWithId } from '@dfinity/ledger-icp';
import type {
	IcrcTransaction as IcrcTransactionCandid,
	IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { z } from 'zod';

export interface IcTransactionAddOnsInfo {
	transferToSelf?: 'send' | 'receive';
}

export type IcpTransaction = { transaction: Transaction & IcTransactionAddOnsInfo } & Pick<
	TransactionWithId,
	'id'
>;
export type IcrcTransaction = {
	transaction: IcrcTransactionCandid & IcTransactionAddOnsInfo;
} & Pick<IcrcTransactionWithId, 'id'>;

export type IcTransaction = IcpTransaction | IcrcTransaction;

export type IcTransactionType = TransactionType | 'approve' | 'burn' | 'mint';

export type IcTransactionIdText = string;

export type IcTransactionStatus = 'executed' | 'pending' | 'reimbursed' | 'failed';

export interface IcTransactionUi {
	id: bigint | string;
	type: IcTransactionType;
	// e.g. BTC Received
	typeLabel?: string;
	from?: string;
	// e.g. From: BTC Network
	fromLabel?: string;
	fromExplorerUrl?: string;
	to?: string;
	// e.g. To: BTC Network
	toLabel?: string;
	toExplorerUrl?: string;
	incoming?: boolean;
	value?: bigint;
	timestamp?: bigint;
	status: IcTransactionStatus;
	txExplorerUrl?: string;
}

const IcFeeSchema = z.object({
	fee: z.bigint()
});

export type IcFee = z.infer<typeof IcFeeSchema>;

const IcAppMetadataSchema = z.object({
	exchangeCoinId: CoingeckoCoinsIdSchema.optional(),
	position: z.number(),
	explorerUrl: UrlSchema.optional()
});

export type IcAppMetadata = z.infer<typeof IcAppMetadataSchema>;

const IcCanistersSchema = z.object({
	ledgerCanisterId: CanisterIdTextSchema,
	indexCanisterId: CanisterIdTextSchema
});

export type IcCanisters = z.infer<typeof IcCanistersSchema>;

const IcCkLinkedAssetsSchema = z.object({
	twinToken: TokenSchema,
	feeLedgerCanisterId: CanisterIdTextSchema.optional()
});

export type IcCkLinkedAssets = z.infer<typeof IcCkLinkedAssetsSchema>;

const IcCkMetadataSchema = IcCkLinkedAssetsSchema.partial().extend({
	minterCanisterId: CanisterIdTextSchema
});

export type IcCkMetadata = z.infer<typeof IcCkMetadataSchema>;

const IcInterfaceSchema = IcCanistersSchema.merge(IcAppMetadataSchema);
export type IcInterface = z.infer<typeof IcInterfaceSchema>;

const IcTokenSchema = TokenSchema.merge(IcFeeSchema).merge(IcInterfaceSchema);
export type IcToken = z.infer<typeof IcTokenSchema>;

const IcTokenWithoutIdSchema = IcTokenSchema.omit({ id: true });
export type IcTokenWithoutId = z.infer<typeof IcTokenWithoutIdSchema>;

const IcCkTokenSchema = IcTokenSchema.merge(IcCkMetadataSchema.partial());
export type IcCkToken = z.infer<typeof IcCkTokenSchema>;

const IcCkInterfaceSchema = IcInterfaceSchema.merge(IcCkMetadataSchema);
export type IcCkInterface = z.infer<typeof IcCkInterfaceSchema>;

export type OptionIcToken = Option<IcToken>;
export type OptionIcCkToken = Option<IcCkToken>;
