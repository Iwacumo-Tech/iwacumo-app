"use client";

import { Link, Sidebar } from ".";
import { BaseSyntheticEvent, Fragment, SetStateAction } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FaChevronLeft } from "react-icons/fa";

interface SidebarMobileProps {
  title?: string;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<SetStateAction<boolean>>;
  logout: (e?: BaseSyntheticEvent) => void;
  links?: Link[];
}

export const SidebarMobile: React.FC<SidebarMobileProps> = ({
  sidebarOpen,
  setSidebarOpen,
  logout,
  links = [],
  title
}) => {
  return (
    <Transition.Root show={sidebarOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50 lg:hidden"
        onClose={setSidebarOpen}
      >
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80" />
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
            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute -right-[0.5rem] bottom-24 flex justify-center">
                  <button
                    type="button"
                    className="bg-white border border-white border-solid rounded-tr-xl rounded-br-xl grid items-center absolute py-1.5 pr-1"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <FaChevronLeft className="size-3" />
                  </button>
                </div>
              </Transition.Child>
              <Sidebar
                title={title}
                links={links}
                logout={logout}
              />
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

