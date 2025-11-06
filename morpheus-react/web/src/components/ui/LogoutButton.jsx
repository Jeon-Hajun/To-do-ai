import React from "react";
import { logout } from "../../utils/auth";

export default function LogoutButton() {
  return (
    <button
      onClick={logout}
      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
    >
      Logout
    </button>
  );
}
