// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Board registry for forum boards
/// @notice Stores board metadata, moderators and their posts
contract Board {
    struct Post {
        uint256 id;
    }

    struct BoardInfo {
        string name;
        string banner;
        Post[] posts;
        address[] moderators;
    }

    address public sysop;
    mapping(uint256 => BoardInfo) private boards;
    uint256 public boardCount;

    event BoardCreated(uint256 indexed id, string name, string banner);
    event BoardUpdated(uint256 indexed id, string name, string banner);
    event PostAdded(uint256 indexed boardId, uint256 indexed postId);
    event ModeratorsUpdated(uint256 indexed boardId, address[] moderators);
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);

    modifier onlySysop() {
        require(msg.sender == sysop, "only sysop");
        _;
    }

    modifier onlySysopOrModerator(uint256 boardId) {
        if (msg.sender != sysop) {
            bool ok = false;
            address[] storage mods = boards[boardId].moderators;
            for (uint256 i = 0; i < mods.length; i++) {
                if (mods[i] == msg.sender) {
                    ok = true;
                    break;
                }
            }
            require(ok, "not moderator");
        }
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
    /// @param banner Banner image or identifier
    /// @param moderators Initial list of moderators
    /// @return id Identifier of the created board
    function createBoard(
        string calldata name,
        string calldata banner,
        address[] calldata moderators
    ) external onlySysop returns (uint256 id) {
        id = boardCount++;
        BoardInfo storage b = boards[id];
        b.name = name;
        b.banner = banner;
        for (uint256 i = 0; i < moderators.length; i++) {
            b.moderators.push(moderators[i]);
        }
        emit BoardCreated(id, name, banner);
        if (moderators.length > 0) {
            emit ModeratorsUpdated(id, moderators);
        }
    }

    /// @notice Update board metadata and moderators
    /// @param id Board identifier
    /// @param name New board name
    /// @param banner New banner identifier
    /// @param moderators New list of moderators
    function updateBoard(
        uint256 id,
        string calldata name,
        string calldata banner,
        address[] calldata moderators
    ) external onlySysop {
        require(id < boardCount, "invalid board");
        BoardInfo storage b = boards[id];
        b.name = name;
        b.banner = banner;
        delete b.moderators;
        for (uint256 i = 0; i < moderators.length; i++) {
            b.moderators.push(moderators[i]);
        }
        emit BoardUpdated(id, name, banner);
        emit ModeratorsUpdated(id, moderators);
    }

    /// @notice Add a post to a board
    /// @param boardId Board identifier
    /// @param postId Post identifier
    function addPost(uint256 boardId, uint256 postId)
        external
        onlySysopOrModerator(boardId)
    {
        require(boardId < boardCount, "invalid board");
        boards[boardId].posts.push(Post(postId));
        emit PostAdded(boardId, postId);
    }

    /// @notice Retrieve board information
    /// @param id Board identifier
    /// @return b Board information
    function getBoard(uint256 id) external view returns (BoardInfo memory b) {
        require(id < boardCount, "invalid board");
        b = boards[id];
    }
}
