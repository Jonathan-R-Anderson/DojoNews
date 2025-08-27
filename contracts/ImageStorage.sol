// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ImageStorage
/// @notice Stores magnet URIs for static images.
contract ImageStorage {
    address public sysop;
    mapping(string => string) public imageMagnets;
    mapping(string => bool) public blacklisted;

    event ImageMagnetSet(string indexed imageId, string magnetURI);
    event ImageBlacklistUpdated(string indexed imageId, bool isBlacklisted);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    constructor() {
        sysop = msg.sender;
    }

    function setImageMagnet(string calldata imageId, string calldata magnetURI) external onlySysop {
        imageMagnets[imageId] = magnetURI;
        emit ImageMagnetSet(imageId, magnetURI);
    }

    function setBlacklist(string calldata imageId, bool isBlacklisted) external onlySysop {
        blacklisted[imageId] = isBlacklisted;
        emit ImageBlacklistUpdated(imageId, isBlacklisted);
    }

    function getImageMagnet(string calldata imageId) external view returns (string memory) {
        return imageMagnets[imageId];
    }

    function getImage(string calldata imageId) external view returns (string memory magnetURI, bool isBlacklisted) {
        return (imageMagnets[imageId], blacklisted[imageId]);
    }
}

