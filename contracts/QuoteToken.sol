// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.7.6;
import "./VirtualToken.sol";

contract QuoteToken is VirtualToken {
    function initialize(string memory nameArg, string memory symbolArg) external initializer {
        __VirtualToken_init(nameArg, symbolArg);
    }
}
