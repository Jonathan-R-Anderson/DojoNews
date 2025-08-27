// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FlaskBlogPortal
/// @notice Stores user accounts, membership tiers, sponsor slots and tip jars on-chain.
contract FlaskBlogPortal {
    enum Tier { Free, Premium, Pro }

    struct User {
        Tier tier;
        uint256 freeViewsUsed;
    }

    struct SponsorSlot {
        address sponsor;
        uint256 impressions;
        uint256 maxImpressions;
    }

    address public sysop;
    uint256 public nextSponsorSlot;
    uint256 public sysopTipBps; // tip commission for sysop in basis points (1/100 of a percent)

    mapping(address => User) public users;
    mapping(uint256 => SponsorSlot) public sponsorSlots;
    mapping(bytes32 => uint256) public tips; // author+post id => total tips
    mapping(Tier => uint256) public freeQuota;
    mapping(string => string) public imageMagnets; // static file id => magnet URI

    event UserRegistered(address indexed user, Tier tier);
    event TierChanged(address indexed user, Tier tier);
    event ViewRecorded(address indexed user, uint256 viewsUsed);
    event TipsSent(address indexed from, address indexed to, bytes32 indexed postId, uint256 amount, uint256 sysopFee);
    event SponsorSlotCreated(uint256 indexed slotId, uint256 maxImpressions);
    event SponsorSlotPurchased(uint256 indexed slotId, address indexed sponsor);
    event ImpressionRecorded(uint256 indexed slotId, uint256 impressions);
    event ImageMagnetSet(string indexed imageId, string magnetURI);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    constructor() {
        sysop = msg.sender;
        freeQuota[Tier.Free] = 3; // default: 3 free views/month
        freeQuota[Tier.Premium] = 10;
        freeQuota[Tier.Pro] = type(uint256).max; // unlimited
        sysopTipBps = 0; // default: no commission
    }

    /// @notice Sets the percentage of each tip that goes to the sysop (in basis points).
    function setSysopTipBps(uint256 bps) external onlySysop {
        require(bps <= 10_000, "bps too high");
        sysopTipBps = bps;
    }

    function registerUser(address user, Tier tier) external onlySysop {
        users[user] = User(tier, 0);
        emit UserRegistered(user, tier);
    }

    function setTier(address user, Tier tier) external onlySysop {
        users[user].tier = tier;
        emit TierChanged(user, tier);
    }

    /// @notice Records a view for paywall metering. Returns true if the user still has free views left.
    function recordView(address user) external onlySysop returns (bool allowed) {
        User storage u = users[user];
        u.freeViewsUsed += 1;
        emit ViewRecorded(user, u.freeViewsUsed);
        return u.freeViewsUsed <= freeQuota[u.tier];
    }

    function resetViews(address user) external onlySysop {
        users[user].freeViewsUsed = 0;
    }

    /// @notice Tip an author for a specific post. A portion goes to the sysop.
    /// @param author Recipient address.
    /// @param postId Arbitrary identifier for the post.
    function tip(address author, bytes32 postId) external payable {
        require(msg.value > 0, "no value");
        uint256 fee = (msg.value * sysopTipBps) / 10_000;
        uint256 payout = msg.value - fee;
        if (fee > 0) {
            (bool feeSent, ) = sysop.call{value: fee}("");
            require(feeSent, "fee failed");
        }
        (bool sent, ) = author.call{value: payout}("");
        require(sent, "tip failed");
        tips[keccak256(abi.encodePacked(author, postId))] += payout;
        emit TipsSent(msg.sender, author, postId, payout, fee);
    }

    /// @notice Creates a new sponsor slot available for purchase.
    function createSponsorSlot(uint256 maxImpressions) external onlySysop returns (uint256 slotId) {
        slotId = nextSponsorSlot++;
        sponsorSlots[slotId] = SponsorSlot({sponsor: address(0), impressions: 0, maxImpressions: maxImpressions});
        emit SponsorSlotCreated(slotId, maxImpressions);
    }

    /// @notice Purchase a sponsor slot. Payment handled off-chain.
    function buySponsorSlot(uint256 slotId) external {
        SponsorSlot storage slot = sponsorSlots[slotId];
        require(slot.sponsor == address(0), "taken");
        slot.sponsor = msg.sender;
        emit SponsorSlotPurchased(slotId, msg.sender);
    }

    /// @notice Records an impression for a sponsor slot. Resets when max is reached.
    function recordImpression(uint256 slotId) external onlySysop {
        SponsorSlot storage slot = sponsorSlots[slotId];
        require(slot.sponsor != address(0), "no sponsor");
        slot.impressions += 1;
        emit ImpressionRecorded(slotId, slot.impressions);
        if (slot.impressions >= slot.maxImpressions) {
            slot.sponsor = address(0);
            slot.impressions = 0;
        }
    }

    /// @notice Store the magnet URI for a static file.
    /// @param imageId Identifier of the image (e.g. filename).
    /// @param magnetURI Magnet link pointing to the file's torrent.
    function setImageMagnet(string calldata imageId, string calldata magnetURI) external onlySysop {
        imageMagnets[imageId] = magnetURI;
        emit ImageMagnetSet(imageId, magnetURI);
    }

    /// @notice Fetch the magnet URI for a static file.
    function getImageMagnet(string calldata imageId) external view returns (string memory) {
        return imageMagnets[imageId];
    }
}
