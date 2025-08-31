// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Simple forum board inspired by 4chan
/// @notice Stores boards and latest post image on-chain. Posts themselves are
///         emitted as events to avoid heavy storage. Only the contract owner can
///         create boards or blacklist posts.
contract Forum {
    struct Board {
        string name;
        string latestImage;
    }

    struct Post {
        uint256 boardId;
        uint256 id;
        string content;
        string image;
    }

    Board[] public boards;
    mapping(uint256 => bool) public blacklisted;
    uint256 public postCount;
    address public owner;

    event BoardCreated(uint256 indexed boardId, string name);
    event PostCreated(
        uint256 indexed boardId,
        uint256 indexed postId,
        string content,
        string image
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createBoard(string calldata name) external onlyOwner {
        boards.push(Board({name: name, latestImage: ""}));
        emit BoardCreated(boards.length - 1, name);
    }

    function createPost(
        uint256 boardId,
        string calldata content,
        string calldata image
    ) external {
        require(boardId < boards.length, "invalid board");
        postCount++;
        boards[boardId].latestImage = image;
        emit PostCreated(boardId, postCount, content, image);
    }

    function blacklist(uint256 postId) external onlyOwner {
        blacklisted[postId] = true;
    }

    function getBoards() external view returns (Board[] memory) {
        return boards;
    }
}
