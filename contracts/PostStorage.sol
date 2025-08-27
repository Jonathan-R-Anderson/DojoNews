// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PostStorage
/// @notice Stores blog posts on-chain via content hashes or URIs.
contract PostStorage {
    address public sysop;

    struct Post {
        address author;
        string contentHash;
        bool exists;
        bool blacklisted;
    }

    uint256 public nextPostId;
    mapping(uint256 => Post) public posts;

    event PostCreated(uint256 indexed postId, address indexed author, string contentHash);
    event PostDeleted(uint256 indexed postId);
    event PostBlacklistUpdated(uint256 indexed postId, bool isBlacklisted);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    constructor() {
        sysop = msg.sender;
    }

    function createPost(string calldata contentHash) external returns (uint256 postId) {
        postId = nextPostId++;
        posts[postId] = Post(msg.sender, contentHash, true, false);
        emit PostCreated(postId, msg.sender, contentHash);
    }

    function deletePost(uint256 postId) external {
        Post storage p = posts[postId];
        require(p.exists, "no post");
        require(msg.sender == p.author || msg.sender == sysop, "not authorized");
        delete posts[postId];
        emit PostDeleted(postId);
    }

    function setBlacklist(uint256 postId, bool isBlacklisted) external onlySysop {
        Post storage p = posts[postId];
        require(p.exists, "no post");
        p.blacklisted = isBlacklisted;
        emit PostBlacklistUpdated(postId, isBlacklisted);
    }

    function getPost(uint256 postId) external view returns (Post memory) {
        Post memory p = posts[postId];
        require(p.exists, "no post");
        return p;
    }
}

