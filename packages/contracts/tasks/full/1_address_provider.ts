import { task } from "hardhat/config";
import { deployLendingPoolAddressesProvider } from "../../helpers/contracts-deployments";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import {
  ConfigNames,
  loadPoolConfig,
  getGenesisPoolAdmin,
  getEmergencyAdmin,
  getVMEXTreasury,
} from "../../helpers/configuration";
import { getParamPerNetwork } from "../../helpers/contracts-helpers";
import { eNetwork } from "../../helpers/types";

task(
  "full:deploy-address-provider",
  "Deploy address provider, registry and fee provider for dev enviroment"
)
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam(
    "pool",
    `Pool name to retrieve configuration, supported: ${Object.values(
      ConfigNames
    )}`
  )
  .addFlag("skipRegistry")
  .setAction(async ({ verify, pool, skipRegistry }, DRE) => {
    await DRE.run("set-DRE");
    const poolConfig = loadPoolConfig(pool);
    const { MarketId } = poolConfig;
    console.log("trying to deploy addr provider")
    // 1. Deploy address provider and set genesis manager
    const addressesProvider = await deployLendingPoolAddressesProvider(
      MarketId,
      verify
    );

    // 2. Add to registry or setup a new one
    if (!skipRegistry) {
      const providerRegistryAddress = getParamPerNetwork(
        poolConfig.ProviderRegistry,
        <eNetwork>DRE.network.name
      );

      await DRE.run("add-market-to-registry", {
        pool,
        addressesProvider: addressesProvider.address,
        deployRegistry: !notFalsyOrZeroAddress(providerRegistryAddress),
      });
    }
    // 3. Set pool admins and vmex treasury
    await waitForTx(
      await addressesProvider.setVMEXTreasury(
        await getVMEXTreasury(poolConfig)
      )
    );
    await waitForTx(
      await addressesProvider.setGlobalAdmin(
        await getGenesisPoolAdmin(poolConfig)
      )
    );
    await waitForTx(
      await addressesProvider.setEmergencyAdmin(
        await getGenesisPoolAdmin(poolConfig)
      )
    );
    await waitForTx(
      await addressesProvider.addWhitelistedAddress(
        await getGenesisPoolAdmin(poolConfig),
        true
      )
    );
    await waitForTx(
      await addressesProvider.addWhitelistedAddress(
        await getEmergencyAdmin(poolConfig),
        true
      )
    );

    //dev: enable anyone to create tranche
    await waitForTx(
      await addressesProvider.setPermissionlessTranches(
        true
      )
    );
    //await waitForTx(await addressesProvider.setEmergencyAdmin(await getEmergencyAdmin(poolConfig)));

    console.log("Pool Admin", await addressesProvider.getGlobalAdmin());
    console.log(
      "whitelisted addresses: ",
      await addressesProvider.getGlobalAdmin(),
      " and ",
      await getEmergencyAdmin(poolConfig)
    );
    // console.log('Emergency Admin', await addressesProvider.getEmergencyAdmin());
  });
