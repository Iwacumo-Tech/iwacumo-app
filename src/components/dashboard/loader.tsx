"use client";

import Image from "next/image";
import React from "react";

const Loader = () => {
  return (
    <div className="flex h-dvh w-full items-center justify-center">
      <div className="animate-bounce">
        <Image src={"https://walrus-assets.s3.amazonaws.com/img/Cyca_Books_1800.jpg"} alt="Logo picture" width={70} height={70} className="rounded-full" />
      </div>
    </div>
  );
};

export default Loader;
