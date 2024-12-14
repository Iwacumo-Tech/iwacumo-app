// NB: Do not add "use client" to this file if you want to build links
// using server side session data like user roles or permissions
import { LuLayoutDashboard } from "react-icons/lu";
import { FaBookOpen } from "react-icons/fa";
import { MdDashboardCustomize } from "react-icons/md";
import { UserPlusIcon } from "lucide-react";

export const links = [
  {
    name: "Home",
    url: "/app",
    icon: <LuLayoutDashboard className="size-5 mr-2" />,
    requiredPermission: "super-admin, publisher, author"
  },
  {
    name: "Users",
    url: "/app/users",
    icon: <LuLayoutDashboard className="size-5 mr-2" />,
    requiredPermission: "super-admin"
  },
  {
    name: "Authors",
    url: "/app/authors",
    icon: <LuLayoutDashboard className="size-5 mr-2" />,
    requiredPermission: "super-admin, owner, publisher"
  },
  {
    name: "Customers",
    url: "/app/customers",
    icon: <MdDashboardCustomize className="size-5 mr-2" />,
    requiredPermission: "super-admin, owner, publisher, author"
  },
  {
    name: "Books",
    url: "/app/books",
    icon: <FaBookOpen  className="size-5 mr-2" />,
    requiredPermission: "super-admin, owner, publisher, author"
  },
  {
    name: "Publishers",
    url: "/app/publishers",
    icon: <LuLayoutDashboard className="size-5 mr-2" />,
    requiredPermission: "super-admin, owner"
  },
  {
    name: "Profile",
    url: "/app/profile",
    icon: <UserPlusIcon className="size-5 mr-2" />,
    requiredPermission: "super-admin, owner, publisher, author"
  },
];

export type Links = (typeof links)[number];

