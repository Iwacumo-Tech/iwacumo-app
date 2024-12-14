import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import Link from "next/link";

const SignUpOption = () => {
  const [selectedOption, setSelectedOption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };

  return (
    <Dialog>
      <DialogTrigger className="text-sm mx-2 cursor-pointer text-blue-600 hover:font-semibold">
        Sign up
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign up as</DialogTitle>
          <DialogDescription>
            <div className=" p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input name="option"
                    value="publisher"
                    checked={selectedOption === "publisher"}
                    onChange={handleOptionChange} type="radio" className="w-6 h-6" />
                  <p>Publisher</p>

                </div>
                <div className="flex items-center gap-2">
                  <input name="option"
                    type="radio"
                    value="author"
                    checked={selectedOption === "author"}
                    onChange={handleOptionChange} className="w-6 h-6" />
                  <p>Author</p>

                </div>
              </div>
              <div className="flex justify-center items-center  p-3 gap-5">
                <DialogClose>
                  <Link
                    onClick={()=> setLoading(true)}
                    href={`/sign-up/${selectedOption}`}
                    className="bg-blue-500 text-white p-3 rounded-sm"
                  >
                    {loading ? "Loading..." : "Continue"}
                  </Link>
                </DialogClose>
                <DialogClose>
                  <Button className="bg-gray border hover:bg-gray2 text-black p-3 rounded-sm">
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default SignUpOption;
