import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { useContext, useEffect } from "react";
import { UserContext } from "../App";

export function Header() {
  const { state, setState } = useContext(UserContext);

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum == null) {
      alert("Instalar metamask");
      return;
    }
    ethereum.request({ method: "eth_requestAccounts" }).then((acc: string[]) => {
      setState({ acc: acc[0] });
    });

    ethereum.on("accountsChanged", (acc: string[]) => {
      setState({ acc: acc[0] });
    });
    
  }, []);
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 justify-center pt-4">
        <Link to="home">
          <Button>Home</Button>
        </Link>
        <Link to="faucet">
          <Button>Faucet</Button>
        </Link>
        <Link to="balance">
          <Button>Balance</Button>
        </Link>
        <Link to="transfer">
          <Button>Transfer</Button>
        </Link>
      </div>

      <div className="flex gap-2 justify-center">
        {state.acc ? (
          <p className="text-lg font-bold text-center border-2">{state.acc}</p>
        ) : (
          <div>Cuenta no seleccionada</div>
        )}
      </div>
    </div>
  );
}