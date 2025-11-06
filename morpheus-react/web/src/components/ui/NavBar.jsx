import React from "react";
import NavButton from "./NavButton";

export default function NavBar() {
  const buttons = [
    { name: "Home", path: "/main" },
    { name: "AI Advisor", path: "/aiadvisor" },
    { name: "Settings", path: "/settings" },
    { name: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-white shadow-inner p-2 flex justify-around">
      {buttons.map((btn) => (
        <NavButton key={btn.path} name={btn.name} path={btn.path} />
      ))}
    </nav>
  );
}
