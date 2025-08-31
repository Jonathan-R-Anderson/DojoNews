// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CommentStorage
/// @notice Stores comments associated with posts.
interface IModeration {
    function isBanned(address user) external view returns (bool);
    function isModerator(address account) external view returns (bool);
    function isPostBlacklisted(uint256 postId) external view returns (bool);
}

contract CommentStorage {
    address public sysop;
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);
    IModeration public moderationContract;

    struct Comment {
        address author;
        uint256 postId;
        string content;
        bool exists;
        bool blacklisted;
    }

    uint256 public nextCommentId;
    mapping(uint256 => Comment) public comments;

    event CommentAdded(uint256 indexed commentId, uint256 indexed postId, address indexed author, string content);
    event CommentDeleted(uint256 indexed commentId);
    event CommentBlacklistUpdated(uint256 indexed commentId, bool isBlacklisted);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    modifier onlyModerator() {
        require(moderationContract.isModerator(msg.sender), "only moderator");
        _;
    }

    constructor(address moderationAddress) {
        sysop = msg.sender;
        moderationContract = IModeration(moderationAddress);
    }

    function transferSysop(address newSysop) external onlySysop {
        require(newSysop != address(0), "bad sysop");
        emit SysopTransferred(sysop, newSysop);
        sysop = newSysop;
    }

    function addComment(uint256 postId, string calldata content) external returns (uint256 commentId) {
        require(!moderationContract.isBanned(msg.sender), "banned");
        require(!moderationContract.isPostBlacklisted(postId), "post blacklisted");
        commentId = nextCommentId++;
        comments[commentId] = Comment(msg.sender, postId, content, true, false);
        emit CommentAdded(commentId, postId, msg.sender, content);
    }

    function deleteComment(uint256 commentId) external {
        Comment storage c = comments[commentId];
        require(c.exists, "no comment");
        require(c.author == msg.sender || msg.sender == sysop, "not authorized");
        delete comments[commentId];
        emit CommentDeleted(commentId);
    }

    function setBlacklist(uint256 commentId, bool isBlacklisted) external onlyModerator {
        Comment storage c = comments[commentId];
        require(c.exists, "no comment");
        c.blacklisted = isBlacklisted;
        emit CommentBlacklistUpdated(commentId, isBlacklisted);
    }

    function getComment(uint256 commentId) external view returns (Comment memory) {
        Comment memory c = comments[commentId];
        require(c.exists, "no comment");
        return c;
    }
}

