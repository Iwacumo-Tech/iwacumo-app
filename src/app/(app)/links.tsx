import { LuLayoutDashboard, LuUsers, LuUserPlus, LuSettings, LuShoppingBag, LuFileText, LuLayers } from "react-icons/lu";
import { FaBookOpen } from "react-icons/fa";
import { MdDashboardCustomize } from "react-icons/md";
import { UserPlusIcon, Image as ImageIcon, Sliders as SliderIcon } from "lucide-react";

/**
 * Navigation Links Configuration
 * requiredPermission: comma-separated list of roles allowed to see the link.
 */
export const links = [
  {
    name: "Dashboard",
    url: "/app",
    icon: <LuLayoutDashboard className="size-5 mr-2" />,
    requiredPermission: "super-admin, tenant-admin, publisher, author, customer",
  },
  {
    name: "Users",
    url: "/app/users",
    icon: <LuUsers className="size-5 mr-2" />,
    requiredPermission: "super-admin",
  },
  {
    name: "Tenants",
    url: "/app/tenants",
    icon: <LuLayers className="size-5 mr-2" />,
    requiredPermission: "super-admin",
  },
  {
    name: "Publishers",
    url: "/app/publishers",
    icon: <LuUserPlus className="size-5 mr-2" />,
    requiredPermission: "super-admin, tenant-admin",
  },
  {
    name: "Authors",
    url: "/app/authors",
    icon: <UserPlusIcon className="size-5 mr-2" />,
    requiredPermission: "super-admin, tenant-admin, publisher",
  },
  {
    name: "Books",
    url: "/app/books",
    icon: <FaBookOpen className="size-5 mr-2" />,
    requiredPermission: "super-admin, tenant-admin, publisher, author, customer",
  },
  {
    name: "Orders",
    url: "/app/orders",
    icon: <LuShoppingBag className="size-5 mr-2" />,
    requiredPermission: "super-admin, tenant-admin, publisher, author",
  },
  {
    name: "Customers",
    url: "/app/customers",
    icon: <MdDashboardCustomize className="size-5 mr-2" />,
    requiredPermission: "super-admin, tenant-admin, publisher, author",
  },
  {
    name: "Hero Slider",
    url: "/app/heroslider",
    icon: <SliderIcon className="size-5 mr-2" />,
    requiredPermission: "super-admin",
  },
  {
    name: "Banner",
    url: "/app/banner",
    icon: <ImageIcon className="size-5 mr-2" />,
    requiredPermission: "super-admin",
  },
  {
    name: "Profile",
    url: "/app/profile",
    icon: <LuSettings className="size-5 mr-2" />,
    requiredPermission: "super-admin, tenant-admin, publisher, author, customer",
  },
];

export type Links = (typeof links)[number];