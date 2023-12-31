// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;
import { QueryAssetHelpers } from "../libs/QueryAssetHelpers.sol";
import { ILendingPool } from "../../interfaces/ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "../../interfaces/ILendingPoolAddressesProvider.sol";

//import "hardhat/console.sol";
// NOTE: this function starts to fail if we have a large number of markets
contract GetAllTrancheAssetsData {

	constructor(address providerAddr, uint64 tranche)
    {
        address lendingPool = ILendingPoolAddressesProvider(providerAddr).getLendingPool();

        // TODO: find deterministic upper bound. temporary solution: 35 assets per tranche

        address[] memory assets = ILendingPool(lendingPool).getReservesList(tranche);
        QueryAssetHelpers.AssetData[] memory allAssetsData = new QueryAssetHelpers.AssetData[](assets.length);
        for (uint64 i = 0; i < assets.length;) {
            allAssetsData[i] = QueryAssetHelpers.getAssetData(
                assets[i], tranche, providerAddr);

            unchecked { ++i; }
        }

	    bytes memory returnData = abi.encode(allAssetsData);
		assembly {
			return(add(0x20, returnData), mload(returnData))
		}
	}

	function getType() public view returns(QueryAssetHelpers.AssetData[] memory){}

}
