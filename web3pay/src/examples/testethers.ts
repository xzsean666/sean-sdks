import { EthersUtils } from "../utils/ethersUtils";
import { configs } from "../configs";

const ethersUtils = new EthersUtils(configs.testbnb.rpcUrl);

async function main() {
  const blockNumber = await ethersUtils.getLatestBlockNumber();
  console.log(blockNumber);
}

main();
