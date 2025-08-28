// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PostStorage
/// @notice Stores posts with associated media magnet URIs on-chain.
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
        string[] imageIds;
        string bannerImageId;
        string[] videoIds;
    }

    struct MediaInput {
        string name;
        string magnetURI;
    }

    uint256 public nextPostId;
    mapping(uint256 => Post) public posts;
    mapping(string => string) public imageMagnets;
    mapping(string => bool) public blacklistedImages;
    mapping(string => string) public videoMagnets;
    mapping(string => bool) public blacklistedVideos;

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
    event VideoMagnetSet(string indexed videoId, string magnetURI);
    event VideoBlacklistUpdated(string indexed videoId, bool isBlacklisted);
    event BannerImageSet(uint256 indexed postId, string bannerImageId);

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
        string calldata authorInfo,
        MediaInput[] calldata images,
        uint256 bannerImageIndex,
        MediaInput[] calldata videos
    ) external returns (uint256 postId) {
        require(images.length > 0, "no images");
        require(bannerImageIndex < images.length, "bad banner index");
        postId = nextPostId++;
        _initPost(postId, contentHash, magnetURI, authorInfo);
        _storeImages(postId, images, bannerImageIndex);
        _storeVideos(postId, videos);
        emit PostCreated(postId, msg.sender, contentHash, magnetURI);
        emit BannerImageSet(postId, posts[postId].bannerImageId);
    }

    function _initPost(
        uint256 postId,
        string calldata contentHash,
        string calldata magnetURI,
        string calldata authorInfo
    ) internal {
        Post storage p = posts[postId];
        p.author = msg.sender;
        p.contentHash = contentHash;
        p.magnetURI = magnetURI;
        p.authorInfo = authorInfo;
        p.exists = true;
        p.blacklisted = false;
    }

    function _storeImages(
        uint256 postId,
        MediaInput[] calldata images,
        uint256 bannerImageIndex
    ) internal {
        Post storage p = posts[postId];
        for (uint256 i = 0; i < images.length; i++) {
            string memory imageId = string.concat(
                _uintToString(postId),
                "-",
                images[i].name
            );
            p.imageIds.push(imageId);
            imageMagnets[imageId] = images[i].magnetURI;
            emit ImageMagnetSet(imageId, images[i].magnetURI);
        }
        p.bannerImageId = p.imageIds[bannerImageIndex];
    }

    function _storeVideos(
        uint256 postId,
        MediaInput[] calldata videos
    ) internal {
        Post storage p = posts[postId];
        for (uint256 i = 0; i < videos.length; i++) {
            string memory videoId = string.concat(
                _uintToString(postId),
                "-",
                videos[i].name
            );
            p.videoIds.push(videoId);
            videoMagnets[videoId] = videos[i].magnetURI;
            emit VideoMagnetSet(videoId, videos[i].magnetURI);
        }
    }

    function deletePost(uint256 postId) external {
        Post storage p = posts[postId];
        require(p.exists, "no post");
        require(msg.sender == p.author || msg.sender == sysop, "not authorized");
        for (uint256 i = 0; i < p.imageIds.length; i++) {
            delete imageMagnets[p.imageIds[i]];
        }
        for (uint256 i = 0; i < p.videoIds.length; i++) {
            delete videoMagnets[p.videoIds[i]];
        }
        delete posts[postId];
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

    function setVideoMagnet(
        string calldata videoId,
        string calldata magnetURI
    ) external onlySysop {
        videoMagnets[videoId] = magnetURI;
        emit VideoMagnetSet(videoId, magnetURI);
    }

    function setVideoBlacklist(
        string calldata videoId,
        bool isBlacklisted
    ) external onlySysop {
        blacklistedVideos[videoId] = isBlacklisted;
        emit VideoBlacklistUpdated(videoId, isBlacklisted);
    }

    function setBannerImage(uint256 postId, string calldata imageId) external {
        Post storage p = posts[postId];
        require(p.exists, "no post");
        require(msg.sender == p.author || msg.sender == sysop, "not authorized");
        bool found;
        for (uint256 i = 0; i < p.imageIds.length; i++) {
            if (keccak256(bytes(p.imageIds[i])) == keccak256(bytes(imageId))) {
                found = true;
                break;
            }
        }
        require(found, "image not found");
        p.bannerImageId = imageId;
        emit BannerImageSet(postId, imageId);
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

    function getVideoMagnet(string calldata videoId)
        external
        view
        returns (string memory)
    {
        return videoMagnets[videoId];
    }

    function getVideo(string calldata videoId)
        external
        view
        returns (string memory magnetURI, bool isBlacklisted)
    {
        return (videoMagnets[videoId], blacklistedVideos[videoId]);
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

