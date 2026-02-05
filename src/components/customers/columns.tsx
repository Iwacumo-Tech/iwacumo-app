import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Edit3, Mail, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import DeleteCustomerModal from "./delete-customer";
import CustomerForm from "./customer-form";
import { cn } from "@/lib/utils";

const menuButtonStyle = "w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors rounded-none outline-none border-none bg-transparent text-black shadow-none";

function CustomerAction({ customer }: { customer: any }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 border-2 border-transparent hover:border-black rounded-none">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none border-4 border-black gumroad-shadow w-56 p-0 bg-white">
        <DropdownMenuLabel className="font-black uppercase italic text-[10px] opacity-40 px-3 py-2 border-b-2 border-black/10">
          Profile Control
        </DropdownMenuLabel>
        
        <CustomerForm 
          action="Edit" 
          customer={customer} 
          trigger={<div className={menuButtonStyle}><Edit3 size={14} /> Update Info</div>}
        />

        <DropdownMenuSeparator className="bg-black m-0 h-[2px]" />

        <DeleteCustomerModal id={customer.id} trigger={<div className={cn(menuButtonStyle, "text-red-600")}><Trash2 size={14} /> Delete Profile</div>} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const customerColumns: ColumnDef<any>[] = [
  {
    accessorKey: "user.first_name",
    header: "Full Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center font-black italic shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          {row.original.user?.first_name?.[0]}
        </div>
        <span className="font-black uppercase italic text-xs tracking-tight">
          {row.original.user?.first_name} {row.original.user?.last_name}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "email",
    id: "email", // Linked to DataTable filter
    accessorFn: (row) => row.user?.email,
    header: "Contact Email",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-[10px] font-bold opacity-60 uppercase italic">
        <Mail size={12} /> {row.original.user?.email}
      </div>
    ),
  },
  {
    accessorKey: "user.phone_number",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-[10px] font-black border-2 border-black/10 px-2 py-0.5">
        {row.original.user?.phone_number || "N/A"}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <CustomerAction customer={row.original} />,
  },
];