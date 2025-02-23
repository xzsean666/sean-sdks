import { config } from "./config";
import { Web3Pay } from "../web3pay";

const web3pay = new Web3Pay(config);

async function main() {
  const address = await web3pay.getCollectAddress();
  console.log(address);
}

main();
