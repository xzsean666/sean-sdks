import { EthersUtils } from "./utils/ethersUtils";
import { ERC20Utils } from "./utils/ERC20Utils";
import { KVDatabase } from "./utils/PGKVDatabase";

interface OrderInfo {
  orderId: string;
  amount: string | number;
  address: string;
  nonce: number;
  status: "pending" | "completed" | "shortPayment";
}

export class Web3Pay {
  orderExpireTime: number = 1000 * 60 * 15;
  walletEmptyLimit: number = 1e16;
  ethersUtils: EthersUtils;
  erc20Utils: ERC20Utils;
  orderDB: KVDatabase;
  historyOrderDB: KVDatabase;
  addressPoolDB: KVDatabase;
  addressPoolIndexDB: KVDatabase;
  addressActiveDB: KVDatabase;
  config: any;
  constructor(config: any) {
    this.config = config;
    this.ethersUtils = new EthersUtils(config.rpcUrl, {
      privateKey: config.privateKey,
      batchCallAddress: config.contracts.batchCallAddress,
    });

    this.erc20Utils = new ERC20Utils(
      config.rpcUrl,
      config.TOKENS.USDT.address,
      config.privateKey
    );
    this.orderDB = new KVDatabase(config.db.url, config.db.prefix + "order");
    this.addressPoolDB = new KVDatabase(
      config.db.url,
      config.db.prefix + "addressPool"
    );
    this.historyOrderDB = new KVDatabase(
      config.db.url,
      config.db.prefix + "historyOrder"
    );
  }

  async getAddressFromPool() {
    let address_info;
    address_info = await this.addressPoolDB.searchJson({
      contains: {
        active: false,
      },
    });
    if (address_info.length === 0) {
      address_info = await this.addressPoolDB.searchJsonByTime(
        {
          contains: {
            active: true,
          },
        },
        {
          timestamp: Date.now() - this.orderExpireTime,
          type: "before",
        }
      );
      if (address_info.length === 0) {
        const index = (await this.addressPoolDB.get("index")) || 0;
        const wallet = await this.ethersUtils.getDeriveWallets(index);
        await this.addressPoolDB.put("index", index + 1);
        const address_info = {
          index,
          active: true,
          approved: false,
          collect: false,
          nonce: 0,
        };
        await this.addressPoolDB.put(wallet.address, address_info);
        return { key: wallet.address, value: address_info };
      }
    }
    return address_info[0];
  }
  async createOrder(orderId: string, amount: string | number) {
    const { key: address, value: addressInfo } =
      await this.getAddressFromPool();
    const addressBalance = await this.erc20Utils.balanceOf(address);
    if (addressBalance > BigInt(this.walletEmptyLimit)) {
      await this.addressPoolDB.merge(address, {
        collect: true,
        active: true,
        amount: addressBalance.toString(),
      });
      throw new Error("Unexcepted error");
    }

    if (!addressInfo) {
      throw new Error("Address not found");
    }
    const key = address + "_" + orderId;

    const orderInfo: OrderInfo = {
      address,
      orderId,
      nonce: addressInfo.nonce,
      amount,
      status: "pending",
    };
    // 更新addressInfo中的nonce并存储
    const nonce = addressInfo.nonce + 1;
    await this.addressPoolDB.merge(address, {
      nonce,
      active: true,
      amount: addressBalance.toString(),
    });
    await this.orderDB.add(key, orderInfo);
    return orderInfo;
  }
  async getValidOrder(paymentAddress: string, orderId: string) {
    const orderInfo = await this.orderDB.get(
      paymentAddress + "_" + orderId,
      this.orderExpireTime
    );
    return orderInfo;
  }
  async getOrderStatus(paymentAddress: string, orderId: string) {
    const orderInfo = await this.getValidOrder(paymentAddress, orderId);
    if (!orderInfo) {
      throw new Error("Order not found");
    }
    if (orderInfo.status === "completed") {
      return orderInfo;
    }
    const balance = await this.erc20Utils.balanceOf(paymentAddress);
    if (balance < BigInt(this.walletEmptyLimit)) {
      return orderInfo;
    }
    if (balance < BigInt(orderInfo.amount)) {
      orderInfo.status = "shortPayment";
      await this.orderDB.merge(paymentAddress + "_" + orderId, {
        status: "shortPayment",
      });
      return orderInfo;
    }
    if (balance >= BigInt(orderInfo.amount)) {
      orderInfo.status = "completed";
      await this.orderDB.merge(paymentAddress + "_" + orderId, {
        status: "completed",
      });
      await this.addressPoolDB.merge(orderInfo.address, {
        collect: true,
        amount: balance,
      });
      return orderInfo;
    }
  }
  async getCollectAddress() {
    const addressInfo = await this.addressPoolDB.searchJson({
      contains: {
        collect: true,
      },
    });
    return addressInfo;
  }
  async collect() {
    const addressInfos = await this.getCollectAddress();
    let approvedAddressInfos: any = [];
    let unApprovedAddresPk: any = [];
    for (const addressInfo of addressInfos) {
      if (addressInfo.value.approved) {
        addressInfo.address = addressInfo.key;
        approvedAddressInfos.push(addressInfo);
      } else {
        const wallet = await this.ethersUtils.getDeriveWallets(
          addressInfo.value.index
        );
        unApprovedAddresPk.push(wallet.privateKey);
      }
    }
    if (unApprovedAddresPk.length > 0) {
      const approvedAddresses = await this.erc20Utils.approveAll(
        this.config.contracts.batchCallAddress,
        unApprovedAddresPk
      );
      for (const approvedAddress of approvedAddresses) {
        this.addressPoolDB.merge(approvedAddress, {
          approved: true,
        });
      }
    }
    let calls: any = [];
    for (const approvedAddressInfo of approvedAddressInfos) {
      const call = await this.ethersUtils.encodeDataByABI({
        abi: this.config.abis.ERC20_ABI,
        functionName: "transferFrom",
        executeArgs: [
          approvedAddressInfo.address,
          this.ethersUtils.getSignerAddress(),
          approvedAddressInfo.value.amount,
        ],
        target: this.config.TOKENS.USDT.address,
      });
      calls.push(call);
    }
    if (calls.length === 0) {
      return;
    }
    const results = await this.ethersUtils.batchWriteCall(calls);
    return results;
  }
}
