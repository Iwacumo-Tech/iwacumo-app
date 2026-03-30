import {
  LuLayoutDashboard, LuUsers, LuUserPlus, LuSettings,
  LuShoppingBag, LuLayers, LuStar,
} from "react-icons/lu";
import { FaBookOpen } from "react-icons/fa";
import { MdDashboardCustomize } from "react-icons/md";
import {
  UserPlusIcon, Image as ImageIcon, Sliders as SliderIcon, Gauge, Store, Percent, Banknote,
} from "lucide-react";

/**
 * requiredPermission: comma-separated role names allowed to see this link.
 * The AppLayout filters links server-side using session.roles.
 */
export const links = [
  {
    name: "Dashboard",
    url: "/app",
    icon: <LuLayoutDashboard className="size-5 mr-2" />,
    requiredPermission: "super-admin, staff-basic, staff-content, staff-publisher, staff-finance, tenant-admin, publisher, author, customer",
  },
  {
    name: "Staff",
    url: "/app/users",
    icon: <LuUsers className="size-5 mr-2" />,
    requiredPermission: "super-admin",
  },
  {
    name: "Publishers",
    url: "/app/publishers",
    icon: <LuUserPlus className="size-5 mr-2" />,
    requiredPermission: "super-admin, staff-publisher, tenant-admin",
  },
  {
    name: "Authors",
    url: "/app/authors",
    icon: <UserPlusIcon className="size-5 mr-2" />,
    requiredPermission: "super-admin, staff-content, staff-publisher, tenant-admin, publisher",
  },
  {
    name: "Books",
    url: "/app/books",
    icon: <FaBookOpen className="size-5 mr-2" />,
    requiredPermission: "super-admin, staff-basic, staff-content, staff-publisher, staff-finance, tenant-admin, publisher, author, customer",
  },
  {
    name: "Orders",
    url: "/app/orders",
    icon: <LuShoppingBag className="size-5 mr-2" />,
    requiredPermission: "super-admin, staff-basic, staff-content, staff-publisher, staff-finance, tenant-admin, publisher, author",
  },
  {
    name: "Customers",
    url: "/app/customers",
    icon: <MdDashboardCustomize className="size-5 mr-2" />,
    requiredPermission: "super-admin, staff-basic, staff-content, staff-publisher, staff-finance, tenant-admin, publisher, author",
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
    requiredPermission: "super-admin, staff-basic, staff-content, staff-publisher, staff-finance, tenant-admin, publisher, author, customer",
  },
  {
    name: "System Settings",
    url: "/app/admin/settings",
    icon: <Gauge className="size-5 mr-2" />,
    requiredPermission: "super-admin, staff-finance",
  },
  {
    name: "Global Featured",
    url: "/app/admin/featured",
    icon: <LuStar className="size-5 mr-2" />,
    requiredPermission: "super-admin, staff-publisher",
  },
  {
    name: "Store Settings",
    url: "/app/settings/store",
    icon: <Store className="size-5 mr-2" />,
    requiredPermission: "publisher",
  },
  {
    name: "Revenue Splits",
    url:  "/app/settings/splits",
    icon: <Percent className="size-5 mr-2" />,
    requiredPermission: "publisher",
  },
  {
    name: "Payout Settings",
    url:  "/app/settings/payment",
    icon: <Banknote className="size-5 mr-2" />, 
    requiredPermission: "publisher, author",
},
];

export type Links = (typeof links)[number];