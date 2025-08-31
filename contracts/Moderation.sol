// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Moderation manager for DojoNews
/// @notice Allows the sysop to appoint moderators who can ban users and
/// blacklist posts. Moderators and the sysop can undo their actions.
contract Moderation {
    address public sysop;

    mapping(address => bool) private mods;
    mapping(address => bool) private banned;
    mapping(uint256 => bool) private postBlacklist;

    event SysopTransferred(address indexed previousSysop, address indexed newSysop);
    event ModeratorAdded(address indexed moderator);
    event ModeratorRemoved(address indexed moderator);
    event AddressBanned(address indexed user);
    event AddressUnbanned(address indexed user);
    event PostBlacklisted(uint256 indexed postId);
    event PostUnblacklisted(uint256 indexed postId);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    modifier onlyModerator() {
        require(isModerator(msg.sender), "only moderator");
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

    function addModerator(address moderator) external onlySysop {
        require(moderator != address(0), "bad mod");
        mods[moderator] = true;
        emit ModeratorAdded(moderator);
    }

    function removeModerator(address moderator) external onlySysop {
        delete mods[moderator];
        emit ModeratorRemoved(moderator);
    }

    function isModerator(address account) public view returns (bool) {
        return account == sysop || mods[account];
    }

    function banAddress(address user) external onlyModerator {
        banned[user] = true;
        emit AddressBanned(user);
    }

    function unbanAddress(address user) external onlyModerator {
        delete banned[user];
        emit AddressUnbanned(user);
    }

    function isBanned(address user) external view returns (bool) {
        return banned[user];
    }

    function blacklistPost(uint256 postId) external onlyModerator {
        postBlacklist[postId] = true;
        emit PostBlacklisted(postId);
    }

    function unblacklistPost(uint256 postId) external onlyModerator {
        delete postBlacklist[postId];
        emit PostUnblacklisted(postId);
    }

    function isPostBlacklisted(uint256 postId) external view returns (bool) {
        return postBlacklist[postId];
    }
}

