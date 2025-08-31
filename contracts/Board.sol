// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Board registry for forum boards
/// @notice Stores board names and exposes their identifiers
contract Board {
    struct BoardInfo {
        string name;
    }

    mapping(uint256 => BoardInfo) public boards;
    uint256 public boardCount;

    event BoardCreated(uint256 indexed id, string name);

    /// @notice Create a new board
    /// @param name Name of the board
    /// @return id Identifier of the created board
    function createBoard(string calldata name) external returns (uint256 id) {
        id = boardCount++;
        boards[id] = BoardInfo(name);
        emit BoardCreated(id, name);
    }

    /// @notice Retrieve board information
    /// @param id Identifier of the board
    /// @return name Name of the board
    function getBoard(uint256 id) external view returns (string memory name) {
        BoardInfo storage b = boards[id];
        name = b.name;
    }
}
