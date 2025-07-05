import { useState, useContext, useEffect } from "react";
import { UserContext } from "../App";

export function Balance() {
  const [balance, setBalance] = useState<number>(3);
  const { state, setState } = useContext(UserContext);

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum == null) {
      alert("Instalar metamask");
      return;
    }

    ethereum.request({
      method: "eth_getBalance", 
      params: [state.acc]
    }).then((result: string) => {
      // Convert from wei to ether
      const balanceInEther = parseInt(result, 16) / 1e18;
      setBalance(balanceInEther);
    });
  }, [state.acc]);

  return <div>El address {state.acc} tiene balance {balance} ETH</div>;
}