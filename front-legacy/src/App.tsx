import { useEffect, useState } from "react";

/*
curl --location 'http://localhost:5556/' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "method": "eth_getBalance",
    "params": ["0x52f23bf558697b1d4f480e1aa27d7852709b1cc0", "latest"],
    "id": 1
}'
>>> {"jsonrpc":"2.0","id":1,"result":"0xeca8847c4129106e19c718a5000"}
*/

type Data = {
  jsonrpc: string;
  id: number;
  result: string;
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("http://localhost:5556/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [
          "0x52f23bf558697b1d4f480e1aa27d7852709b1cc0",
          "latest"
        ],
        id: 1,
      }),
    })
    .then(res => res.json())
    .then(data => setData(data as Data))
    .catch(err => console.error(err))
  }, [])

  if (!data) return <div>Loading...</div>

  return (
    <div>
      {parseInt(data.result, 16)}
    </div>
  )
}