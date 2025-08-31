// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Board registry for forum boards
/// @notice Stores board metadata and exposes their identifiers
contract Board {
    struct BoardInfo {
        string subject;
        string body;
        string email;
        string name;
    }

    address public sysop;
    mapping(uint256 => BoardInfo) public boards;
    uint256 public boardCount;

    event BoardCreated(
        uint256 indexed id,
        string subject,
        string body,
        string email,
        string name
    );
    event BoardUpdated(
        uint256 indexed id,
        string subject,
        string body,
        string email,
        string name
    );
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

    /// @notice Create a new board entry
    /// @param subject Subject of the board entry
    /// @param body Body content
    /// @param email Optional contact email
    /// @param name Display name, defaults to "Anonymous" if empty
    /// @return id Identifier of the created board entry
    function createBoard(
        string calldata subject,
        string calldata body,
        string calldata email,
        string calldata name
    ) external onlySysop returns (uint256 id) {
        id = boardCount++;
        string memory finalName = bytes(name).length > 0 ? name : "Anonymous";
        boards[id] = BoardInfo(subject, body, email, finalName);
        emit BoardCreated(id, subject, body, email, finalName);
    }

    /// @notice Update an existing board entry
    /// @param id Identifier of the board entry
    /// @param subject New subject
    /// @param body New body content
    /// @param email New contact email
    /// @param name New display name, defaults to "Anonymous" if empty
    function updateBoard(
        uint256 id,
        string calldata subject,
        string calldata body,
        string calldata email,
        string calldata name
    ) external onlySysop {
        require(id < boardCount, "invalid board");
        string memory finalName = bytes(name).length > 0 ? name : "Anonymous";
        boards[id] = BoardInfo(subject, body, email, finalName);
        emit BoardUpdated(id, subject, body, email, finalName);
    }

    /// @notice Retrieve board information
    /// @param id Identifier of the board entry
    /// @return b Board information
    function getBoard(uint256 id) external view returns (BoardInfo memory b) {
        b = boards[id];
    }
}
