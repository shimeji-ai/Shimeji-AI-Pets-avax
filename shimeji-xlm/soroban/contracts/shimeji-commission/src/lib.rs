#![no_std]
//!
//! ShimejiCommission — buyer-posted commissions with on-chain escrow.
//!
//! Flow:
//!   1. Buyer calls `create_commission` with intention + optional reference image + price.
//!      Payment is transferred to the contract (escrow).
//!   2. An admin (or the artist after off-chain agreement) calls `assign_artist` to
//!      record which artist accepted the commission and stores the egg NFT token ID
//!      that was minted to the buyer via the NFT contract.
//!   3. When the art is ready the artist calls `update_token_uri_as_creator` directly
//!      on the NFT contract to update the egg metadata.
//!   4. Artist calls `mark_delivered` on this contract to flag it as ready for review.
//!   5. Buyer calls `approve_delivery` to release escrowed payment to the artist.
//!      Alternatively, the buyer calls `cancel_commission` while still Open to get a refund.
//!   6. Admin can force-cancel an Accepted commission and refund the buyer (dispute resolution).

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String};

// ── Commission status ─────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum CommissionStatus {
    /// Buyer posted the commission request; waiting for artist assignment.
    Open,
    /// Artist has been assigned; payment still in escrow; art in progress.
    Accepted,
    /// Artist marked the work as delivered; awaiting buyer approval.
    Delivered,
    /// Buyer approved; payment released to artist. Terminal state.
    Completed,
    /// Commission was cancelled; payment returned to buyer. Terminal state.
    Cancelled,
}

// ── Currency ─────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Currency {
    Xlm,
    Usdc,
}

// ── Commission request ────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct CommissionRequest {
    /// The buyer who posted the commission
    pub buyer: Address,
    /// Public description of what the buyer wants (max ~500 chars)
    pub intention: String,
    /// Optional IPFS URI of a reference image (empty string = none)
    pub reference_image: String,
    /// Price in XLM stroops
    pub price_xlm: i128,
    /// Price in USDC stroops
    pub price_usdc: i128,
    /// XLM/USDC rate with 7 decimal places (for display conversion)
    pub xlm_usdc_rate: i128,
    /// Which currency the buyer paid in
    pub currency: Currency,
    /// Current lifecycle status
    pub status: CommissionStatus,
    /// The egg NFT token ID (0 until assigned)
    pub token_id: u64,
    /// The artist assigned to this commission (zero address until assigned)
    pub artist: Address,
    /// Ledger timestamp when the commission was created
    pub created_at: u64,
}

// ── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    UsdcToken,
    XlmToken,
    NextCommissionId,
    Commission(u64),
}

const ZERO_ADDR: &str = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const MAX_INTENTION_LEN: u32 = 500;
const MAX_REF_IMAGE_LEN: u32 = 512;

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct ShimejiCommission;

#[contractimpl]
impl ShimejiCommission {
    // ── Initialization ────────────────────────────────────────────────────────

    pub fn initialize(
        env: Env,
        admin: Address,
        usdc_token: Address,
        xlm_token: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage().instance().set(&DataKey::NextCommissionId, &0u64);
    }

    // ── Buyer: post a commission request ──────────────────────────────────────

    /// Buyer posts a commission. Payment is escrowed in this contract until
    /// the commission is completed or cancelled. The `reference_image` field
    /// can be an IPFS URI or an empty string if no reference is provided.
    pub fn create_commission(
        env: Env,
        buyer: Address,
        intention: String,
        reference_image: String,
        price_xlm: i128,
        price_usdc: i128,
        xlm_usdc_rate: i128,
        currency: Currency,
    ) -> u64 {
        buyer.require_auth();

        if intention.is_empty() {
            panic!("intention cannot be empty");
        }
        if intention.len() > MAX_INTENTION_LEN {
            panic!("intention too long");
        }
        if reference_image.len() > MAX_REF_IMAGE_LEN {
            panic!("reference_image url too long");
        }
        if price_xlm <= 0 {
            panic!("price_xlm must be positive");
        }
        if price_usdc <= 0 {
            panic!("price_usdc must be positive");
        }
        if xlm_usdc_rate <= 0 {
            panic!("xlm_usdc_rate must be positive");
        }

        // Escrow buyer payment upfront
        match currency {
            Currency::Xlm => {
                let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
                token::Client::new(&env, &xlm_token)
                    .transfer(&buyer, &env.current_contract_address(), &price_xlm);
            }
            Currency::Usdc => {
                let usdc_token: Address =
                    env.storage().instance().get(&DataKey::UsdcToken).unwrap();
                token::Client::new(&env, &usdc_token)
                    .transfer(&buyer, &env.current_contract_address(), &price_usdc);
            }
        }

        let commission_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextCommissionId)
            .unwrap();

        let no_artist = Address::from_string(&String::from_str(&env, ZERO_ADDR));

        let commission = CommissionRequest {
            buyer,
            intention,
            reference_image,
            price_xlm,
            price_usdc,
            xlm_usdc_rate,
            currency,
            status: CommissionStatus::Open,
            token_id: 0u64,
            artist: no_artist,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Commission(commission_id), &commission);
        env.storage()
            .instance()
            .set(&DataKey::NextCommissionId, &(commission_id + 1));

        commission_id
    }

    // ── Admin: assign an artist ────────────────────────────────────────────────

    /// Records that an artist accepted the commission. The admin (or a trusted
    /// off-chain process) calls this after the artist has been confirmed and
    /// the egg NFT has been minted to the buyer on the NFT contract.
    /// Status → Accepted.
    pub fn assign_artist(
        env: Env,
        commission_id: u64,
        artist: Address,
        token_id: u64,
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut commission: CommissionRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Commission(commission_id))
            .unwrap_or_else(|| panic!("commission does not exist"));

        if commission.status != CommissionStatus::Open {
            panic!("commission is not open");
        }

        commission.status = CommissionStatus::Accepted;
        commission.artist = artist;
        commission.token_id = token_id;

        env.storage()
            .persistent()
            .set(&DataKey::Commission(commission_id), &commission);
    }

    // ── Artist: mark as delivered ──────────────────────────────────────────────

    /// The artist flags the commission as delivered after updating the egg NFT
    /// metadata on the NFT contract via `update_token_uri_as_creator`. Status
    /// → Delivered.
    pub fn mark_delivered(env: Env, artist: Address, commission_id: u64) {
        artist.require_auth();

        let mut commission: CommissionRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Commission(commission_id))
            .unwrap_or_else(|| panic!("commission does not exist"));

        if commission.status != CommissionStatus::Accepted {
            panic!("commission is not in accepted state");
        }
        if commission.artist != artist {
            panic!("only the assigned artist can mark this commission as delivered");
        }

        commission.status = CommissionStatus::Delivered;
        env.storage()
            .persistent()
            .set(&DataKey::Commission(commission_id), &commission);
    }

    // ── Buyer: approve delivery ───────────────────────────────────────────────

    /// Buyer approves the delivered art and releases escrowed payment to the
    /// artist. Status → Completed.
    pub fn approve_delivery(env: Env, buyer: Address, commission_id: u64) {
        buyer.require_auth();

        let mut commission: CommissionRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Commission(commission_id))
            .unwrap_or_else(|| panic!("commission does not exist"));

        if commission.status != CommissionStatus::Delivered {
            panic!("commission has not been marked as delivered yet");
        }
        if commission.buyer != buyer {
            panic!("only the buyer can approve delivery");
        }

        // Release escrowed payment to artist
        match &commission.currency {
            Currency::Xlm => {
                let xlm_token: Address =
                    env.storage().instance().get(&DataKey::XlmToken).unwrap();
                token::Client::new(&env, &xlm_token).transfer(
                    &env.current_contract_address(),
                    &commission.artist,
                    &commission.price_xlm,
                );
            }
            Currency::Usdc => {
                let usdc_token: Address =
                    env.storage().instance().get(&DataKey::UsdcToken).unwrap();
                token::Client::new(&env, &usdc_token).transfer(
                    &env.current_contract_address(),
                    &commission.artist,
                    &commission.price_usdc,
                );
            }
        }

        commission.status = CommissionStatus::Completed;
        env.storage()
            .persistent()
            .set(&DataKey::Commission(commission_id), &commission);
    }

    // ── Cancel commission ─────────────────────────────────────────────────────

    /// Cancel an Open commission (buyer or admin) or an Accepted commission
    /// (admin only for dispute resolution). Payment is refunded to the buyer.
    pub fn cancel_commission(env: Env, caller: Address, commission_id: u64) {
        caller.require_auth();

        let mut commission: CommissionRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Commission(commission_id))
            .unwrap_or_else(|| panic!("commission does not exist"));

        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();

        match commission.status {
            CommissionStatus::Open => {
                if commission.buyer != caller && admin != caller {
                    panic!("only the buyer or admin can cancel an open commission");
                }
            }
            CommissionStatus::Accepted => {
                if admin != caller {
                    panic!("only admin can cancel an accepted commission (dispute)");
                }
            }
            _ => {
                panic!("commission cannot be cancelled in its current state");
            }
        }

        // Refund escrowed payment to buyer
        match &commission.currency {
            Currency::Xlm => {
                let xlm_token: Address =
                    env.storage().instance().get(&DataKey::XlmToken).unwrap();
                token::Client::new(&env, &xlm_token).transfer(
                    &env.current_contract_address(),
                    &commission.buyer,
                    &commission.price_xlm,
                );
            }
            Currency::Usdc => {
                let usdc_token: Address =
                    env.storage().instance().get(&DataKey::UsdcToken).unwrap();
                token::Client::new(&env, &usdc_token).transfer(
                    &env.current_contract_address(),
                    &commission.buyer,
                    &commission.price_usdc,
                );
            }
        }

        commission.status = CommissionStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Commission(commission_id), &commission);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    pub fn get_commission(env: Env, commission_id: u64) -> CommissionRequest {
        env.storage()
            .persistent()
            .get(&DataKey::Commission(commission_id))
            .unwrap_or_else(|| panic!("commission does not exist"))
    }

    pub fn total_commissions(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextCommissionId)
            .unwrap_or(0u64)
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{StellarAssetClient, TokenClient},
        Env, String,
    };

    struct TestEnv {
        env: Env,
        commission: ShimejiCommissionClient<'static>,
        xlm: TokenClient<'static>,
        usdc: TokenClient<'static>,
        xlm_sac: StellarAssetClient<'static>,
        usdc_sac: StellarAssetClient<'static>,
        admin: Address,
    }

    fn setup() -> TestEnv {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let xlm_issuer = Address::generate(&env);
        let usdc_issuer = Address::generate(&env);

        let xlm_addr = env.register_stellar_asset_contract_v2(xlm_issuer).address();
        let usdc_addr = env.register_stellar_asset_contract_v2(usdc_issuer).address();
        let xlm = TokenClient::new(&env, &xlm_addr);
        let usdc = TokenClient::new(&env, &usdc_addr);
        let xlm_sac = StellarAssetClient::new(&env, &xlm_addr);
        let usdc_sac = StellarAssetClient::new(&env, &usdc_addr);

        let commission_addr = env.register(ShimejiCommission, ());
        let commission = ShimejiCommissionClient::new(&env, &commission_addr);
        commission.initialize(&admin, &usdc_addr, &xlm_addr);

        TestEnv { env, commission, xlm, usdc, xlm_sac, usdc_sac, admin }
    }

    #[test]
    fn test_xlm_commission_happy_path() {
        let t = setup();
        let buyer = Address::generate(&t.env);
        let artist = Address::generate(&t.env);

        t.xlm_sac.mint(&buyer, &500_0000000i128);

        let intention = String::from_str(&t.env, "Draw my shimeji as a samurai!");
        let ref_img = String::from_str(&t.env, "ipfs://Qm.../reference.png");

        let commission_id = t.commission.create_commission(
            &buyer,
            &intention,
            &ref_img,
            &100_0000000i128,
            &10_0000000i128,
            &1000000i128,
            &Currency::Xlm,
        );
        assert_eq!(commission_id, 0);
        assert_eq!(t.commission.total_commissions(), 1);

        // Payment escrowed
        assert_eq!(t.xlm.balance(&buyer), 400_0000000i128);

        // Admin assigns artist + egg token ID
        t.commission.assign_artist(&commission_id, &artist, &42u64);
        let c = t.commission.get_commission(&commission_id);
        assert_eq!(c.status, CommissionStatus::Accepted);
        assert_eq!(c.token_id, 42u64);

        // Artist marks delivered
        t.commission.mark_delivered(&artist, &commission_id);
        let c = t.commission.get_commission(&commission_id);
        assert_eq!(c.status, CommissionStatus::Delivered);

        // Buyer approves
        t.commission.approve_delivery(&buyer, &commission_id);
        let c = t.commission.get_commission(&commission_id);
        assert_eq!(c.status, CommissionStatus::Completed);

        // Artist received payment
        assert_eq!(t.xlm.balance(&artist), 100_0000000i128);
    }

    #[test]
    fn test_usdc_commission_happy_path() {
        let t = setup();
        let buyer = Address::generate(&t.env);
        let artist = Address::generate(&t.env);

        t.usdc_sac.mint(&buyer, &50_0000000i128);

        let intention = String::from_str(&t.env, "Pixel art shimeji please");
        let ref_img = String::from_str(&t.env, "");

        let commission_id = t.commission.create_commission(
            &buyer,
            &intention,
            &ref_img,
            &100_0000000i128,
            &10_0000000i128,
            &1000000i128,
            &Currency::Usdc,
        );

        t.commission.assign_artist(&commission_id, &artist, &0u64);
        t.commission.mark_delivered(&artist, &commission_id);
        t.commission.approve_delivery(&buyer, &commission_id);

        assert_eq!(t.usdc.balance(&artist), 10_0000000i128);
    }

    #[test]
    fn test_cancel_open_commission() {
        let t = setup();
        let buyer = Address::generate(&t.env);

        t.xlm_sac.mint(&buyer, &100_0000000i128);

        let intention = String::from_str(&t.env, "Neon shimeji");
        let ref_img = String::from_str(&t.env, "");

        let commission_id = t.commission.create_commission(
            &buyer,
            &intention,
            &ref_img,
            &100_0000000i128,
            &10_0000000i128,
            &1000000i128,
            &Currency::Xlm,
        );

        // Buyer cancels — payment returned
        t.commission.cancel_commission(&buyer, &commission_id);
        let c = t.commission.get_commission(&commission_id);
        assert_eq!(c.status, CommissionStatus::Cancelled);
        assert_eq!(t.xlm.balance(&buyer), 100_0000000i128);
    }

    #[test]
    #[should_panic(expected = "commission is not open")]
    fn test_cannot_reassign_accepted_commission() {
        let t = setup();
        let buyer = Address::generate(&t.env);
        let artist1 = Address::generate(&t.env);
        let artist2 = Address::generate(&t.env);

        t.xlm_sac.mint(&buyer, &100_0000000i128);

        let intention = String::from_str(&t.env, "Cute shimeji");
        let ref_img = String::from_str(&t.env, "");

        let commission_id = t.commission.create_commission(
            &buyer,
            &intention,
            &ref_img,
            &100_0000000i128,
            &10_0000000i128,
            &1000000i128,
            &Currency::Xlm,
        );

        t.commission.assign_artist(&commission_id, &artist1, &0u64);
        t.commission.assign_artist(&commission_id, &artist2, &1u64);
    }
}
