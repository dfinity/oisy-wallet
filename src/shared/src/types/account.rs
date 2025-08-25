//! Account identifiers.
//!
//! An account identifier applies to a token standard.  For example, currently on the Internet
//! Computer, the token standard ICRC-1 specifies how to communicate with a token ledger and what
//! account identifiiers look like.  The same standard applies to native ICP, SNS tokens, and more.
//!
//! Similarly, EVM tokens use EVM addresses as account identifiers.  This applies to native ETH but
//! also to all ERC20 tokens.

use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

use super::token_id::TokenId;
use crate::types::network::marker_trait::{
    BitcoinMainnet, BitcoinRegtest, BitcoinTestnet, EthereumMainnet, EthereumSepolia,
    InternetComputer, Network, SolanaDevnet, SolanaLocal, SolanaMainnet,
};

pub mod conversion;

/// A marker trait, used to indicate that a type is an account identifier for a given network.
pub trait AccountId<T>
where
    T: Network,
{
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum TokenAccountId {
    Icrcv2(Icrcv2AccountId),
    Sol(SolPrincipal),
    Btc(BtcAddress),
    Eth(EthAddress),
}

/// An account identifier for Internet Computer tokens.
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum Icrcv2AccountId {
    /// An account identifier that declares the owner's principal.
    ///
    /// Note: Given a transaction, it is NOT typically possible to determine the owner
    /// principal & subaccount ID.  A such, this type is primarily used for internal management
    /// of accounts within a wallet.  It is not normally available for transactions with third
    /// parties.
    WithPrincipal {
        owner: Principal,
        subaccount: Option<IcrcSubaccountId>,
    },
    /// This is a redacted identifier typically available from transaction records.
    Account(IcrcSubaccountId),
}
impl AccountId<InternetComputer> for Icrcv2AccountId {}

/// An ICRC ledger account key.  Technically (and confusingly) called a subaccount ID.
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct IcrcSubaccountId(pub [u8; 32]);

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct SolPrincipal(pub String);
impl AccountId<SolanaMainnet> for SolPrincipal {}
impl AccountId<SolanaDevnet> for SolPrincipal {}
impl AccountId<SolanaLocal> for SolPrincipal {}
impl TokenId<SolanaMainnet> for SolPrincipal {}
impl TokenId<SolanaDevnet> for SolPrincipal {}
impl TokenId<SolanaLocal> for SolPrincipal {}

/// A bitcoin address
///
/// # Reference
/// - <https://en.bitcoin.it/wiki/Address>
/// - <https://www.unchained.com/blog/bitcoin-address-types-compared>
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum BtcAddress {
    /// Legacy format.
    ///
    /// This is the widely used original format encoded using Base58, which
    /// excludes characters that are frequently confused with one another.
    /// Addresses starting with “1” use the Pay-to-Public-Key-Hash (P2PKH)
    /// script type and are case-sensitive. In the context of P2PKH, “Pay-to”
    /// refers to the recipient’s ability to claim the funds, “Public-Key”
    /// refers to the recipient’s public cryptographic key, and “Hash” refers to
    /// a cryptographic hash of the public key.
    ///
    /// They offer a straightforward way to send and receive Bitcoin since they
    /// are generated from the hash of the recipient’s public key. Legacy
    /// addresses are widely compatible because the majority of wallets and
    /// exchanges support them.
    ///
    /// ## Format
    /// A string, 27-34 alphanumeric characters in length, starting with the
    /// digit "1".
    ///
    /// The string is a base58 encoded [u8;25] where the first byte is 0x00 and
    /// the last 4 bytes are a checksum.
    ///
    /// ## Example
    /// - `1RainRzqJtJxHTngafpCejDLfYq2y4KBc`
    ///
    /// ## Reference
    /// <https://en.bitcoin.it/wiki/Technical_background_of_version_1_Bitcoin_addresses>
    P2PKH(String),
    /// Pay-to-Script-Hash (P2SH)
    ///
    /// ## Format
    /// P2SH addresses are exactly 34 characters in length, and they begin with
    /// a prefix of 3, as specified by BIP 13.
    ///
    /// ## Example
    /// - `342ftSRCvFHfCeFFBuz4xwbeqnDw6BGUey`
    ///
    /// ## Reference
    /// - <https://en.bitcoin.it/wiki/BIP_0013>
    P2SH(String),
    /// Pay-to-Witness-Public-Key-Hash (P2WPKH)
    ///
    /// ## Format
    /// Pay-to-Witness-Public-Key-Hash (P2WPKH) is the first of two address
    /// types introduced to bitcoin upon the Segwit Soft Fork in August 2017.
    /// The story behind this extremely important and particularly contentious
    /// soft fork is documented in a book called The Blocksize War, written by
    /// Jonathan Bier.
    ///
    /// P2WPKH is the segwit variant of P2PKH, which at a basic level, means
    /// that choosing this address type rather than older P2PKH addresses will
    /// help you save money on transaction fees when moving your bitcoin around.
    ///
    /// Segwit addresses look quite different from the older address types
    /// because, per BIP 173, they use Bech32 encoding instead of Base58. Most
    /// notably, there are no capital letters in Bech32. P2WPKH addresses can be
    /// identified by a prefix of bc1q and a character length of exactly 42.
    ///
    /// ## Example
    /// - `bc1q34aq5drpuwy3wgl9lhup9892qp6svr8ldzyy7c`
    ///
    /// ## Reference
    /// - <https://en.bitcoin.it/wiki/BIP_0173>
    /// - <https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki>
    P2WPKH(String),
    /// Pay-to-Witness-Script-Hash (P2WSH)
    ///
    /// Pay-to-Witness-Script-Hash (P2WSH) is the segwit variant of P2SH. The main advantage to
    /// using P2WSH over P2SH is that it can help lower transaction fees, and the primary reason to
    /// use a script hash instead of a public key hash is to accommodate multisig arrangements.
    ///
    /// ## Format
    /// P2WSH addresses are exactly 62 characters in length, starting with `bc1q`.
    ///
    /// ## Example
    /// - `bc1qeklep85ntjz4605drds6aww9u0qr46qzrv5xswd35uhjuj8ahfcqgf6hak`
    ///
    /// ## Reference
    /// - <https://en.bitcoin.it/wiki/BIP_0173>
    P2WSH(String),

    /// Pay-to-Taproot (P2TR)
    ///
    /// Pay-to-Taproot (P2TR) is the newest address type, made available by the Taproot soft-fork
    /// in November 2021. P2TR adoption remains quite low at the time of writing, and many bitcoin
    /// softwares and services are still working on integration.
    ///
    /// While P2WPKH and P2WSH are known as Segwit V0, P2TR is considered Segwit V1. Notably, P2TR
    /// utilizes a digital signature algorithm called Schnorr, which differs from the ECDSA format
    /// used in earlier bitcoin transaction types. Schnorr signatures have several advantages,
    /// including additional transaction fee reductions and increased privacy.
    ///
    /// Regarding privacy, the key and signature aggregations made possible by Schnorr allow
    /// multisig addresses to be indistinguishable from singlesig, and the full spending conditions
    /// for a P2TR address are not necessarily revealed publicly. The creator of the address can
    /// even include multiple customized redeem scripts to choose from in order to spend the
    /// bitcoin later.
    ///
    /// ## Format
    /// P2TR addresses are 62 characters long, and they use Bech32m encoding, a slightly modified
    /// version of Bech32, as described in BIP 350. P2TR addresses can be identified by their
    /// unique bc1p prefix.
    ///
    /// ## Example
    /// - `bc1pxwww0ct9ue7e8tdnlmug5m2tamfn7q06sahstg39ys4c9f3340qqxrdu9k`
    P2TR(String),
}
impl AccountId<BitcoinMainnet> for BtcAddress {}
impl AccountId<BitcoinTestnet> for BtcAddress {}
impl AccountId<BitcoinRegtest> for BtcAddress {}
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum EthAddress {
    /// A public Ethereum address.
    ///
    /// # Format
    /// A string, 42 characters long, starting with "0x" followed by
    /// hex.  The address is case-insensitive.
    ///
    /// # Example
    /// - `0x1D1479C185d32EB90533a08b36B3CFa5F84A0E6B`
    Public(String),
}
impl AccountId<EthereumMainnet> for EthAddress {}
impl AccountId<EthereumSepolia> for EthAddress {}
impl TokenId<EthereumMainnet> for EthAddress {}
impl TokenId<EthereumSepolia> for EthAddress {}
