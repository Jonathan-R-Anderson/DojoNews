// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TipJar
/// @notice Handles tips for authors with an optional sysop flat tax.
contract TipJar {
    address public sysop;
    uint256 public sysopTax; // flat tax in wei
    event SysopTransferred(address indexed previousSysop, address indexed newSysop);

    mapping(bytes32 => uint256) public tips; // author + postId => total tips

    event TipSent(address indexed from, address indexed author, bytes32 indexed postId, uint256 amount, uint256 sysopTax);
    event SysopTaxUpdated(uint256 previousTax, uint256 newTax);

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

    function setSysopTax(uint256 tax) external onlySysop {
        uint256 oldTax = sysopTax;
        sysopTax = tax;
        emit SysopTaxUpdated(oldTax, tax);
    }

    function tip(address author, bytes32 postId) external payable {
        require(msg.value > sysopTax, "value <= tax");
        uint256 tax = sysopTax;
        uint256 payout = msg.value - tax;
        if (tax > 0) {
            (bool feeSent, ) = sysop.call{value: tax}("");
            require(feeSent, "tax failed");
        }
        (bool sent, ) = author.call{value: payout}("");
        require(sent, "tip failed");
        tips[keccak256(abi.encodePacked(author, postId))] += payout;
        emit TipSent(msg.sender, author, postId, payout, tax);
    }
}

