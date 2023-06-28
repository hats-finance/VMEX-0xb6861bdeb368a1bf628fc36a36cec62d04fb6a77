// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import {AToken} from "../../protocol/tokenization/AToken.sol";
import {ILendingPool} from "../../interfaces/ILendingPool.sol";

contract MockAToken is AToken {
    function newFunction() external pure returns (uint256) {
        return 2;
    }
}
