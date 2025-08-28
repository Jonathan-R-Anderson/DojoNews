// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TipJar
/// @notice Handles tips for authors with an optional sysop commission.
contract TipJar {
    address public sysop;
    uint256 public sysopTipBps; // commission in basis points
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);

    mapping(bytes32 => uint256) public tips; // author + postId => total tips

    event TipSent(address indexed from, address indexed author, bytes32 indexed postId, uint256 amount, uint256 sysopFee);

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

    function setSysopTipBps(uint256 bps) external onlySysop {
        require(bps <= 10_000, "bps too high");
        sysopTipBps = bps;
    }

    function tip(address author, bytes32 postId) external payable {
        require(msg.value > 0, "no value");
        uint256 fee = (msg.value * sysopTipBps) / 10_000;
        uint256 payout = msg.value - fee;
        if (fee > 0) {
            (bool feeSent, ) = sysop.call{value: fee}("");
            require(feeSent, "fee failed");
        }
        (bool sent, ) = author.call{value: payout}("");
        require(sent, "tip failed");
        tips[keccak256(abi.encodePacked(author, postId))] += payout;
        emit TipSent(msg.sender, author, postId, payout, fee);
    }
}

