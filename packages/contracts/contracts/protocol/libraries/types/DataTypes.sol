// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.17;

import {AssetMappings} from "../../lendingpool/AssetMappings.sol";
import {ILendingPoolAddressesProvider} from "../../../interfaces/ILendingPoolAddressesProvider.sol";
import {ILendingPool} from "../../../interfaces/ILendingPool.sol";

library DataTypes {
    struct CurveMetadata {
        uint256 _pid;
        uint8 _poolSize;
        address _curvePool;
    }
    // refer to the whitepaper, section 1.1 basic concepts for a formal description of these properties.
    struct AssetData {
        //if we assume most decimals is 18, storing these in uint128 should be ok, that means the maximum someone can deposit is 3.4 * 10^20
        uint128 supplyCap; //can get up to 10^38. Good enough.
        uint128 borrowCap; //can get up to 10^38. Good enough.
        uint64 baseLTV; // % of value of collateral that can be used to borrow. "Collateral factor." 64 bits
        uint64 liquidationThreshold; //if this is zero, then disabled as collateral. 64 bits
        uint64 liquidationBonus; // 64 bits
        uint64 borrowFactor; // borrowFactor * baseLTV * value = truly how much you can borrow of an asset. 64 bits

        //below is 31 bytes (should fit in uint 256, which is 32 bytes)
        bool borrowingEnabled; 
        bool isAllowed; //default to false, unless set
        uint8 assetType; //to choose what oracle to use
        uint64 VMEXReserveFactor; //64 bits. is sufficient (percentages can all be stored in 64 bits)
        //mapping(uint8=>address) interestRateStrategyAddress;//user must choose from this set list (index 0 is default)
        //the only difference between the different strategies is the value of the slopes and optimal utilization
        //pointer to the next asset that is approved. This allows us to avoid using a list
        address nextApprovedAsset;
    }

    struct InitReserveInput {
        // address aTokenImpl; //individual tranche users should not have control over this
        // address stableDebtTokenImpl;
        // address variableDebtTokenImpl;

        //choose asset, the other properties come with asset
        address underlyingAsset;
        uint256 reserveFactor;
        uint8 interestRateChoice; //0 for default, others are undefined until set
        bool canBorrow;
        bool canBeCollateral; //even if we allow an asset to be collateral, pool admin can choose to force the asset to not be used as collateral in their tranche
    }

    struct InitReserveInputInternal {
        InitReserveInput input;
        uint64 trancheId;
        address aTokenImpl;
        address variableDebtTokenImpl;
        AssetData assetdata;
        ILendingPool cachedPool;
        ILendingPoolAddressesProvider addressesProvider;
    }

    enum ReserveAssetType {
        AAVE,
        CURVE,
        CURVEV2,
        YEARN
    } //update with other possible types of the underlying asset
    //AAVE is the original assets in the aave protocol
    //CURVE is the new LP tokens we are providing support for
    struct TrancheAddress {
        uint64 trancheId;
        address asset;
    }
    struct ReserveData {
        //stores the reserve configuration
        ReserveConfigurationMap configuration; //a lot of this is per asset rather than per reserve. But it's fine to keep since pretty gas efficient
        //these are for sure per reserve
        //the liquidity index. Expressed in ray
        uint128 liquidityIndex; //not used for nonlendable assets
        //variable borrow index. Expressed in ray
        uint128 variableBorrowIndex; //not used for nonlendable assets
        //the current supply rate. Expressed in ray
        uint128 currentLiquidityRate; //deposit APR is defined as liquidityRate / RAY //not used for nonlendable assets
        //the current variable borrow rate. Expressed in ray
        uint128 currentVariableBorrowRate; //not used for nonlendable assets
        //the current stable borrow rate. Expressed in ray
        uint40 lastUpdateTimestamp;
        //tokens addresses
        address aTokenAddress;
        address variableDebtTokenAddress; //not used for nonlendable assets
        //the id of the reserve. Represents the position in the list of the active reserves
        uint8 id;
        address interestRateStrategyAddress;
    }

    // uint8 constant NUM_TRANCHES = 3;

    struct ReserveConfigurationMap {
        //new mappings to account for larger reserve factors
        //bit 0: Reserve is active
        //bit 1: reserve is frozen
        //bit 2: borrowing is enabled
        //bit 3: stable rate borrowing enabled
        //bit 4: collateral is enabled
        //bit 5-7: reserved
        //bit 8-71: reserve factor (64 bit)
        uint256 data;
    }

    struct UserData {
        UserConfigurationMap configuration;
    }

    struct UserConfigurationMap {
        uint256 data;
    }

    enum InterestRateMode {
        NONE,
        STABLE,
        VARIABLE
    }

    struct AcctTranche {
        address user;
        uint64 trancheId;
    }

    struct DepositVars {
        address asset;
        uint64 trancheId;
        address _addressesProvider;
        AssetMappings _assetMappings;
        uint256 amount;
        address onBehalfOf;
        uint16 referralCode;
    }

    struct ExecuteBorrowParams {
        uint256 amount;
        uint256 _reservesCount;
        uint256 assetPrice;
        uint64 trancheId; //trancheId the user wants to borrow out of
        uint16 referralCode;
        address asset;
        address user;
        address onBehalfOf;
        address aTokenAddress;
        bool releaseUnderlying;
        AssetMappings _assetMappings;

    }

    struct WithdrawParams {
        uint256 _reservesCount;
        address asset;
        uint64 trancheId;
        uint256 amount;
        address to;
    }

    struct calculateInterestRatesVars {
        address reserve;
        address aToken;
        uint256 liquidityAdded;
        uint256 liquidityTaken;
        uint256 totalVariableDebt;
        uint256 reserveFactor;
        uint256 globalVMEXReserveFactor;
    }
}
