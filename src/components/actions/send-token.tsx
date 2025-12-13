"use client";

import { useState, useCallback } from "react";
import { Button } from "~/components/ui/Button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { useSendCalls } from "wagmi";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import { Attribution } from "ox/erc8021";

// 👇 Alamat wallet tujuan
const RECIPIENT_ADDRESS = "0x4fba95e4772be6d37a0c931D00570Fe2c9675524";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export function SendTokenAction() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>(RECIPIENT_ADDRESS);
  const [amount, setAmount] = useState<string>("1");

  const { sendCallsAsync } = useSendCalls();

  const handleSendToken = useCallback(async (): Promise<void> => {
    setError(null);
    setSuccess(null);
    
    try {
      if (!amount || isNaN(parseFloat(amount))) {
        throw new Error("Invalid amount");
      }

      const amountBigInt = parseUnits(amount, 6);
      
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipientAddress as `0x${string}`, amountBigInt],
      });

      const id = await sendCallsAsync({
        calls: [
          {
            to: USDC_ADDRESS,
            data: data,
            // 👇 HAPUS value: 0n (Penyebab Error BigInt)
          },
        ],
        capabilities: {
          dataSuffix: Attribution.toDataSuffix({ codes: ["bc_9x9dywpq"] }),
        },
      });
      
      console.log("Send successful, Call ID:", id);
      const displayId = typeof id === 'string' ? id : JSON.stringify(id);
      setSuccess(`Transaction initiated! ID: ${displayId}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error sending token";
      setError(errorMessage);
      console.error("Error sending token:", error);
    }
  }, [recipientAddress, amount, sendCallsAsync]);

  return (
    <div className="mb-4">
      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
        <pre className="font-mono text-xs text-emerald-500 dark:text-emerald-400">
          wagmi.sendCalls + Attribution
        </pre>
      </div>
      
      <div className="mb-2">
        <Label className="text-xs font-semibold text-gray-500 mb-1" htmlFor="send-recipient">
          Recipient Address
        </Label>
        <Input
          id="send-recipient"
          type="text"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          className="mb-2 text-emerald-500 dark:text-emerald-400 text-xs"
          placeholder="0x..."
        />
      </div>
      
      <div className="mb-2">
        <Label className="text-xs font-semibold text-gray-500 mb-1" htmlFor="send-amount">
          Amount (USDC)
        </Label>
        <Input
          id="send-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-2 text-emerald-500 dark:text-emerald-400 text-xs"
          placeholder="1.0"
          step="0.1"
          min="0"
        />
      </div>
      
      {error && (
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
          <pre className="font-mono text-xs text-red-500 dark:text-red-400 text-wrap break-all">
            {error}
          </pre>
        </div>
      )}
      {success && (
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
          <pre className="font-mono text-xs text-green-500 dark:text-green-400 text-wrap break-all">
            {success}
          </pre>
        </div>
      )}
      <Button onClick={handleSendToken}>Send {amount} USDC</Button>
    </div>
  );
}