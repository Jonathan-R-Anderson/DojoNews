// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PostStorage
/// @notice Stores posts and image magnet URIs on-chain.
contract PostStorage {
    address public sysop;
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);

    struct Post {
        address author;
        string contentHash;
        string magnetURI;
        string authorInfo;
        bool exists;
        bool blacklisted;
    }

    uint256 public nextPostId;
    mapping(uint256 => Post) public posts;
    mapping(string => string) public imageMagnets;
    mapping(string => bool) public blacklistedImages;

    event PostCreated(
        uint256 indexed postId,
        address indexed author,
        string contentHash,
        string magnetURI
    );
    event PostDeleted(uint256 indexed postId);
    event PostBlacklistUpdated(uint256 indexed postId, bool isBlacklisted);
    event ImageMagnetSet(string indexed imageId, string magnetURI);
    event ImageBlacklistUpdated(string indexed imageId, bool isBlacklisted);

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

    function createPost(
        string calldata contentHash,
        string calldata magnetURI,
        string calldata authorInfo
    ) external returns (uint256 postId) {
        postId = nextPostId++;
        posts[postId] =
            Post(msg.sender, contentHash, magnetURI, authorInfo, true, false);
        string memory imageId = string.concat(_uintToString(postId), ".png");
        imageMagnets[imageId] = magnetURI;
        emit PostCreated(postId, msg.sender, contentHash, magnetURI);
        emit ImageMagnetSet(imageId, magnetURI);
    }

    function deletePost(uint256 postId) external {
        Post storage p = posts[postId];
        require(p.exists, "no post");
        require(msg.sender == p.author || msg.sender == sysop, "not authorized");
        string memory imageId = string.concat(_uintToString(postId), ".png");
        delete posts[postId];
        delete imageMagnets[imageId];
        emit PostDeleted(postId);
    }

    function setBlacklist(uint256 postId, bool isBlacklisted) external onlySysop {
        Post storage p = posts[postId];
        require(p.exists, "no post");
        p.blacklisted = isBlacklisted;
        emit PostBlacklistUpdated(postId, isBlacklisted);
    }

    function setImageMagnet(
        string calldata imageId,
        string calldata magnetURI
    ) external onlySysop {
        imageMagnets[imageId] = magnetURI;
        emit ImageMagnetSet(imageId, magnetURI);
    }

    function setImageBlacklist(
        string calldata imageId,
        bool isBlacklisted
    ) external onlySysop {
        blacklistedImages[imageId] = isBlacklisted;
        emit ImageBlacklistUpdated(imageId, isBlacklisted);
    }

    event AuthorInfoUpdated(uint256 indexed postId, string authorInfo);

    function updateAuthorInfo(uint256 postId, string calldata authorInfo) external {
        Post storage p = posts[postId];
        require(p.exists, "no post");
        require(msg.sender == p.author || msg.sender == sysop, "not authorized");
        p.authorInfo = authorInfo;
        emit AuthorInfoUpdated(postId, authorInfo);
    }

    function getImageMagnet(string calldata imageId)
        external
        view
        returns (string memory)
    {
        return imageMagnets[imageId];
    }

    function getImage(string calldata imageId)
        external
        view
        returns (string memory magnetURI, bool isBlacklisted)
    {
        return (imageMagnets[imageId], blacklistedImages[imageId]);
    }

    function getPost(uint256 postId) external view returns (Post memory) {
        Post memory p = posts[postId];
        require(p.exists, "no post");
        return p;
    }

    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

