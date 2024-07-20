'use client'

import { useState, useEffect } from 'react'
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';

// USDT 合约地址
const USDT_CONTRACT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';

// Transfer 事件的 ABI 格式
const TRANSFER_EVENT_ABI = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

let client: ReturnType<typeof createPublicClient>;

export default function ShowBlock() {
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [blockHash, setBlockHash] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<any[]>([]);


  useEffect(() => {
    // 初始化进行客户端连接
    client = createPublicClient({
      chain: mainnet,
      transport: http('https://rpc.flashbots.net'),
    });
  })


  const fetchBlockData = async () => {
    const latestBlock = await client.getBlock({ blockTag: 'latest' });
    setBlockHeight(Number(latestBlock.number));
    setBlockHash(latestBlock.hash);
  };

  const subscribeToEvents = () => {
    client.watchBlockNumber({

      onBlockNumber: async (blockNumber) => {
        if (blockNumber === undefined) {
          setBlockHeight(null);
          return;
        }

        const safeBlockNumber = blockNumber !== undefined ? BigInt(blockNumber) : BigInt(0); // 提供默认值

        setBlockHeight(Number(safeBlockNumber));

        const fromBlock = safeBlockNumber - BigInt(100);
        const toBlock = safeBlockNumber;

        const logs = await client.getLogs({
          address: USDT_CONTRACT_ADDRESS,
          event: TRANSFER_EVENT_ABI,
          fromBlock,
          toBlock,
        });

        // 将logs转换为数组，以便遍历
        const logsArray = Array.isArray(logs) ? logs : [logs];

        // 只取数据的前100条
        logsArray.splice(100);


        const newTransfers = logsArray.map(log => {
          const { from, to, value } = log.args || {};
          return {
            blockNumber: log.blockNumber.toString(), // 转换为字符串
            transactionHash: log.transactionHash,
            from,
            to,
            value: value ? Number(formatUnits(value, 6)).toFixed(5) : '0.00000'
          };
        });

        setTransfers(newTransfers);
      },

    });
  };

  useEffect(() => {
    fetchBlockData();
    subscribeToEvents();
  }, [])

  return (
    <div>
      <h1>最新区块信息</h1>
      <p>区块高度: {blockHeight}</p>
      <p>区块哈希值: {blockHash}</p>
      <h2>最新 USDT 转账记录</h2>
      {transfers.map((transfer, index) => (
        <div key={index}>
          <p>在 {transfer.blockNumber} 区块 {transfer.transactionHash} 交易中从 {transfer.from} 转账 {transfer.value} USDT 到 {transfer.to}</p>
        </div>
      ))}
    </div>
  )
}