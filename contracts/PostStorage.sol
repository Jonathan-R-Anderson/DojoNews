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
    }

    uint256 public nextPostId;
    mapping(uint256 => Post) public posts;

    event PostCreated(uint256 indexed postId, address indexed author, string contentHash);
    event PostDeleted(uint256 indexed postId);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    constructor() {
        sysop = msg.sender;
    }

    function createPost(string calldata contentHash) external returns (uint256 postId) {
        postId = nextPostId++;
        posts[postId] = Post(msg.sender, contentHash, true);
        emit PostCreated(postId, msg.sender, contentHash);
    }

    function deletePost(uint256 postId) external {
        Post storage p = posts[postId];
        require(p.exists, "no post");
        require(msg.sender == p.author || msg.sender == sysop, "not authorized");
        delete posts[postId];
        emit PostDeleted(postId);
    }
}

