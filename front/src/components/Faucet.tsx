import { useContext } from "react";
import { UserContext } from "../App";
import { Button } from "./ui/button";

export function Faucet() {
  const { state, setState } = useContext(UserContext);

  async function handleClick() {
    const result = await fetch(`http://localhost:3000/api/faucet/${state.acc}/1`)
    const data = await result.json();
    console.log(data);
  }

  return (
    <div className="space-y-4 mt-5">
    <h1 className="text-xl font-bold">Faucet</h1>
    <p>Cuenta: {state.acc}</p>
    <Button onClick={async () => handleClick()}>Solicitar fondos</Button>
    </div>
  );
}