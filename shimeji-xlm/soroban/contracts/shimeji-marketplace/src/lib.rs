#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, IntoVal, String, Symbol,
};

const MAX_SWAP_INTENTION_LEN: u32 = 280;
const MAX_COMMISSION_INTENTION_LEN: u32 = 500;
const MAX_REFERENCE_IMAGE_URL_LEN: u32 = 512;
const MAX_COMMISSION_TURNAROUND_DAYS: u64 = 365;
const MAX_COMMISSION_REVISION_REQUESTS: u64 = 3;
const COMMISSION_AUTO_RELEASE_AFTER_DELIVERY_SECS: u64 = 7 * 24 * 60 * 60;

/// Shared scale factor used for token amounts and oracle rate (10^7).
const TOKEN_SCALE: i128 = 10_000_000;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Currency {
    Xlm,
    Usdc,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EscrowProvider {
    Internal,
    TrustlessWork,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum CommissionOrderStatus {
    Accepted,
    Delivered,
    Completed,
    Refunded,
}

/// Oracle asset descriptor (Reflector protocol).
#[contracttype]
#[derive(Clone)]
pub enum OracleAsset {
    Stellar(Address),
    Other(Symbol),
}

/// Oracle price data returned by Reflector (price is at 10^14 scale).
#[contracttype]
#[derive(Clone)]
pub struct OraclePriceData {
    pub price: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ListingInfo {
    pub seller: Address,
    pub token_id: u64,
    /// Price in the seller's chosen currency.
    pub price: i128,
    /// The currency the seller set the price in.
    pub currency: Currency,
    pub commission_eta_days: u64,
    pub is_commission_egg: bool,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct SwapListing {
    pub creator: Address,
    pub offered_token_id: u64,
    pub intention: String,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct SwapBid {
    pub listing_id: u64,
    pub bidder: Address,
    pub bidder_token_id: u64,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct CommissionOrder {
    pub buyer: Address,
    pub seller: Address,
    pub listing_id: u64,
    pub token_id: u64,
    pub currency: Currency,
    pub amount_paid: i128,
    pub upfront_paid_to_seller: i128,
    pub escrow_remaining: i128,
    pub escrow_provider: EscrowProvider,
    pub escrow_holder: Address,
    pub commission_eta_days: u64,
    pub intention: String,
    pub reference_image_url: String,
    pub latest_revision_intention: String,
    pub latest_revision_ref_url: String,
    pub revision_request_count: u64,
    pub max_revision_requests: u64,
    pub metadata_uri_at_purchase: String,
    pub last_delivered_metadata_uri: String,
    pub status: CommissionOrderStatus,
    pub created_at: u64,
    pub delivered_at: u64,
    pub resolved_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    NftContract,
    UsdcToken,
    XlmToken,
    EscrowProvider,
    TrustlessEscrowXlm,
    TrustlessEscrowUsdc,
    OracleContract,
    NextListingId,
    NextSwapListingId,
    NextSwapBidId,
    NextCommissionOrderId,
    Listing(u64),
    SwapListing(u64),
    SwapBid(u64),
    CommissionOrder(u64),
    SellerActiveCommissionEggListing(Address),
    SellerOpenCommissionOrder(Address),
}

#[contract]
pub struct ShimejiMarketplace;

impl ShimejiMarketplace {
    fn require_admin(env: &Env) -> Address {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        admin
    }

    fn nft_contract(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::NftContract).unwrap()
    }

    fn current_escrow_provider(env: &Env) -> EscrowProvider {
        env.storage()
            .instance()
            .get(&DataKey::EscrowProvider)
            .unwrap_or(EscrowProvider::Internal)
    }

    fn trustless_escrow_destination(env: &Env, currency: &Currency) -> Address {
        let key = match currency {
            Currency::Xlm => DataKey::TrustlessEscrowXlm,
            Currency::Usdc => DataKey::TrustlessEscrowUsdc,
        };
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("trustless escrow destination not configured"))
    }

    fn token_address_for_currency(env: &Env, currency: &Currency) -> Address {
        match currency {
            Currency::Xlm => env.storage().instance().get(&DataKey::XlmToken).unwrap(),
            Currency::Usdc => env.storage().instance().get(&DataKey::UsdcToken).unwrap(),
        }
    }

    fn nft_transfer(env: &Env, from: Address, to: Address, token_id: u64) {
        let nft = Self::nft_contract(env);
        env.invoke_contract::<()>(
            &nft,
            &Symbol::new(env, "transfer"),
            (from, to, token_id).into_val(env),
        );
    }

    fn validate_swap_intention(intention: &String) {
        if intention.is_empty() {
            panic!("intention cannot be empty");
        }
        if intention.len() > MAX_SWAP_INTENTION_LEN {
            panic!("intention too long");
        }
    }

    fn validate_commission_payload(intention: &String, reference_image_url: &String) {
        if intention.is_empty() {
            panic!("commission intention cannot be empty");
        }
        if intention.len() > MAX_COMMISSION_INTENTION_LEN {
            panic!("commission intention too long");
        }
        if reference_image_url.len() > MAX_REFERENCE_IMAGE_URL_LEN {
            panic!("reference image url too long");
        }
    }

    fn validate_commission_eta_days(commission_eta_days: u64) {
        if commission_eta_days == 0 {
            panic!("commission_eta_days must be positive");
        }
        if commission_eta_days > MAX_COMMISSION_TURNAROUND_DAYS {
            panic!("commission_eta_days too large");
        }
    }

    fn split_commission_payment(amount_paid: i128) -> (i128, i128) {
        if amount_paid <= 0 {
            panic!("commission amount must be positive");
        }
        let upfront = amount_paid / 2;
        let escrow = amount_paid - upfront;
        (upfront, escrow)
    }

    fn transfer_currency(
        env: &Env,
        currency: &Currency,
        from: &Address,
        to: &Address,
        amount: i128,
    ) {
        if amount <= 0 {
            return;
        }
        match currency {
            Currency::Xlm => {
                let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
                token::Client::new(env, &xlm_token).transfer(from, to, &amount);
            }
            Currency::Usdc => {
                let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
                token::Client::new(env, &usdc_token).transfer(from, to, &amount);
            }
        }
    }

    fn route_commission_escrow_after_purchase(
        env: &Env,
        currency: &Currency,
        amount: i128,
    ) -> (EscrowProvider, Address) {
        if amount <= 0 {
            return (EscrowProvider::Internal, env.current_contract_address());
        }

        let provider = Self::current_escrow_provider(env);
        match provider {
            EscrowProvider::Internal => (EscrowProvider::Internal, env.current_contract_address()),
            EscrowProvider::TrustlessWork => {
                let destination = Self::trustless_escrow_destination(env, currency);
                Self::transfer_currency(
                    env,
                    currency,
                    &env.current_contract_address(),
                    &destination,
                    amount,
                );
                (EscrowProvider::TrustlessWork, destination)
            }
        }
    }

    fn settle_commission_escrow_to(env: &Env, order: &CommissionOrder, recipient: &Address, amount: i128) {
        if amount <= 0 {
            return;
        }

        match order.escrow_provider {
            EscrowProvider::Internal => {
                Self::transfer_currency(
                    env,
                    &order.currency,
                    &env.current_contract_address(),
                    recipient,
                    amount,
                );
            }
            EscrowProvider::TrustlessWork => {
                let token_addr = Self::token_address_for_currency(env, &order.currency);
                env.invoke_contract::<()>(
                    &order.escrow_holder,
                    &Symbol::new(env, "payout_token"),
                    (
                        env.current_contract_address(),
                        token_addr,
                        recipient.clone(),
                        amount,
                    )
                        .into_val(env),
                );
            }
        }
    }

    fn nft_token_uri(env: &Env, token_id: u64) -> String {
        let nft = Self::nft_contract(env);
        env.invoke_contract::<String>(
            &nft,
            &Symbol::new(env, "token_uri"),
            (token_id,).into_val(env),
        )
    }

    fn create_commission_order_record(
        env: &Env,
        listing_id: u64,
        listing: &ListingInfo,
        buyer: Address,
        currency: Currency,
        amount_paid: i128,
        upfront_paid_to_seller: i128,
        escrow_remaining: i128,
        escrow_provider: EscrowProvider,
        escrow_holder: Address,
        intention: String,
        reference_image_url: String,
    ) -> u64 {
        let order_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextCommissionOrderId)
            .unwrap();

        let metadata_uri_at_purchase = Self::nft_token_uri(env, listing.token_id);

        let order = CommissionOrder {
            buyer,
            seller: listing.seller.clone(),
            listing_id,
            token_id: listing.token_id,
            currency,
            amount_paid,
            upfront_paid_to_seller,
            escrow_remaining,
            escrow_provider,
            escrow_holder,
            commission_eta_days: listing.commission_eta_days,
            intention,
            reference_image_url,
            latest_revision_intention: String::from_str(env, ""),
            latest_revision_ref_url: String::from_str(env, ""),
            revision_request_count: 0,
            max_revision_requests: MAX_COMMISSION_REVISION_REQUESTS,
            metadata_uri_at_purchase,
            last_delivered_metadata_uri: String::from_str(env, ""),
            status: CommissionOrderStatus::Accepted,
            created_at: env.ledger().timestamp(),
            delivered_at: 0,
            resolved_at: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::CommissionOrder(order_id), &order);
        env.storage().persistent().set(
            &DataKey::SellerOpenCommissionOrder(listing.seller.clone()),
            &order_id,
        );
        env.storage()
            .instance()
            .set(&DataKey::NextCommissionOrderId, &(order_id + 1));

        order_id
    }

    fn ensure_commission_egg_slot_available(env: &Env, seller: &Address) {
        if env
            .storage()
            .persistent()
            .has(&DataKey::SellerActiveCommissionEggListing(seller.clone()))
        {
            panic!("seller already has an active commission egg listing");
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::SellerOpenCommissionOrder(seller.clone()))
        {
            panic!("seller has a pending commission order");
        }
    }

    fn clear_active_commission_egg_listing(env: &Env, seller: &Address) {
        env.storage()
            .persistent()
            .remove(&DataKey::SellerActiveCommissionEggListing(seller.clone()));
    }

    fn clear_seller_open_commission_order(env: &Env, seller: &Address) {
        env.storage()
            .persistent()
            .remove(&DataKey::SellerOpenCommissionOrder(seller.clone()));
    }

    fn next_swap_listing_id(env: &Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextSwapListingId)
            .unwrap_or(0u64)
    }

    fn next_swap_bid_id(env: &Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextSwapBidId)
            .unwrap_or(0u64)
    }

    /// Fetch XLM/USDC rate from Reflector oracle.
    /// Returns XLM price expressed in USDC at TOKEN_SCALE (10^7), or None if no oracle configured.
    fn get_xlm_usdc_rate(env: &Env) -> Option<i128> {
        let oracle: Option<Address> = env.storage().instance().get(&DataKey::OracleContract);
        let oracle = oracle?;
        let asset = OracleAsset::Other(Symbol::new(env, "XLM"));
        let data: Option<OraclePriceData> = env.invoke_contract(
            &oracle,
            &Symbol::new(env, "lastprice"),
            (asset,).into_val(env),
        );
        // Reflector returns price at 10^14 scale; convert to 10^7 by dividing by 10^7
        data.map(|pd| pd.price / 10_000_000)
    }

    fn refund_active_swap_bids_for_listing(env: &Env, listing_id: u64, except_bid_id: Option<u64>) {
        let total_bids = Self::next_swap_bid_id(env);
        for bid_id in 0..total_bids {
            if let Some(skip_id) = except_bid_id {
                if skip_id == bid_id {
                    continue;
                }
            }

            let maybe_bid: Option<SwapBid> = env.storage().persistent().get(&DataKey::SwapBid(bid_id));
            let Some(mut bid) = maybe_bid else {
                continue;
            };
            if !bid.active || bid.listing_id != listing_id {
                continue;
            }

            Self::nft_transfer(
                env,
                env.current_contract_address(),
                bid.bidder.clone(),
                bid.bidder_token_id,
            );
            bid.active = false;
            env.storage().persistent().set(&DataKey::SwapBid(bid_id), &bid);
        }
    }
}

#[contractimpl]
impl ShimejiMarketplace {
    pub fn initialize(
        env: Env,
        admin: Address,
        nft_contract: Address,
        usdc_token: Address,
        xlm_token: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::NftContract, &nft_contract);
        env.storage()
            .instance()
            .set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage()
            .instance()
            .set(&DataKey::EscrowProvider, &EscrowProvider::Internal);
        env.storage().instance().set(&DataKey::TrustlessEscrowXlm, &admin);
        env.storage().instance().set(&DataKey::TrustlessEscrowUsdc, &admin);
        env.storage().instance().set(&DataKey::NextListingId, &0u64);
        env.storage().instance().set(&DataKey::NextSwapListingId, &0u64);
        env.storage().instance().set(&DataKey::NextSwapBidId, &0u64);
        env.storage()
            .instance()
            .set(&DataKey::NextCommissionOrderId, &0u64);
    }

    pub fn configure_internal_escrow(env: Env) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::EscrowProvider, &EscrowProvider::Internal);
    }

    pub fn configure_trustless_escrow(env: Env, xlm_destination: Address, usdc_destination: Address) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::TrustlessEscrowXlm, &xlm_destination);
        env.storage().instance().set(&DataKey::TrustlessEscrowUsdc, &usdc_destination);
        env.storage()
            .instance()
            .set(&DataKey::EscrowProvider, &EscrowProvider::TrustlessWork);
    }

    pub fn get_escrow_provider(env: Env) -> EscrowProvider {
        Self::current_escrow_provider(&env)
    }

    pub fn get_trustless_escrow_dests(env: Env) -> (Address, Address) {
        let xlm_destination: Address = env
            .storage()
            .instance()
            .get(&DataKey::TrustlessEscrowXlm)
            .unwrap();
        let usdc_destination: Address = env
            .storage()
            .instance()
            .get(&DataKey::TrustlessEscrowUsdc)
            .unwrap();
        (xlm_destination, usdc_destination)
    }

    pub fn configure_oracle(env: Env, oracle: Address) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::OracleContract, &oracle);
    }

    // ── Fixed-price listings ────────────────────────────────────────────────

    pub fn list_for_sale(
        env: Env,
        seller: Address,
        token_id: u64,
        price: i128,
        currency: Currency,
    ) -> u64 {
        seller.require_auth();

        if price <= 0 {
            panic!("price must be positive");
        }

        // Take custody of NFT from seller
        Self::nft_transfer(
            &env,
            seller.clone(),
            env.current_contract_address(),
            token_id,
        );

        let listing_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextListingId)
            .unwrap();

        let listing = ListingInfo {
            seller,
            token_id,
            price,
            currency,
            commission_eta_days: 0,
            is_commission_egg: false,
            active: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        env.storage()
            .instance()
            .set(&DataKey::NextListingId, &(listing_id + 1));

        listing_id
    }

    pub fn list_commission_egg(
        env: Env,
        seller: Address,
        token_id: u64,
        price: i128,
        currency: Currency,
        commission_eta_days: u64,
    ) -> u64 {
        seller.require_auth();
        Self::ensure_commission_egg_slot_available(&env, &seller);
        Self::validate_commission_eta_days(commission_eta_days);

        if price <= 0 {
            panic!("price must be positive");
        }

        Self::nft_transfer(
            &env,
            seller.clone(),
            env.current_contract_address(),
            token_id,
        );

        let listing_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextListingId)
            .unwrap();

        let listing = ListingInfo {
            seller: seller.clone(),
            token_id,
            price,
            currency,
            commission_eta_days,
            is_commission_egg: true,
            active: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        env.storage().persistent().set(
            &DataKey::SellerActiveCommissionEggListing(seller),
            &listing_id,
        );
        env.storage()
            .instance()
            .set(&DataKey::NextListingId, &(listing_id + 1));

        listing_id
    }

    pub fn buy_xlm(env: Env, buyer: Address, listing_id: u64) {
        buyer.require_auth();

        let mut listing: ListingInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .unwrap_or_else(|| panic!("listing does not exist"));

        if !listing.active {
            panic!("listing is not active");
        }
        if listing.is_commission_egg {
            panic!("use buy_commission_xlm for commission listings");
        }

        // Compute XLM amount: direct if listed in XLM, or convert via oracle if listed in USDC
        let amount_xlm = match listing.currency {
            Currency::Xlm => listing.price,
            Currency::Usdc => {
                let rate = Self::get_xlm_usdc_rate(&env)
                    .unwrap_or_else(|| panic!("oracle not configured for XLM/USDC conversion"));
                if rate <= 0 { panic!("invalid oracle rate"); }
                listing.price * TOKEN_SCALE / rate
            }
        };

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        token::Client::new(&env, &xlm_token).transfer(&buyer, &listing.seller, &amount_xlm);

        // Transfer NFT from marketplace to buyer
        Self::nft_transfer(
            &env,
            env.current_contract_address(),
            buyer,
            listing.token_id,
        );

        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
    }

    pub fn buy_usdc(env: Env, buyer: Address, listing_id: u64) {
        buyer.require_auth();

        let mut listing: ListingInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .unwrap_or_else(|| panic!("listing does not exist"));

        if !listing.active {
            panic!("listing is not active");
        }
        if listing.is_commission_egg {
            panic!("use buy_commission_usdc for commission listings");
        }

        // Compute USDC amount: direct if listed in USDC, or convert via oracle if listed in XLM
        let amount_usdc = match listing.currency {
            Currency::Usdc => listing.price,
            Currency::Xlm => {
                let rate = Self::get_xlm_usdc_rate(&env)
                    .unwrap_or_else(|| panic!("oracle not configured for XLM/USDC conversion"));
                if rate <= 0 { panic!("invalid oracle rate"); }
                listing.price * rate / TOKEN_SCALE
            }
        };

        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::Client::new(&env, &usdc_token).transfer(&buyer, &listing.seller, &amount_usdc);

        // Transfer NFT from marketplace to buyer
        Self::nft_transfer(
            &env,
            env.current_contract_address(),
            buyer,
            listing.token_id,
        );

        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
    }

    pub fn buy_commission_xlm(
        env: Env,
        buyer: Address,
        listing_id: u64,
        intention: String,
        reference_image_url: String,
    ) -> u64 {
        buyer.require_auth();
        Self::validate_commission_payload(&intention, &reference_image_url);

        let mut listing: ListingInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .unwrap_or_else(|| panic!("listing does not exist"));

        if !listing.active {
            panic!("listing is not active");
        }
        if !listing.is_commission_egg {
            panic!("listing is not a commission egg");
        }

        // Compute XLM amount to pay based on listing currency
        let amount_xlm = match listing.currency {
            Currency::Xlm => listing.price,
            Currency::Usdc => {
                let rate = Self::get_xlm_usdc_rate(&env)
                    .unwrap_or_else(|| panic!("oracle not configured for XLM/USDC conversion"));
                if rate <= 0 { panic!("invalid oracle rate"); }
                listing.price * TOKEN_SCALE / rate
            }
        };

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount_xlm);
        let (upfront_paid_to_seller, escrow_remaining) = Self::split_commission_payment(amount_xlm);
        if upfront_paid_to_seller > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &listing.seller,
                &upfront_paid_to_seller,
            );
        }
        let (escrow_provider, escrow_holder) =
            Self::route_commission_escrow_after_purchase(&env, &Currency::Xlm, escrow_remaining);

        Self::nft_transfer(
            &env,
            env.current_contract_address(),
            buyer.clone(),
            listing.token_id,
        );

        let order_id = Self::create_commission_order_record(
            &env,
            listing_id,
            &listing,
            buyer,
            Currency::Xlm,
            amount_xlm,
            upfront_paid_to_seller,
            escrow_remaining,
            escrow_provider,
            escrow_holder,
            intention,
            reference_image_url,
        );

        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        Self::clear_active_commission_egg_listing(&env, &listing.seller);

        order_id
    }

    pub fn buy_commission_usdc(
        env: Env,
        buyer: Address,
        listing_id: u64,
        intention: String,
        reference_image_url: String,
    ) -> u64 {
        buyer.require_auth();
        Self::validate_commission_payload(&intention, &reference_image_url);

        let mut listing: ListingInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .unwrap_or_else(|| panic!("listing does not exist"));

        if !listing.active {
            panic!("listing is not active");
        }
        if !listing.is_commission_egg {
            panic!("listing is not a commission egg");
        }

        // Compute USDC amount to pay based on listing currency
        let amount_usdc = match listing.currency {
            Currency::Usdc => listing.price,
            Currency::Xlm => {
                let rate = Self::get_xlm_usdc_rate(&env)
                    .unwrap_or_else(|| panic!("oracle not configured for XLM/USDC conversion"));
                if rate <= 0 { panic!("invalid oracle rate"); }
                listing.price * rate / TOKEN_SCALE
            }
        };

        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc_token);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount_usdc);
        let (upfront_paid_to_seller, escrow_remaining) = Self::split_commission_payment(amount_usdc);
        if upfront_paid_to_seller > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &listing.seller,
                &upfront_paid_to_seller,
            );
        }
        let (escrow_provider, escrow_holder) =
            Self::route_commission_escrow_after_purchase(&env, &Currency::Usdc, escrow_remaining);

        Self::nft_transfer(
            &env,
            env.current_contract_address(),
            buyer.clone(),
            listing.token_id,
        );

        let order_id = Self::create_commission_order_record(
            &env,
            listing_id,
            &listing,
            buyer,
            Currency::Usdc,
            amount_usdc,
            upfront_paid_to_seller,
            escrow_remaining,
            escrow_provider,
            escrow_holder,
            intention,
            reference_image_url,
        );

        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        Self::clear_active_commission_egg_listing(&env, &listing.seller);

        order_id
    }

    pub fn cancel_listing(env: Env, seller: Address, listing_id: u64) {
        seller.require_auth();

        let mut listing: ListingInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .unwrap_or_else(|| panic!("listing does not exist"));

        if listing.seller != seller {
            panic!("only the seller can cancel this listing");
        }
        if !listing.active {
            panic!("listing is not active");
        }

        // Return NFT to seller
        Self::nft_transfer(
            &env,
            env.current_contract_address(),
            seller,
            listing.token_id,
        );

        if listing.is_commission_egg {
            Self::clear_active_commission_egg_listing(&env, &listing.seller);
        }

        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
    }

    pub fn mark_commission_delivered(env: Env, seller: Address, order_id: u64) {
        seller.require_auth();

        let mut order: CommissionOrder = env
            .storage()
            .persistent()
            .get(&DataKey::CommissionOrder(order_id))
            .unwrap_or_else(|| panic!("commission order does not exist"));

        if order.seller != seller {
            panic!("only seller can mark commission delivered");
        }
        if order.status != CommissionOrderStatus::Accepted {
            panic!("commission is not in accepted state");
        }

        let current_token_uri = Self::nft_token_uri(&env, order.token_id);
        let baseline_token_uri = if order.last_delivered_metadata_uri.is_empty() {
            order.metadata_uri_at_purchase.clone()
        } else {
            order.last_delivered_metadata_uri.clone()
        };

        if current_token_uri == baseline_token_uri {
            panic!("update nft metadata before marking commission delivered");
        }

        order.status = CommissionOrderStatus::Delivered;
        order.last_delivered_metadata_uri = current_token_uri;
        order.delivered_at = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::CommissionOrder(order_id), &order);
    }

    pub fn request_commission_revision(
        env: Env,
        buyer: Address,
        order_id: u64,
        intention: String,
        reference_image_url: String,
    ) {
        buyer.require_auth();
        Self::validate_commission_payload(&intention, &reference_image_url);

        let mut order: CommissionOrder = env
            .storage()
            .persistent()
            .get(&DataKey::CommissionOrder(order_id))
            .unwrap_or_else(|| panic!("commission order does not exist"));

        if order.buyer != buyer {
            panic!("only buyer can request commission changes");
        }
        if order.status != CommissionOrderStatus::Delivered {
            panic!("commission order is not awaiting buyer review");
        }
        if order.revision_request_count >= order.max_revision_requests {
            panic!("maximum revision requests reached");
        }

        order.revision_request_count += 1;
        order.latest_revision_intention = intention;
        order.latest_revision_ref_url = reference_image_url;
        order.status = CommissionOrderStatus::Accepted;
        order.delivered_at = 0;
        env.storage()
            .persistent()
            .set(&DataKey::CommissionOrder(order_id), &order);
    }

    pub fn approve_commission_delivery(env: Env, buyer: Address, order_id: u64) {
        buyer.require_auth();

        let mut order: CommissionOrder = env
            .storage()
            .persistent()
            .get(&DataKey::CommissionOrder(order_id))
            .unwrap_or_else(|| panic!("commission order does not exist"));

        if order.buyer != buyer {
            panic!("only buyer can approve commission delivery");
        }
        if order.status != CommissionOrderStatus::Delivered {
            panic!("commission order is not delivered");
        }

        Self::settle_commission_escrow_to(&env, &order, &order.seller, order.escrow_remaining);

        order.escrow_remaining = 0;
        order.status = CommissionOrderStatus::Completed;
        order.resolved_at = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::CommissionOrder(order_id), &order);
        Self::clear_seller_open_commission_order(&env, &order.seller);
    }

    pub fn claim_commission_timeout(env: Env, seller: Address, order_id: u64) {
        seller.require_auth();

        let mut order: CommissionOrder = env
            .storage()
            .persistent()
            .get(&DataKey::CommissionOrder(order_id))
            .unwrap_or_else(|| panic!("commission order does not exist"));

        if order.seller != seller {
            panic!("only seller can claim commission timeout");
        }
        if order.status != CommissionOrderStatus::Delivered {
            panic!("commission order is not delivered");
        }
        if order.delivered_at == 0 {
            panic!("commission delivery timestamp missing");
        }

        let now = env.ledger().timestamp();
        if now < order.delivered_at + COMMISSION_AUTO_RELEASE_AFTER_DELIVERY_SECS {
            panic!("commission timeout not reached yet");
        }

        Self::settle_commission_escrow_to(&env, &order, &order.seller, order.escrow_remaining);

        order.escrow_remaining = 0;
        order.status = CommissionOrderStatus::Completed;
        order.resolved_at = now;
        env.storage()
            .persistent()
            .set(&DataKey::CommissionOrder(order_id), &order);
        Self::clear_seller_open_commission_order(&env, &order.seller);
    }

    pub fn refund_commission_order(env: Env, caller: Address, order_id: u64) {
        caller.require_auth();

        let mut order: CommissionOrder = env
            .storage()
            .persistent()
            .get(&DataKey::CommissionOrder(order_id))
            .unwrap_or_else(|| panic!("commission order does not exist"));

        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let caller_is_buyer = caller == order.buyer;
        let caller_is_seller = caller == order.seller;
        let caller_is_admin = caller == admin;

        if !(caller_is_buyer || caller_is_seller || caller_is_admin) {
            panic!("unauthorized refund caller");
        }
        if order.status != CommissionOrderStatus::Accepted
            && order.status != CommissionOrderStatus::Delivered
        {
            panic!("commission order cannot be refunded");
        }

        Self::settle_commission_escrow_to(&env, &order, &order.buyer, order.escrow_remaining);

        order.escrow_remaining = 0;
        order.status = CommissionOrderStatus::Refunded;
        order.resolved_at = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::CommissionOrder(order_id), &order);
        Self::clear_seller_open_commission_order(&env, &order.seller);
    }

    // ── Open swap listings + bids ───────────────────────────────────────────

    pub fn create_swap_listing(
        env: Env,
        creator: Address,
        offered_token_id: u64,
        intention: String,
    ) -> u64 {
        creator.require_auth();
        Self::validate_swap_intention(&intention);

        Self::nft_transfer(
            &env,
            creator.clone(),
            env.current_contract_address(),
            offered_token_id,
        );

        let listing_id = Self::next_swap_listing_id(&env);
        let listing = SwapListing {
            creator,
            offered_token_id,
            intention,
            active: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::SwapListing(listing_id), &listing);
        env.storage()
            .instance()
            .set(&DataKey::NextSwapListingId, &(listing_id + 1));

        listing_id
    }

    pub fn place_swap_bid(env: Env, bidder: Address, listing_id: u64, bidder_token_id: u64) -> u64 {
        bidder.require_auth();

        let listing: SwapListing = env
            .storage()
            .persistent()
            .get(&DataKey::SwapListing(listing_id))
            .unwrap_or_else(|| panic!("swap listing does not exist"));

        if !listing.active {
            panic!("swap listing is not active");
        }
        if listing.creator == bidder {
            panic!("creator cannot bid on own swap listing");
        }
        if listing.offered_token_id == bidder_token_id {
            panic!("cannot swap a token with itself");
        }

        Self::nft_transfer(
            &env,
            bidder.clone(),
            env.current_contract_address(),
            bidder_token_id,
        );

        let bid_id = Self::next_swap_bid_id(&env);
        let bid = SwapBid {
            listing_id,
            bidder,
            bidder_token_id,
            active: true,
        };

        env.storage().persistent().set(&DataKey::SwapBid(bid_id), &bid);
        env.storage()
            .instance()
            .set(&DataKey::NextSwapBidId, &(bid_id + 1));

        bid_id
    }

    pub fn accept_swap_bid(env: Env, creator: Address, listing_id: u64, bid_id: u64) {
        creator.require_auth();

        let mut listing: SwapListing = env
            .storage()
            .persistent()
            .get(&DataKey::SwapListing(listing_id))
            .unwrap_or_else(|| panic!("swap listing does not exist"));
        if !listing.active {
            panic!("swap listing is not active");
        }
        if listing.creator != creator {
            panic!("only the creator can accept swap bids");
        }

        let mut bid: SwapBid = env
            .storage()
            .persistent()
            .get(&DataKey::SwapBid(bid_id))
            .unwrap_or_else(|| panic!("swap bid does not exist"));
        if !bid.active {
            panic!("swap bid is not active");
        }
        if bid.listing_id != listing_id {
            panic!("swap bid does not belong to this listing");
        }

        Self::nft_transfer(
            &env,
            env.current_contract_address(),
            bid.bidder.clone(),
            listing.offered_token_id,
        );
        Self::nft_transfer(
            &env,
            env.current_contract_address(),
            listing.creator.clone(),
            bid.bidder_token_id,
        );

        listing.active = false;
        bid.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::SwapListing(listing_id), &listing);
        env.storage().persistent().set(&DataKey::SwapBid(bid_id), &bid);

        Self::refund_active_swap_bids_for_listing(&env, listing_id, Some(bid_id));
    }

    pub fn cancel_swap_listing(env: Env, creator: Address, listing_id: u64) {
        creator.require_auth();

        let mut listing: SwapListing = env
            .storage()
            .persistent()
            .get(&DataKey::SwapListing(listing_id))
            .unwrap_or_else(|| panic!("swap listing does not exist"));

        if listing.creator != creator {
            panic!("only the creator can cancel this swap listing");
        }
        if !listing.active {
            panic!("swap listing is not active");
        }

        Self::nft_transfer(
            &env,
            env.current_contract_address(),
            creator,
            listing.offered_token_id,
        );

        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::SwapListing(listing_id), &listing);

        Self::refund_active_swap_bids_for_listing(&env, listing_id, None);
    }

    pub fn cancel_swap_bid(env: Env, bidder: Address, bid_id: u64) {
        bidder.require_auth();

        let mut bid: SwapBid = env
            .storage()
            .persistent()
            .get(&DataKey::SwapBid(bid_id))
            .unwrap_or_else(|| panic!("swap bid does not exist"));

        if bid.bidder != bidder {
            panic!("only the bidder can cancel this swap bid");
        }
        if !bid.active {
            panic!("swap bid is not active");
        }

        Self::nft_transfer(
            &env,
            env.current_contract_address(),
            bidder,
            bid.bidder_token_id,
        );

        bid.active = false;
        env.storage().persistent().set(&DataKey::SwapBid(bid_id), &bid);
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    pub fn get_listing(env: Env, listing_id: u64) -> ListingInfo {
        env.storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .unwrap_or_else(|| panic!("listing does not exist"))
    }

    pub fn get_swap_listing(env: Env, listing_id: u64) -> SwapListing {
        env.storage()
            .persistent()
            .get(&DataKey::SwapListing(listing_id))
            .unwrap_or_else(|| panic!("swap listing does not exist"))
    }

    pub fn get_swap_bid(env: Env, bid_id: u64) -> SwapBid {
        env.storage()
            .persistent()
            .get(&DataKey::SwapBid(bid_id))
            .unwrap_or_else(|| panic!("swap bid does not exist"))
    }

    pub fn get_commission_order(env: Env, order_id: u64) -> CommissionOrder {
        env.storage()
            .persistent()
            .get(&DataKey::CommissionOrder(order_id))
            .unwrap_or_else(|| panic!("commission order does not exist"))
    }

    pub fn total_listings(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextListingId)
            .unwrap_or(0u64)
    }

    pub fn total_swap_listings(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextSwapListingId)
            .unwrap_or(0u64)
    }

    pub fn total_swap_bids(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextSwapBidId)
            .unwrap_or(0u64)
    }

    pub fn total_commission_orders(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextCommissionOrderId)
            .unwrap_or(0u64)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        contract, contractimpl,
        testutils::{Address as _, Ledger as _},
        token::{StellarAssetClient, TokenClient},
        Env, String,
    };

    #[contracttype]
    #[derive(Clone)]
    enum MockNftKey {
        Owner(u64),
        Uri(u64),
    }

    #[contracttype]
    #[derive(Clone)]
    enum MockEscrowVaultKey {
        Admin,
        Operator,
    }

    // ── Mock NFT ─────────────────────────────────────────────────────────────

    #[contract]
    struct MockNft;

    #[contractimpl]
    impl MockNft {
        pub fn initialize(env: Env, admin: Address) {
            env.storage()
                .instance()
                .set(&soroban_sdk::symbol_short!("admin"), &admin);
            env.storage()
                .instance()
                .set(&soroban_sdk::symbol_short!("next"), &0u64);
        }

        pub fn mint(env: Env, to: Address, _token_uri: String) -> u64 {
            let id: u64 = env
                .storage()
                .instance()
                .get(&soroban_sdk::symbol_short!("next"))
                .unwrap_or(0);
            env.storage()
                .persistent()
                .set(&MockNftKey::Owner(id), &to);
            env.storage()
                .persistent()
                .set(&MockNftKey::Uri(id), &_token_uri);
            env.storage()
                .instance()
                .set(&soroban_sdk::symbol_short!("next"), &(id + 1));
            id
        }

        pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) {
            from.require_auth();
            let owner: Address = env
                .storage()
                .persistent()
                .get(&MockNftKey::Owner(token_id))
                .unwrap();
            if owner != from {
                panic!("not the owner");
            }
            env.storage()
                .persistent()
                .set(&MockNftKey::Owner(token_id), &to);
        }

        pub fn owner_of(env: Env, token_id: u64) -> Address {
            env.storage()
                .persistent()
                .get(&MockNftKey::Owner(token_id))
                .unwrap()
        }

        pub fn token_uri(env: Env, token_id: u64) -> String {
            env.storage()
                .persistent()
                .get(&MockNftKey::Uri(token_id))
                .unwrap()
        }

        pub fn update_token_uri(env: Env, token_id: u64, token_uri: String) {
            env.storage()
                .persistent()
                .set(&MockNftKey::Uri(token_id), &token_uri);
        }
    }

    #[contract]
    struct MockEscrowVault;

    #[contractimpl]
    impl MockEscrowVault {
        pub fn init_vault(env: Env, admin: Address) {
            env.storage().instance().set(&MockEscrowVaultKey::Admin, &admin);
        }

        pub fn set_operator(env: Env, operator: Address) {
            let admin: Address = env.storage().instance().get(&MockEscrowVaultKey::Admin).unwrap();
            admin.require_auth();
            env.storage()
                .instance()
                .set(&MockEscrowVaultKey::Operator, &operator);
        }

        pub fn payout_token(env: Env, caller: Address, token_id: Address, to: Address, amount: i128) {
            if amount <= 0 {
                panic!("amount must be positive");
            }
            caller.require_auth();
            let admin: Address = env.storage().instance().get(&MockEscrowVaultKey::Admin).unwrap();
            let operator: Address = env
                .storage()
                .instance()
                .get(&MockEscrowVaultKey::Operator)
                .unwrap();
            if caller != admin && caller != operator {
                panic!("unauthorized payout caller");
            }
            token::Client::new(&env, &token_id).transfer(&env.current_contract_address(), &to, &amount);
        }
    }

    // ── Test setup ───────────────────────────────────────────────────────────

    struct TestEnv {
        env: Env,
        marketplace: ShimejiMarketplaceClient<'static>,
        marketplace_addr: Address,
        nft_addr: Address,
        xlm: TokenClient<'static>,
        usdc: TokenClient<'static>,
        xlm_sac: StellarAssetClient<'static>,
        usdc_sac: StellarAssetClient<'static>,
        escrow_vault: MockEscrowVaultClient<'static>,
        escrow_vault_addr: Address,
    }

    fn setup() -> TestEnv {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);

        let xlm_issuer = Address::generate(&env);
        let usdc_issuer = Address::generate(&env);
        let xlm_addr = env.register_stellar_asset_contract_v2(xlm_issuer).address();
        let usdc_addr = env
            .register_stellar_asset_contract_v2(usdc_issuer)
            .address();
        let xlm = TokenClient::new(&env, &xlm_addr);
        let usdc = TokenClient::new(&env, &usdc_addr);
        let xlm_sac = StellarAssetClient::new(&env, &xlm_addr);
        let usdc_sac = StellarAssetClient::new(&env, &usdc_addr);

        let nft_addr = env.register(MockNft, ());
        let nft_init_client = MockNftClient::new(&env, &nft_addr);
        nft_init_client.initialize(&admin);

        let marketplace_addr = env.register(ShimejiMarketplace, ());
        let marketplace = ShimejiMarketplaceClient::new(&env, &marketplace_addr);
        marketplace.initialize(&admin, &nft_addr, &usdc_addr, &xlm_addr);

        let escrow_vault_addr = env.register(MockEscrowVault, ());
        let escrow_vault = MockEscrowVaultClient::new(&env, &escrow_vault_addr);
        escrow_vault.init_vault(&admin);

        TestEnv {
            env,
            marketplace,
            marketplace_addr,
            nft_addr,
            xlm,
            usdc,
            xlm_sac,
            usdc_sac,
            escrow_vault,
            escrow_vault_addr,
        }
    }

    fn mint_nft(t: &TestEnv, owner: &Address) -> u64 {
        let nft_client = MockNftClient::new(&t.env, &t.nft_addr);
        let uri = String::from_str(&t.env, "ipfs://shimeji/1.json");
        nft_client.mint(owner, &uri)
    }

    fn configure_marketplace_trustless_with_mock_vault(t: &TestEnv) {
        t.escrow_vault.set_operator(&t.marketplace_addr);
        t.marketplace.configure_trustless_escrow(
            &t.escrow_vault_addr,
            &t.escrow_vault_addr,
        );
    }

    // ── Listing tests ─────────────────────────────────────────────────────────

    #[test]
    fn test_list_and_buy_xlm() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);

        let token_id = mint_nft(&t, &seller);

        // Seller lists NFT for 1000 XLM
        let listing_id = t.marketplace.list_for_sale(
            &seller,
            &token_id,
            &1000_0000000i128,
            &Currency::Xlm,
        );
        assert_eq!(listing_id, 0);
        assert_eq!(t.marketplace.total_listings(), 1);

        // NFT is now held by marketplace
        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        assert_eq!(nft.owner_of(&token_id), t.marketplace_addr);

        // Fund buyer
        t.xlm_sac.mint(&buyer, &1000_0000000i128);

        // Buyer purchases
        t.marketplace.buy_xlm(&buyer, &listing_id);

        // NFT belongs to buyer, XLM went to seller
        assert_eq!(nft.owner_of(&token_id), buyer);
        assert_eq!(t.xlm.balance(&seller), 1000_0000000i128);
        assert_eq!(t.xlm.balance(&buyer), 0i128);

        // Listing is inactive
        let listing = t.marketplace.get_listing(&listing_id);
        assert!(!listing.active);
    }

    #[test]
    fn test_list_and_buy_usdc() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);

        let token_id = mint_nft(&t, &seller);
        // List for 100 USDC
        let listing_id = t.marketplace.list_for_sale(
            &seller,
            &token_id,
            &100_0000000i128,
            &Currency::Usdc,
        );

        t.usdc_sac.mint(&buyer, &100_0000000i128);
        t.marketplace.buy_usdc(&buyer, &listing_id);

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        assert_eq!(nft.owner_of(&token_id), buyer);
        assert_eq!(t.usdc.balance(&seller), 100_0000000i128);
    }

    #[test]
    fn test_cancel_listing() {
        let t = setup();
        let seller = Address::generate(&t.env);

        let token_id = mint_nft(&t, &seller);
        let listing_id = t.marketplace.list_for_sale(
            &seller,
            &token_id,
            &1000_0000000i128,
            &Currency::Xlm,
        );

        // Cancel listing - NFT returns to seller
        t.marketplace.cancel_listing(&seller, &listing_id);

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        assert_eq!(nft.owner_of(&token_id), seller);

        let listing = t.marketplace.get_listing(&listing_id);
        assert!(!listing.active);
    }

    #[test]
    fn test_list_commission_and_buy_xlm_creates_order() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);

        let token_id = mint_nft(&t, &seller);
        let listing_id = t.marketplace.list_commission_egg(
            &seller,
            &token_id,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        let intention = String::from_str(&t.env, "Please make a pastel bunny with headphones");
        let reference = String::from_str(&t.env, "https://example.com/reference.png");
        let order_id =
            t.marketplace
                .buy_commission_xlm(&buyer, &listing_id, &intention, &reference);

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        assert_eq!(nft.owner_of(&token_id), buyer);
        assert_eq!(t.xlm.balance(&seller), 500_0000000i128);
        assert_eq!(t.xlm.balance(&t.marketplace_addr), 500_0000000i128);
        assert_eq!(t.marketplace.total_commission_orders(), 1);

        let order = t.marketplace.get_commission_order(&order_id);
        assert_eq!(order.buyer, buyer);
        assert_eq!(order.seller, seller);
        assert_eq!(order.listing_id, listing_id);
        assert_eq!(order.token_id, token_id);
        assert_eq!(order.amount_paid, 1000_0000000i128);
        assert_eq!(order.upfront_paid_to_seller, 500_0000000i128);
        assert_eq!(order.escrow_remaining, 500_0000000i128);
        assert_eq!(order.escrow_provider, EscrowProvider::Internal);
        assert_eq!(order.escrow_holder, t.marketplace_addr);
        assert_eq!(order.commission_eta_days, 7u64);
        assert_eq!(order.intention, intention);
        assert_eq!(order.reference_image_url, reference);
        assert_eq!(order.status, CommissionOrderStatus::Accepted);

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        nft.update_token_uri(&token_id, &String::from_str(&t.env, "ipfs://shimeji/final-1.json"));
        t.marketplace.mark_commission_delivered(&seller, &order_id);
        let updated = t.marketplace.get_commission_order(&order_id);
        assert_eq!(updated.status, CommissionOrderStatus::Delivered);

        t.marketplace.approve_commission_delivery(&buyer, &order_id);
        let completed = t.marketplace.get_commission_order(&order_id);
        assert_eq!(completed.status, CommissionOrderStatus::Completed);
        assert_eq!(t.xlm.balance(&seller), 1000_0000000i128);
        assert_eq!(t.xlm.balance(&t.marketplace_addr), 0i128);
    }

    #[test]
    fn test_commission_order_uses_trustless_vault_when_configured() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);
        configure_marketplace_trustless_with_mock_vault(&t);

        let token_id = mint_nft(&t, &seller);
        let listing_id = t.marketplace.list_commission_egg(
            &seller,
            &token_id,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        let order_id = t.marketplace.buy_commission_xlm(
            &buyer,
            &listing_id,
            &String::from_str(&t.env, "Please make a trustless escrow commission"),
            &String::from_str(&t.env, ""),
        );

        let order = t.marketplace.get_commission_order(&order_id);
        assert_eq!(order.escrow_provider, EscrowProvider::TrustlessWork);
        assert_eq!(order.escrow_holder, t.escrow_vault_addr);
        assert_eq!(t.xlm.balance(&seller), 500_0000000i128);
        assert_eq!(t.xlm.balance(&t.marketplace_addr), 0i128);
        assert_eq!(t.xlm.balance(&t.escrow_vault_addr), 500_0000000i128);

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        nft.update_token_uri(
            &token_id,
            &String::from_str(&t.env, "ipfs://shimeji/final-trustless.json"),
        );
        t.marketplace.mark_commission_delivered(&seller, &order_id);
        t.marketplace.approve_commission_delivery(&buyer, &order_id);

        let completed = t.marketplace.get_commission_order(&order_id);
        assert_eq!(completed.status, CommissionOrderStatus::Completed);
        assert_eq!(t.xlm.balance(&seller), 1000_0000000i128);
        assert_eq!(t.xlm.balance(&t.escrow_vault_addr), 0i128);
    }

    #[test]
    #[should_panic(expected = "seller already has an active commission egg listing")]
    fn test_cannot_list_second_active_commission_egg() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let token_a = mint_nft(&t, &seller);
        let token_b = mint_nft(&t, &seller);

        t.marketplace.list_commission_egg(
            &seller,
            &token_a,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );

        t.marketplace.list_commission_egg(
            &seller,
            &token_b,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );
    }

    #[test]
    #[should_panic(expected = "seller has a pending commission order")]
    fn test_cannot_list_new_commission_egg_while_order_pending() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);

        let token_a = mint_nft(&t, &seller);
        let token_b = mint_nft(&t, &seller);

        let listing_id = t.marketplace.list_commission_egg(
            &seller,
            &token_a,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        let intention = String::from_str(&t.env, "Commission me a moon shimeji");
        let reference = String::from_str(&t.env, "");
        t.marketplace
            .buy_commission_xlm(&buyer, &listing_id, &intention, &reference);

        t.marketplace.list_commission_egg(
            &seller,
            &token_b,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );
    }

    #[test]
    fn test_seller_can_refund_commission_order_and_unlock_new_egg_listing() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);

        let token_a = mint_nft(&t, &seller);
        let token_b = mint_nft(&t, &seller);

        let listing_id = t.marketplace.list_commission_egg(
            &seller,
            &token_a,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        let intention = String::from_str(&t.env, "Commission me a cyber fox");
        let reference = String::from_str(&t.env, "");
        let order_id =
            t.marketplace
                .buy_commission_xlm(&buyer, &listing_id, &intention, &reference);

        assert_eq!(t.xlm.balance(&buyer), 0i128);
        assert_eq!(t.xlm.balance(&seller), 500_0000000i128);
        assert_eq!(t.xlm.balance(&t.marketplace_addr), 500_0000000i128);

        t.marketplace.refund_commission_order(&seller, &order_id);
        let refunded = t.marketplace.get_commission_order(&order_id);
        assert_eq!(refunded.status, CommissionOrderStatus::Refunded);
        assert_eq!(t.xlm.balance(&buyer), 500_0000000i128);
        assert_eq!(t.xlm.balance(&t.marketplace_addr), 0i128);

        let relist_id = t.marketplace.list_commission_egg(
            &seller,
            &token_b,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );
        assert_eq!(relist_id, 1u64);
    }

    #[test]
    fn test_seller_can_claim_commission_timeout_after_7_days() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);

        let token_id = mint_nft(&t, &seller);
        let listing_id = t.marketplace.list_commission_egg(
            &seller,
            &token_id,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        t.env.ledger().set_timestamp(100);

        let order_id = t.marketplace.buy_commission_xlm(
            &buyer,
            &listing_id,
            &String::from_str(&t.env, "Need a blue dragon shimeji"),
            &String::from_str(&t.env, ""),
        );

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        nft.update_token_uri(&token_id, &String::from_str(&t.env, "ipfs://shimeji/final-timeout.json"));
        t.marketplace.mark_commission_delivered(&seller, &order_id);

        let delivered = t.marketplace.get_commission_order(&order_id);
        t.env
            .ledger()
            .set_timestamp(delivered.delivered_at + COMMISSION_AUTO_RELEASE_AFTER_DELIVERY_SECS);

        t.marketplace.claim_commission_timeout(&seller, &order_id);

        let completed = t.marketplace.get_commission_order(&order_id);
        assert_eq!(completed.status, CommissionOrderStatus::Completed);
        assert_eq!(completed.escrow_remaining, 0i128);
        assert_eq!(t.xlm.balance(&seller), 1000_0000000i128);
        assert_eq!(t.xlm.balance(&t.marketplace_addr), 0i128);
    }

    #[test]
    #[should_panic(expected = "use buy_commission_xlm for commission listings")]
    fn test_regular_buy_rejects_commission_listing() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);

        let token_id = mint_nft(&t, &seller);
        let listing_id = t.marketplace.list_commission_egg(
            &seller,
            &token_id,
            &1000_0000000i128,
            &Currency::Xlm,
            &7u64,
        );

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        t.marketplace.buy_xlm(&buyer, &listing_id);
    }

    #[test]
    fn test_open_swap_listing_happy_path() {
        let t = setup();
        let alice = Address::generate(&t.env);
        let bob = Address::generate(&t.env);

        let alice_token = mint_nft(&t, &alice);
        let bob_token = mint_nft(&t, &bob);

        let listing_id = t.marketplace.create_swap_listing(
            &alice,
            &alice_token,
            &String::from_str(&t.env, "Busco algo kawaii neon"),
        );
        let bid_id = t
            .marketplace
            .place_swap_bid(&bob, &listing_id, &bob_token);

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        assert_eq!(nft.owner_of(&alice_token), t.marketplace_addr);
        assert_eq!(nft.owner_of(&bob_token), t.marketplace_addr);

        t.marketplace.accept_swap_bid(&alice, &listing_id, &bid_id);

        assert_eq!(nft.owner_of(&alice_token), bob);
        assert_eq!(nft.owner_of(&bob_token), alice);
        assert!(!t.marketplace.get_swap_listing(&listing_id).active);
        assert!(!t.marketplace.get_swap_bid(&bid_id).active);
    }

    #[test]
    fn test_cancel_swap_listing_refunds_bids() {
        let t = setup();
        let alice = Address::generate(&t.env);
        let bob = Address::generate(&t.env);
        let carol = Address::generate(&t.env);

        let alice_token = mint_nft(&t, &alice);
        let bob_token = mint_nft(&t, &bob);
        let carol_token = mint_nft(&t, &carol);

        let listing_id = t.marketplace.create_swap_listing(
            &alice,
            &alice_token,
            &String::from_str(&t.env, "Abierto a propuestas"),
        );
        let bob_bid = t.marketplace.place_swap_bid(&bob, &listing_id, &bob_token);
        let carol_bid = t.marketplace.place_swap_bid(&carol, &listing_id, &carol_token);

        t.marketplace.cancel_swap_listing(&alice, &listing_id);

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        assert_eq!(nft.owner_of(&alice_token), alice);
        assert_eq!(nft.owner_of(&bob_token), bob);
        assert_eq!(nft.owner_of(&carol_token), carol);
        assert!(!t.marketplace.get_swap_listing(&listing_id).active);
        assert!(!t.marketplace.get_swap_bid(&bob_bid).active);
        assert!(!t.marketplace.get_swap_bid(&carol_bid).active);
    }

    // ── Error cases ───────────────────────────────────────────────────────────

    #[test]
    #[should_panic(expected = "listing is not active")]
    fn test_buy_inactive_listing() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);

        let token_id = mint_nft(&t, &seller);
        let listing_id = t.marketplace.list_for_sale(
            &seller,
            &token_id,
            &1000_0000000i128,
            &Currency::Xlm,
        );
        t.marketplace.cancel_listing(&seller, &listing_id);

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        t.marketplace.buy_xlm(&buyer, &listing_id);
    }

    #[test]
    #[should_panic(expected = "intention cannot be empty")]
    fn test_open_swap_listing_requires_intention() {
        let t = setup();
        let alice = Address::generate(&t.env);
        let alice_token = mint_nft(&t, &alice);
        t.marketplace
            .create_swap_listing(&alice, &alice_token, &String::from_str(&t.env, ""));
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize() {
        let t = setup();
        let admin = Address::generate(&t.env);
        let nft = Address::generate(&t.env);
        let usdc = Address::generate(&t.env);
        let xlm = Address::generate(&t.env);
        t.marketplace.initialize(&admin, &nft, &usdc, &xlm);
    }
}
