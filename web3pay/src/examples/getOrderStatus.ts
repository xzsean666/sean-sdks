import { config } from "./config";
import { Web3Pay } from "../web3pay";

const web3pay = new Web3Pay(config);

async function main() {
  const order = "0x39FbB77749eDc0ce60C990b8B8e1267eB3C91398_1738138680539";
  const address = await web3pay.getOrderStatus(
    "0x39FbB77749eDc0ce60C990b8B8e1267eB3C91398",
    "1738138680539"
  );
  console.log(address);
}

main();
