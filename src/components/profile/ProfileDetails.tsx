import { Author, Claim, Publisher, User } from "@prisma/client";
import Image from "next/image";
import { Dispatch, SetStateAction } from "react";

interface ProfileProps {
  user: (User & {author: Author | null; publisher: Publisher | null; claims: Claim[]}) | null | undefined;
  setEditProfile: Dispatch<SetStateAction<boolean>>;
}

const ProfileDetails = ({ user, setEditProfile }: ProfileProps) => {
  return (

    <div>
      <div>
        <h2 className="my-8">Profile Details</h2>

        <div className="flex justify-between items-center my-6 mb-16">
          <div className="flex gap-2 items-center">
            <div className="w-[50px] h-[50px] rounded-full bg-slate-100 text-center">
              {user?.author?.profile_picture ? <Image src={user.author.profile_picture} alt="img" className="w-full h-full object-cover rounded-full" width={100} height={100} /> : "JD"}
            </div>
            <div>
              <p className="text-slate-500 text-sm">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div>
            <button onClick={()=>setEditProfile(true)} className="p-2 rounded-3xl text-sm text-slate-500 border">Edit Profile</button>
          </div>
        </div>

        <div className="grid grid-cols-2">
          <h2 className="col-span-2 text-slate-400 text-sm mb-2">Personal Information</h2>
          <div>
            <p className="text-sm text-slate-400">Full Name</p>
            <p>{user?.first_name} {user?.last_name}</p>
          </div>

          <div>
            <p className="text-sm text-slate-400">Email Address</p>
            <p>{user?.email}</p>
          </div>

          <h2 className="col-span-2 mt-6 text-slate-400 text-sm mb-2">{user?.publisher ? "Publisher" : "Author"} Information</h2>
          <div>
            <p className="text-sm text-slate-400">Bio</p>
            <p>{user?.publisher ? user?.publisher.slug : user?.author?.bio}</p>
          </div>

          <div>
            <p className="text-sm text-slate-400">Phone No</p>
            <p>{user?.phone_number}</p>
          </div>

          <h2 className="col-span-2 mt-6 text-slate-400 text-sm mb-2">Organization Details</h2>
          <div>
            <p className="text-sm text-slate-400">Name</p>
            <p> {user?.claims[0].tenant_slug}</p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfileDetails;
