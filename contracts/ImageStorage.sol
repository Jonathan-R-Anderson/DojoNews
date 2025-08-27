// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ImageStorage
/// @notice Stores magnet URIs for static images.
contract ImageStorage {
    address public sysop;
    mapping(string => string) public imageMagnets;

    event ImageMagnetSet(string indexed imageId, string magnetURI);

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

    function getImageMagnet(string calldata imageId) external view returns (string memory) {
        return imageMagnets[imageId];
    }
}

