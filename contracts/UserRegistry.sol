// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title UserRegistry
/// @notice Registers users and manages membership tiers for the blog.
contract UserRegistry {
    enum Tier { Free, Premium, Pro }

    struct User {
        Tier tier;
        uint256 freeViewsUsed;
    }

    address public sysop;
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);
    mapping(address => User) public users;
    mapping(Tier => uint256) public freeQuota;

    event UserRegistered(address indexed user, Tier tier);
    event TierChanged(address indexed user, Tier tier);
    event ViewRecorded(address indexed user, uint256 viewsUsed);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    constructor() {
        sysop = msg.sender;
        freeQuota[Tier.Free] = 3;
        freeQuota[Tier.Premium] = 10;
        freeQuota[Tier.Pro] = type(uint256).max;
    }

    function transferSysop(address newSysop) external onlySysop {
        require(newSysop != address(0), "bad sysop");
        emit SysopTransferred(sysop, newSysop);
        sysop = newSysop;
    }

    function register(address user, Tier tier) external onlySysop {
        users[user] = User(tier, 0);
        emit UserRegistered(user, tier);
    }

    function setTier(address user, Tier tier) external onlySysop {
        users[user].tier = tier;
        emit TierChanged(user, tier);
    }

    /// @notice Records a view for paywall metering.
    /// @return allowed True if the user still has free views left.
    function recordView(address user) external onlySysop returns (bool allowed) {
        User storage u = users[user];
        u.freeViewsUsed += 1;
        emit ViewRecorded(user, u.freeViewsUsed);
        return u.freeViewsUsed <= freeQuota[u.tier];
    }

    function resetViews(address user) external onlySysop {
        users[user].freeViewsUsed = 0;
    }
}

