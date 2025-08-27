// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CommentStorage
/// @notice Stores comments associated with posts.
contract CommentStorage {
    address public sysop;

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

    constructor() {
        sysop = msg.sender;
    }

    function addComment(uint256 postId, string calldata content) external returns (uint256 commentId) {
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

    function setBlacklist(uint256 commentId, bool isBlacklisted) external onlySysop {
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

