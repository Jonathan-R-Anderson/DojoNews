// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Board registry for forum boards
/// @notice Stores board names and exposes their identifiers
contract Board {
    struct BoardInfo {
        string name;
    }

    address public sysop;
    mapping(uint256 => BoardInfo) public boards;
    uint256 public boardCount;

    event BoardCreated(uint256 indexed id, string name);
    event BoardUpdated(uint256 indexed id, string name);
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);

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

    /// @notice Create a new board
    /// @param name Name of the board
    /// @return id Identifier of the created board
    function createBoard(string calldata name)
        external
        onlySysop
        returns (uint256 id)
    {
        id = boardCount++;
        boards[id] = BoardInfo(name);
        emit BoardCreated(id, name);
    }

    /// @notice Update an existing board's name
    /// @param id Identifier of the board
    /// @param name New name of the board
    function setBoardName(uint256 id, string calldata name) external onlySysop {
        require(id < boardCount, "invalid board");
        boards[id].name = name;
        emit BoardUpdated(id, name);
    }

    /// @notice Retrieve board information
    /// @param id Identifier of the board
    /// @return name Name of the board
    function getBoard(uint256 id) external view returns (string memory name) {
        BoardInfo storage b = boards[id];
        name = b.name;
    }
}
