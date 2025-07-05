import { Header } from "./Header";
import { Outlet } from "react-router-dom";

export function Dashboard() {
    return (
      <div className='container'>
        <Header />
        <h1 className="text-xl">Dashboard</h1>
        <Outlet />
      </div>
    )
  }