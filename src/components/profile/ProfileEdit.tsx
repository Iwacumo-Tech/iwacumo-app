import { Author, Claim, Publisher, User } from "@prisma/client";
import { Dispatch, SetStateAction, useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { editProfileSchema, TEditProfileSchema } from "@/server/dtos";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/lib/server";
import { trpc } from "@/app/_providers/trpc-provider";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";

interface ProfileProps {
  user: (User & {author: Author | null; publisher: Publisher | null; claims: Claim[]}) | null | undefined;
  setEditProfile: Dispatch<SetStateAction<boolean>>;
}

const ProfileEdit = ({ user, setEditProfile }: ProfileProps) => {
  const form = useForm<TEditProfileSchema>({ resolver: zodResolver(editProfileSchema) });
  const [file, setFile] = useState<File | null>(null);
  const utils = trpc.useUtils();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;

    setFile(selectedFile);
  };

  const updateUser = trpc.updateUserProfile.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully updated the book",
      });

      form.reset();

      utils.getAllUsers.invalidate().then(() => {
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error updating the book",
      });
    },
  });

  const onSubmit = async (values: TEditProfileSchema) => {
    const imageUrl = await uploadImage(file!);

    updateUser.mutate({
      ...values,
      id: user?.id,
      profilePicture: imageUrl
    });
  };

  return (

    <div>
      <div>
        <h2 className="my-8">Profile Edit</h2>

        <div className="my-6 mb-16">
          <div className="flex gap-2 items-center">
            <div className="w-[52px] h-[52px] rounded-full bg-slate-100 flex items-center justify-center font-semibold">
              {user?.author?.profile_picture ? <Image src={user.author.profile_picture} alt="img" className="w-full h-full object-cover rounded-full" width={100} height={100} /> : "JD"}
            </div>
            <div>
              <label
                htmlFor="fileUpload"
                className="cursor-pointer w-full px-4 py-2 text-slate-100 rounded-md flex items-center gap-3"
              >
                <span className="bg-blue-700 p-1 text-sm rounded">Upload File</span>
                {file && (
                  <p className="mt-2 text-sm text-gray-700">
                    {file.name}
                  </p>
                )}
              </label>
              <input
                id="fileUpload"
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
          <p className="text-slate-500 my-2 text-sm w-[500px]"><span className="text-yellow-400">Warning: </span> Please note that only JPEG and PNG image files are accepted. Any files in other formats will not be processed. </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-[550px]">
            <FormField
              control={form.control}
              name="bio"
              //   defaultValue={user?.publisher?.id ? user.publisher.bio : user?.author?.bio}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Talk about yourself..."
                      {...field}
                      className="border-gray-300 rounded-md h-32"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-3">
              <button disabled={form.formState.isSubmitting} type="submit" className="bg-green-500 text-white p-2 px-8 my-10 rounded-3xl">{form.formState.isSubmitting ? "Loading..." : "Submit"}</button>
              <button onClick={() => setEditProfile(false)} className="bg-red-500 text-white p-2 px-8 my-10 rounded-3xl">Close</button>
            </div>

          </form>
        </Form>

      </div>
    </div>
  );
};

export default ProfileEdit;
