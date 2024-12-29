import { rpcs } from "./rpcs";
import { ERC20_ABI } from "./abis/ERC20";
import { batchCallAddress } from "./batchCallAddress";

export const testbnbConfig = {
  rpcUrl: rpcs.bsc,
  contracts: {
    batchCallAddress: batchCallAddress.testbnb,
  },

  abis: {
    ERC20_ABI: ERC20_ABI,
  },
  TOKENS: {
    WETH: {
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
      symbol: "WETH",
    },
  },
};
