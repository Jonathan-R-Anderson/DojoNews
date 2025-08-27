// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SponsorSlots
/// @notice Manages on-chain sponsor ad slots with frequency capping.
contract SponsorSlots {
    address public sysop;

    struct Slot {
        address sponsor;
        uint256 impressions;
        uint256 maxImpressions;
    }

    uint256 public nextSlotId;
    mapping(uint256 => Slot) public slots;

    event SlotCreated(uint256 indexed slotId, uint256 maxImpressions);
    event SlotPurchased(uint256 indexed slotId, address indexed sponsor);
    event ImpressionRecorded(uint256 indexed slotId, uint256 impressions);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    constructor() {
        sysop = msg.sender;
    }

    function createSlot(uint256 maxImpressions) external onlySysop returns (uint256 slotId) {
        slotId = nextSlotId++;
        slots[slotId] = Slot(address(0), 0, maxImpressions);
        emit SlotCreated(slotId, maxImpressions);
    }

    function buySlot(uint256 slotId) external {
        Slot storage slot = slots[slotId];
        require(slot.sponsor == address(0), "taken");
        slot.sponsor = msg.sender;
        emit SlotPurchased(slotId, msg.sender);
    }

    function recordImpression(uint256 slotId) external onlySysop {
        Slot storage slot = slots[slotId];
        require(slot.sponsor != address(0), "no sponsor");
        slot.impressions += 1;
        emit ImpressionRecorded(slotId, slot.impressions);
        if (slot.impressions >= slot.maxImpressions) {
            slot.sponsor = address(0);
            slot.impressions = 0;
        }
    }
}

