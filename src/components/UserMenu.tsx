import React from "react";
import { Button } from "./ui/button";

export function UserMenu() {
  const handleLogout = async () => {};

  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        user@example.com
      </span>
      <form action="/api/auth/logout" method="post">
        <Button type="submit" variant="outline" size="sm">
          Logout
        </Button>
      </form>
    </div>
  );
}
