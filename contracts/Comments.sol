// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Comments contract storing replies to posts
interface IPosts {
    function postCount() external view returns (uint256);
}

interface IModeration {
    function isBanned(address user) external view returns (bool);
    function isPostBlacklisted(uint256 postId) external view returns (bool);
}

contract Comments {
    struct Comment {
        address author;
        string username;
        string email;
        string body;
        uint256 postId;
    }

    address public sysop;
    IPosts public postsContract;
    IModeration public moderationContract;
    uint256 public commentCount;
    mapping(uint256 => Comment) public comments;

    event CommentAdded(
        uint256 indexed id,
        uint256 indexed postId,
        address indexed author,
        string username,
        string email,
        string body
    );
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    constructor(address postsAddress, address moderationAddress) {
        require(postsAddress != address(0), "invalid posts address");
        require(moderationAddress != address(0), "invalid moderation address");
        sysop = msg.sender;
        postsContract = IPosts(postsAddress);
        moderationContract = IModeration(moderationAddress);
    }

    function transferSysop(address newSysop) external onlySysop {
        require(newSysop != address(0), "bad sysop");
        emit SysopTransferred(sysop, newSysop);
        sysop = newSysop;
    }

    /// @notice Add a comment to a post
    /// @param postId The post identifier
    /// @param username Display name, defaults to "Anonymous" if empty
    /// @param email Optional contact email
    /// @param body Comment body text
    /// @return id Identifier of the created comment
    function addComment(
        uint256 postId,
        string calldata username,
        string calldata email,
        string calldata body
    ) external returns (uint256 id) {
        require(postId < postsContract.postCount(), "invalid post");
        require(!moderationContract.isBanned(msg.sender), "banned");
        require(!moderationContract.isPostBlacklisted(postId), "post blacklisted");
        string memory name = bytes(username).length > 0 ? username : "Anonymous";
        id = commentCount++;
        comments[id] = Comment(msg.sender, name, email, body, postId);
        emit CommentAdded(id, postId, msg.sender, name, email, body);
    }

    /// @notice Retrieve a comment
    /// @param id Identifier of the comment
    /// @return c The comment data
    function getComment(uint256 id) external view returns (Comment memory c) {
        c = comments[id];
    }
}
