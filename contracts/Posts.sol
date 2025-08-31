// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Posts contract linking forum posts to boards
interface IBoard {
    function boardCount() external view returns (uint256);
}

contract Posts {
    struct Post {
        address author;
        string username;
        string email;
        string subject;
        string body;
        uint256 boardId;
    }

    address public sysop;
    IBoard public boardContract;
    uint256 public postCount;
    mapping(uint256 => Post) public posts;

    event PostCreated(
        uint256 indexed id,
        uint256 indexed boardId,
        address indexed author,
        string username,
        string email,
        string subject,
        string body
    );
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    constructor(address boardAddress) {
        require(boardAddress != address(0), "invalid board address");
        sysop = msg.sender;
        boardContract = IBoard(boardAddress);
    }

    function transferSysop(address newSysop) external onlySysop {
        require(newSysop != address(0), "bad sysop");
        emit SysopTransferred(sysop, newSysop);
        sysop = newSysop;
    }

    /// @notice Create a new post under a board
    /// @param boardId The board identifier
    /// @param username Chosen display name, defaults to "Anonymous" if empty
    /// @param email Optional contact email
    /// @param subject Post subject line
    /// @param body Post body content
    /// @return id Identifier of the created post
    function createPost(
        uint256 boardId,
        string calldata username,
        string calldata email,
        string calldata subject,
        string calldata body
    ) external returns (uint256 id) {
        require(boardId < boardContract.boardCount(), "invalid board");
        string memory name = bytes(username).length > 0 ? username : "Anonymous";
        id = postCount++;
        posts[id] = Post(msg.sender, name, email, subject, body, boardId);
        emit PostCreated(id, boardId, msg.sender, name, email, subject, body);
    }

    /// @notice Retrieve a post
    /// @param id Identifier of the post
    /// @return p The post data
    function getPost(uint256 id) external view returns (Post memory p) {
        p = posts[id];
    }
}
