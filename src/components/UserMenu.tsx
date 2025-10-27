import React from "react";
import { Button } from "./ui/button";

export interface UserMenuProps {
  user: {
    email?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {user?.email}
      </span>
      <form action="/api/auth/logout" method="post">
        <Button type="submit" variant="outline" size="sm">
          Logout
        </Button>
      </form>
    </div>
  );
}
