"use client";

import { Fragment, SetStateAction } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FaChevronLeft } from "react-icons/fa";
import { Sidebar } from "./sidebar";
import { type Link } from "./dashboard-shell";

interface SidebarMobileProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<SetStateAction<boolean>>;
  logout: (e?: React.BaseSyntheticEvent) => void;
  links?: Link[];
}

export const SidebarMobile: React.FC<SidebarMobileProps> = ({
  sidebarOpen,
  setSidebarOpen,
  logout,
  links = [],
}) => {
  return (
    <Transition.Root show={sidebarOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative flex w-full max-w-xs flex-1 border-r-4 border-black bg-white">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute right-[-52px] top-4">
                  <button
                    type="button"
                    className="bg-accent border-4 border-black flex items-center justify-center w-10 h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <FaChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </Transition.Child>

              {/* Sidebar component inside the panel */}
              <div className="flex flex-col w-full overflow-hidden">
                <Sidebar
                  links={links}
                  logout={logout}
                />
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};