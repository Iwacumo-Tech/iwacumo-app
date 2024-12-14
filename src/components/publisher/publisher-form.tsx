
// "use client";

// import { zodResolver } from "@hookform/resolvers/zod";
// import { useForm } from "react-hook-form";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { useState } from "react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// import { useToast } from "@/components/ui/use-toast";
// import { trpc } from "@/app/_providers/trpc-provider";
// import {  Publisher } from "@prisma/client";
// import { createPublisherSchema, TCreatePublisherSchema } from "@/server/dtos";

// interface PublisherFormProps {
//   publisher?: Publisher;
//   action: "Add" | "Edit";
// }

// const PublisherForm = ({ publisher, action }: PublisherFormProps) => {
//   const { toast } = useToast();
//   const utils = trpc.useUtils();
//   const [open, setOpen] = useState(false);

//   const form = useForm<TCreatePublisherSchema>({
//     resolver: zodResolver(createPublisherSchema),
//     defaultValues: { custom_domain: publisher?.custom_domain ?? "" },
//   });

//   const addPublisher = trpc.createPublisher.useMutation({
//     onSuccess: async () => {
//       toast({
//         title: "Success",
//         variant: "default",
//         description: "Successfully created an Publisher",
//       });

//       utils.getAllPublisher.invalidate().then(() => {
//         setOpen(false);
//       });
//     },
//     onError: (error) => {
//       console.error(error);

//       toast({
//         title: "Error",
//         variant: "destructive",
//         description: "Error creating publisher",
//       });
//     },
//   });

//   const updatePublisher = trpc.updatePublisher.useMutation({
//     onSuccess: async () => {
//       toast({
//         title: "Success",
//         variant: "default",
//         description: "Successfully updated Author",
//       });

//       utils.getAllPublisher.invalidate().then(() => {
//         setOpen(false);
//       });
//     },
//     onError: (error) => {
//       console.error(error);

//       toast({
//         title: "Error",
//         variant: "destructive",
//         description: "Error updating publisher",
//       });
//     },
//   });

//   const onSubmit = (values: TCreatePublisherSchema) => {
//     if (publisher?.id) {
//       updatePublisher.mutate({
//         ...values,
//         id: publisher.id,
//       });
//     } else {
//       addPublisher.mutate(values);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button size="sm" className={`${action === "Edit" ? "w-full" : ""}`}>
//           {action} Publisher
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="max-h-[80vh] overflow-y-auto space-y-3">
//         <DialogHeader>
//           <DialogTitle>{action} Publisher</DialogTitle>
//         </DialogHeader>
//         <Tabs defaultValue="publisher-details" className="w-[400px]">
//           <TabsList className="grid w-full grid-cols-2">
//             <TabsTrigger value="publisher-details">Publisher Details</TabsTrigger>
//             <TabsTrigger value="role">Publisher Role</TabsTrigger>
//           </TabsList>
//           <TabsContent value="publisher-details">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Publisher Details</CardTitle>
//                 <CardDescription>
//                   Make changes to your publisher here.
//                 </CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-2">
//                 <Form {...form}>
//                   <form onSubmit={form.handleSubmit(onSubmit)}>
//                     <fieldset disabled={form.formState.isSubmitting}>
//                       <div className="grid gap-6">
//                         <FormField
//                           control={form.control}
//                           name="name"
//                           render={({ field }) => (
//                             <FormItem>
//                               <FormLabel className="text-gray-700">Name</FormLabel>
//                               <FormControl>
//                                 <Input
//                                   placeholder="Enter publisher name"
//                                   {...field}
//                                   className="border-gray-300 rounded-md"
//                                 />
//                               </FormControl>
//                               <FormMessage />
//                             </FormItem>
//                           )}
//                         />
//                       </div>
//                       <div className="grid gap-6">
//                         <FormField
//                           control={form.control}
//                           name="website"
//                           render={({ field }) => (
//                             <FormItem>
//                               <FormLabel className="text-gray-700">Website</FormLabel>
//                               <FormControl>
//                                 <Input
//                                   placeholder="Enter webite name"
//                                   {...field}
//                                   className="border-gray-300 rounded-md"
//                                 />
//                               </FormControl>
//                               <FormMessage />
//                             </FormItem>
//                           )}
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <FormField
//                           control={form.control}
//                           name="first_name"
//                           render={({ field }) => (
//                             <FormItem>
//                               <FormLabel className="text-gray-700">First Name</FormLabel>
//                               <FormControl>
//                                 <Input
//                                   placeholder="Enter first name"
//                                   {...field}
//                                   data-cy="user-first-name"
//                                   className="border-gray-300 rounded-md"
//                                 />
//                               </FormControl>
//                               <FormMessage />
//                             </FormItem>
//                           )}
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <FormField
//                           control={form.control}
//                           name="username"
//                           render={({ field }) => (
//                             <FormItem>
//                               <FormLabel className="text-gray-700">UserName</FormLabel>
//                               <FormControl>
//                                 <Input
//                                   placeholder="Enter UserName"
//                                   {...field}
//                                   data-cy="user-username"
//                                   className="border-gray-300 rounded-md"
//                                 />
//                               </FormControl>
//                               <FormMessage />
//                             </FormItem>
//                           )}
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <FormField
//                           control={form.control}
//                           name="email"
//                           render={({ field }) => (
//                             <FormItem>
//                               <FormLabel className="text-gray-700">Email</FormLabel>
//                               <FormControl>
//                                 <Input
//                                   placeholder="example@gmail.com"
//                                   {...field}
//                                   data-cy="user-email"
//                                   className="border-gray-300 rounded-md"
//                                 />
//                               </FormControl>
//                               <FormMessage />
//                             </FormItem>
//                           )}
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <FormField
//                           control={form.control}
//                           name="password"
//                           render={({ field }) => (
//                             <FormItem>
//                               <FormLabel className="text-gray-700">Password</FormLabel>
//                               <FormControl>
//                                 <Input
//                                   placeholder="Enter password"
//                                   {...field}
//                                   data-cy="user-password"
//                                   className="border-gray-300 rounded-md"
//                                   type="password"
//                                 />
//                               </FormControl>
//                               <FormMessage />
//                             </FormItem>
//                           )}
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <FormField
//                           control={form.control}
//                           name="phone_number"
//                           render={({ field }) => (
//                             <FormItem>
//                               <FormLabel className="text-gray-700">Phone Number</FormLabel>
//                               <FormControl>
//                                 <Input
//                                   placeholder="Enter Phone number"
//                                   {...field}
//                                   data-cy="user-phone-no"
//                                   className="border-gray-300 rounded-md"
//                                 />
//                               </FormControl>
//                               <FormMessage />
//                             </FormItem>
//                           )}
//                         />
//                       </div>
//                       <div className="flex justify-end my-5">
//                         <Button
//                           disabled={form.formState.isSubmitting}
//                           className="bg-blue-600 text-white py-2 px-7 rounded-md"
//                           type="submit"
//                           data-cy="publisher-submit"
//                         >
//                           {action === "Add" ? "Proceed" : "Save Changes"}
//                         </Button>
//                       </div>
//                     </fieldset>
//                   </form>
//                 </Form>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="role">

//           </TabsContent>
//         </Tabs>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default PublisherForm;
