// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SponsorSlots
/// @notice Manages on-chain sponsor ad slots with frequency capping.
contract SponsorSlots {
    address public sysop;
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);

    struct Slot {
        address sponsor;
        uint256 impressions;
        uint256 maxImpressions;
        string company;
        string[] banners;
        uint256 nextBanner;
    }

    uint256 public nextSlotId;
    mapping(uint256 => Slot) public slots;

    event SlotCreated(uint256 indexed slotId, uint256 maxImpressions);
    event SlotPurchased(uint256 indexed slotId, address indexed sponsor);
    event ImpressionRecorded(uint256 indexed slotId, uint256 impressions);
    event BannersUploaded(uint256 indexed slotId, string company, uint256 bannerCount);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    constructor() {
        sysop = msg.sender;
    }

    function transferSysop(address newSysop) external onlySysop {
        require(newSysop != address(0), "bad sysop");
        emit SysopTransferred(sysop, newSysop);
        sysop = newSysop;
    }

    function createSlot(uint256 maxImpressions) external onlySysop returns (uint256 slotId) {
        slotId = nextSlotId++;
        slots[slotId].maxImpressions = maxImpressions;
        emit SlotCreated(slotId, maxImpressions);
    }

    function buySlot(uint256 slotId) external {
        Slot storage slot = slots[slotId];
        require(slot.sponsor == address(0), "taken");
        slot.sponsor = msg.sender;
        emit SlotPurchased(slotId, msg.sender);
    }

    function uploadBanners(
        uint256 slotId,
        string calldata company,
        string[] calldata newBanners
    ) external {
        Slot storage slot = slots[slotId];
        require(slot.sponsor == msg.sender, "not sponsor");
        slot.company = company;
        delete slot.banners;
        for (uint256 i = 0; i < newBanners.length; i++) {
            slot.banners.push(newBanners[i]);
        }
        slot.nextBanner = 0;
        emit BannersUploaded(slotId, company, newBanners.length);
    }

    uint256 public impressionPrice = 0.01 ether;

    function setImpressionPrice(uint256 price) external onlySysop {
        impressionPrice = price;
    }

    function fetchAd(uint256 slotId) external payable returns (string memory banner) {
        require(msg.value == impressionPrice, "fee");
        Slot storage slot = slots[slotId];
        require(slot.sponsor != address(0), "no sponsor");
        require(slot.banners.length > 0, "no banners");
        payable(sysop).transfer(msg.value);
        slot.impressions += 1;
        emit ImpressionRecorded(slotId, slot.impressions);
        banner = slot.banners[slot.nextBanner % slot.banners.length];
        slot.nextBanner = (slot.nextBanner + 1) % slot.banners.length;
        if (slot.impressions >= slot.maxImpressions) {
            slot.sponsor = address(0);
            slot.impressions = 0;
            slot.company = "";
            delete slot.banners;
            slot.nextBanner = 0;
        }
    }
}

