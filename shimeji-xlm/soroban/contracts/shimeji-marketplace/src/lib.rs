#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, IntoVal, String, Symbol};

const MAX_SWAP_INTENTION_LEN: u32 = 280;
const MAX_COMMISSION_INTENTION_LEN: u32 = 500;
const MAX_REFERENCE_IMAGE_URL_LEN: u32 = 512;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Currency {
    Xlm,
    Usdc,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ListingInfo {
    pub seller: Address,
    pub token_id: u64,
    pub price_xlm: i128,
    pub price_usdc: i128,
    pub xlm_usdc_rate: i128,
    pub is_commission_egg: bool,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct SwapOffer {
    pub offerer: Address,
    pub offered_token_id: u64,
    pub desired_token_id: u64,
    pub intention: String,
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
    pub intention: String,
    pub reference_image_url: String,
    pub fulfilled: bool,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    NftContract,
    UsdcToken,
    XlmToken,
    NextListingId,
    NextSwapId,
    NextCommissionOrderId,
    Listing(u64),
    SwapOffer(u64),
    CommissionOrder(u64),
}

#[contract]
pub struct ShimejiMarketplace;

impl ShimejiMarketplace {
    fn nft_contract(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::NftContract).unwrap()
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

    fn create_commission_order_record(
        env: &Env,
        listing_id: u64,
        listing: &ListingInfo,
        buyer: Address,
        currency: Currency,
        amount_paid: i128,
        intention: String,
        reference_image_url: String,
    ) -> u64 {
        let order_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextCommissionOrderId)
            .unwrap();

        let order = CommissionOrder {
            buyer,
            seller: listing.seller.clone(),
            listing_id,
            token_id: listing.token_id,
            currency,
            amount_paid,
            intention,
            reference_image_url,
            fulfilled: false,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::CommissionOrder(order_id), &order);
        env.storage()
            .instance()
            .set(&DataKey::NextCommissionOrderId, &(order_id + 1));

        order_id
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
        env.storage().instance().set(&DataKey::NftContract, &nft_contract);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage().instance().set(&DataKey::NextListingId, &0u64);
        env.storage().instance().set(&DataKey::NextSwapId, &0u64);
        env.storage()
            .instance()
            .set(&DataKey::NextCommissionOrderId, &0u64);
    }

    // ── Fixed-price listings ────────────────────────────────────────────────

    pub fn list_for_sale(
        env: Env,
        seller: Address,
        token_id: u64,
        price_xlm: i128,
        price_usdc: i128,
        xlm_usdc_rate: i128,
    ) -> u64 {
        seller.require_auth();

        if price_xlm <= 0 {
            panic!("price_xlm must be positive");
        }
        if price_usdc <= 0 {
            panic!("price_usdc must be positive");
        }

        // Take custody of NFT from seller
        Self::nft_transfer(&env, seller.clone(), env.current_contract_address(), token_id);

        let listing_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextListingId)
            .unwrap();

        let listing = ListingInfo {
            seller,
            token_id,
            price_xlm,
            price_usdc,
            xlm_usdc_rate,
            is_commission_egg: false,
            active: true,
        };

        env.storage().persistent().set(&DataKey::Listing(listing_id), &listing);
        env.storage()
            .instance()
            .set(&DataKey::NextListingId, &(listing_id + 1));

        listing_id
    }

    pub fn list_commission_egg(
        env: Env,
        seller: Address,
        token_id: u64,
        price_xlm: i128,
        price_usdc: i128,
        xlm_usdc_rate: i128,
    ) -> u64 {
        seller.require_auth();

        if price_xlm <= 0 {
            panic!("price_xlm must be positive");
        }
        if price_usdc <= 0 {
            panic!("price_usdc must be positive");
        }

        Self::nft_transfer(&env, seller.clone(), env.current_contract_address(), token_id);

        let listing_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextListingId)
            .unwrap();

        let listing = ListingInfo {
            seller,
            token_id,
            price_xlm,
            price_usdc,
            xlm_usdc_rate,
            is_commission_egg: true,
            active: true,
        };

        env.storage().persistent().set(&DataKey::Listing(listing_id), &listing);
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

        // Transfer XLM payment from buyer to seller
        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&buyer, &listing.seller, &listing.price_xlm);

        // Transfer NFT from marketplace to buyer
        Self::nft_transfer(&env, env.current_contract_address(), buyer, listing.token_id);

        listing.active = false;
        env.storage().persistent().set(&DataKey::Listing(listing_id), &listing);
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

        // Transfer USDC payment from buyer to seller
        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc_token);
        token_client.transfer(&buyer, &listing.seller, &listing.price_usdc);

        // Transfer NFT from marketplace to buyer
        Self::nft_transfer(&env, env.current_contract_address(), buyer, listing.token_id);

        listing.active = false;
        env.storage().persistent().set(&DataKey::Listing(listing_id), &listing);
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

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&buyer, &listing.seller, &listing.price_xlm);

        Self::nft_transfer(&env, env.current_contract_address(), buyer.clone(), listing.token_id);

        let order_id = Self::create_commission_order_record(
            &env,
            listing_id,
            &listing,
            buyer,
            Currency::Xlm,
            listing.price_xlm,
            intention,
            reference_image_url,
        );

        listing.active = false;
        env.storage().persistent().set(&DataKey::Listing(listing_id), &listing);

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

        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc_token);
        token_client.transfer(&buyer, &listing.seller, &listing.price_usdc);

        Self::nft_transfer(&env, env.current_contract_address(), buyer.clone(), listing.token_id);

        let order_id = Self::create_commission_order_record(
            &env,
            listing_id,
            &listing,
            buyer,
            Currency::Usdc,
            listing.price_usdc,
            intention,
            reference_image_url,
        );

        listing.active = false;
        env.storage().persistent().set(&DataKey::Listing(listing_id), &listing);

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
        Self::nft_transfer(&env, env.current_contract_address(), seller, listing.token_id);

        listing.active = false;
        env.storage().persistent().set(&DataKey::Listing(listing_id), &listing);
    }

    pub fn mark_commission_fulfilled(env: Env, seller: Address, order_id: u64) {
        seller.require_auth();

        let mut order: CommissionOrder = env
            .storage()
            .persistent()
            .get(&DataKey::CommissionOrder(order_id))
            .unwrap_or_else(|| panic!("commission order does not exist"));

        if order.seller != seller {
            panic!("only seller can mark commission fulfilled");
        }
        if order.fulfilled {
            panic!("commission already fulfilled");
        }

        order.fulfilled = true;
        env.storage()
            .persistent()
            .set(&DataKey::CommissionOrder(order_id), &order);
    }

    // ── Swap offers ─────────────────────────────────────────────────────────

    pub fn create_swap_offer(
        env: Env,
        offerer: Address,
        offered_token_id: u64,
        desired_token_id: u64,
        intention: String,
    ) -> u64 {
        offerer.require_auth();

        if offered_token_id == desired_token_id {
            panic!("cannot swap a token with itself");
        }

        Self::validate_swap_intention(&intention);

        // Take custody of offered NFT
        Self::nft_transfer(&env, offerer.clone(), env.current_contract_address(), offered_token_id);

        let swap_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextSwapId)
            .unwrap();

        let offer = SwapOffer {
            offerer,
            offered_token_id,
            desired_token_id,
            intention,
            active: true,
        };

        env.storage().persistent().set(&DataKey::SwapOffer(swap_id), &offer);
        env.storage()
            .instance()
            .set(&DataKey::NextSwapId, &(swap_id + 1));

        swap_id
    }

    pub fn accept_swap(env: Env, acceptor: Address, swap_id: u64) {
        acceptor.require_auth();

        let mut offer: SwapOffer = env
            .storage()
            .persistent()
            .get(&DataKey::SwapOffer(swap_id))
            .unwrap_or_else(|| panic!("swap offer does not exist"));

        if !offer.active {
            panic!("swap offer is not active");
        }

        // Take custody of desired NFT from acceptor
        Self::nft_transfer(&env, acceptor.clone(), env.current_contract_address(), offer.desired_token_id);

        // Transfer offered NFT to acceptor
        Self::nft_transfer(&env, env.current_contract_address(), acceptor, offer.offered_token_id);

        // Transfer desired NFT to offerer
        Self::nft_transfer(&env, env.current_contract_address(), offer.offerer.clone(), offer.desired_token_id);

        offer.active = false;
        env.storage().persistent().set(&DataKey::SwapOffer(swap_id), &offer);
    }

    pub fn cancel_swap(env: Env, offerer: Address, swap_id: u64) {
        offerer.require_auth();

        let mut offer: SwapOffer = env
            .storage()
            .persistent()
            .get(&DataKey::SwapOffer(swap_id))
            .unwrap_or_else(|| panic!("swap offer does not exist"));

        if offer.offerer != offerer {
            panic!("only the offerer can cancel this swap");
        }
        if !offer.active {
            panic!("swap offer is not active");
        }

        // Return offered NFT to offerer
        Self::nft_transfer(&env, env.current_contract_address(), offerer, offer.offered_token_id);

        offer.active = false;
        env.storage().persistent().set(&DataKey::SwapOffer(swap_id), &offer);
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    pub fn get_listing(env: Env, listing_id: u64) -> ListingInfo {
        env.storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .unwrap_or_else(|| panic!("listing does not exist"))
    }

    pub fn get_swap_offer(env: Env, swap_id: u64) -> SwapOffer {
        env.storage()
            .persistent()
            .get(&DataKey::SwapOffer(swap_id))
            .unwrap_or_else(|| panic!("swap offer does not exist"))
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

    pub fn total_swaps(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextSwapId)
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
        testutils::Address as _,
        token::{StellarAssetClient, TokenClient},
        Env, String,
    };

    // ── Mock NFT ─────────────────────────────────────────────────────────────

    #[contract]
    struct MockNft;

    #[contractimpl]
    impl MockNft {
        pub fn initialize(env: Env, admin: Address) {
            env.storage().instance().set(&soroban_sdk::symbol_short!("admin"), &admin);
            env.storage().instance().set(&soroban_sdk::symbol_short!("next"), &0u64);
        }

        pub fn mint(env: Env, to: Address, _token_uri: String) -> u64 {
            let id: u64 = env.storage().instance().get(&soroban_sdk::symbol_short!("next")).unwrap_or(0);
            env.storage().persistent().set(&id, &to);
            env.storage().instance().set(&soroban_sdk::symbol_short!("next"), &(id + 1));
            id
        }

        pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) {
            from.require_auth();
            let owner: Address = env.storage().persistent().get(&token_id).unwrap();
            if owner != from {
                panic!("not the owner");
            }
            env.storage().persistent().set(&token_id, &to);
        }

        pub fn owner_of(env: Env, token_id: u64) -> Address {
            env.storage().persistent().get(&token_id).unwrap()
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

        let nft_addr = env.register(MockNft, ());
        let nft_init_client = MockNftClient::new(&env, &nft_addr);
        nft_init_client.initialize(&admin);

        let marketplace_addr = env.register(ShimejiMarketplace, ());
        let marketplace = ShimejiMarketplaceClient::new(&env, &marketplace_addr);
        marketplace.initialize(&admin, &nft_addr, &usdc_addr, &xlm_addr);

        TestEnv { env, marketplace, marketplace_addr, nft_addr, xlm, usdc, xlm_sac, usdc_sac }
    }

    fn mint_nft(t: &TestEnv, owner: &Address) -> u64 {
        let nft_client = MockNftClient::new(&t.env, &t.nft_addr);
        let uri = String::from_str(&t.env, "ipfs://shimeji/1.json");
        nft_client.mint(owner, &uri)
    }

    // ── Listing tests ─────────────────────────────────────────────────────────

    #[test]
    fn test_list_and_buy_xlm() {
        let t = setup();
        let seller = Address::generate(&t.env);
        let buyer = Address::generate(&t.env);

        let token_id = mint_nft(&t, &seller);

        // Seller lists NFT
        let listing_id = t.marketplace.list_for_sale(
            &seller,
            &token_id,
            &1000_0000000i128,
            &100_0000000i128,
            &1000000i128,
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
        let listing_id = t.marketplace.list_for_sale(
            &seller,
            &token_id,
            &1000_0000000i128,
            &100_0000000i128,
            &1000000i128,
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
            &100_0000000i128,
            &1000000i128,
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
            &100_0000000i128,
            &1000000i128,
        );

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        let intention = String::from_str(&t.env, "Please make a pastel bunny with headphones");
        let reference = String::from_str(&t.env, "https://example.com/reference.png");
        let order_id = t
            .marketplace
            .buy_commission_xlm(&buyer, &listing_id, &intention, &reference);

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        assert_eq!(nft.owner_of(&token_id), buyer);
        assert_eq!(t.xlm.balance(&seller), 1000_0000000i128);
        assert_eq!(t.marketplace.total_commission_orders(), 1);

        let order = t.marketplace.get_commission_order(&order_id);
        assert_eq!(order.buyer, buyer);
        assert_eq!(order.seller, seller);
        assert_eq!(order.listing_id, listing_id);
        assert_eq!(order.token_id, token_id);
        assert_eq!(order.amount_paid, 1000_0000000i128);
        assert_eq!(order.intention, intention);
        assert_eq!(order.reference_image_url, reference);
        assert!(!order.fulfilled);

        t.marketplace.mark_commission_fulfilled(&seller, &order_id);
        let updated = t.marketplace.get_commission_order(&order_id);
        assert!(updated.fulfilled);
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
            &100_0000000i128,
            &1000000i128,
        );

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        t.marketplace.buy_xlm(&buyer, &listing_id);
    }

    // ── Swap tests ────────────────────────────────────────────────────────────

    #[test]
    fn test_swap_happy_path() {
        let t = setup();
        let alice = Address::generate(&t.env);
        let bob = Address::generate(&t.env);

        let alice_token = mint_nft(&t, &alice);
        let bob_token = mint_nft(&t, &bob);

        // Alice offers to swap her token for Bob's
        let intention = String::from_str(&t.env, "I love Bob's shimeji design!");
        let swap_id = t.marketplace.create_swap_offer(&alice, &alice_token, &bob_token, &intention);
        assert_eq!(swap_id, 0);
        assert_eq!(t.marketplace.total_swaps(), 1);

        // Alice's NFT is held by marketplace
        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        assert_eq!(nft.owner_of(&alice_token), t.marketplace_addr);

        // Bob accepts the swap
        t.marketplace.accept_swap(&bob, &swap_id);

        // Tokens are swapped
        assert_eq!(nft.owner_of(&alice_token), bob);
        assert_eq!(nft.owner_of(&bob_token), alice);
    }

    #[test]
    fn test_cancel_swap() {
        let t = setup();
        let alice = Address::generate(&t.env);
        let bob = Address::generate(&t.env);

        let alice_token = mint_nft(&t, &alice);
        let bob_token = mint_nft(&t, &bob);

        let intention = String::from_str(&t.env, "Trading for the rare dragon skin");
        let swap_id = t.marketplace.create_swap_offer(&alice, &alice_token, &bob_token, &intention);

        // Alice cancels - her NFT is returned
        t.marketplace.cancel_swap(&alice, &swap_id);

        let nft = MockNftClient::new(&t.env, &t.nft_addr);
        assert_eq!(nft.owner_of(&alice_token), alice);

        let offer = t.marketplace.get_swap_offer(&swap_id);
        assert!(!offer.active);
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
            &100_0000000i128,
            &1000000i128,
        );
        t.marketplace.cancel_listing(&seller, &listing_id);

        t.xlm_sac.mint(&buyer, &1000_0000000i128);
        t.marketplace.buy_xlm(&buyer, &listing_id);
    }

    #[test]
    #[should_panic(expected = "swap offer is not active")]
    fn test_accept_cancelled_swap() {
        let t = setup();
        let alice = Address::generate(&t.env);
        let bob = Address::generate(&t.env);

        let alice_token = mint_nft(&t, &alice);
        let bob_token = mint_nft(&t, &bob);

        let intention = String::from_str(&t.env, "Testing cancelled swap");
        let swap_id = t.marketplace.create_swap_offer(&alice, &alice_token, &bob_token, &intention);
        t.marketplace.cancel_swap(&alice, &swap_id);
        t.marketplace.accept_swap(&bob, &swap_id);
    }

    #[test]
    #[should_panic(expected = "cannot swap a token with itself")]
    fn test_swap_same_token() {
        let t = setup();
        let alice = Address::generate(&t.env);
        let token_id = mint_nft(&t, &alice);
        let intention = String::from_str(&t.env, "Self swap attempt");
        t.marketplace.create_swap_offer(&alice, &token_id, &token_id, &intention);
    }

    #[test]
    #[should_panic(expected = "intention cannot be empty")]
    fn test_swap_requires_intention() {
        let t = setup();
        let alice = Address::generate(&t.env);
        let bob = Address::generate(&t.env);
        let alice_token = mint_nft(&t, &alice);
        let bob_token = mint_nft(&t, &bob);
        let empty = String::from_str(&t.env, "");
        t.marketplace
            .create_swap_offer(&alice, &alice_token, &bob_token, &empty);
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
