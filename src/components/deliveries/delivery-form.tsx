"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import {
  createDeliveryTrackingSchema,
  TCreateDeliveryTrackingSchema,
  updateDeliveryTrackingSchema,
  TUpdateDeliveryTrackingSchema,
} from "@/server/dtos";
import { useState } from "react";
import { DeliveryTracking } from "@prisma/client";

interface DeliveryFormProps {
  orderId: string;
  orderLineItems?: Array<{
    id: string;
    book_variant?: {
      book?: {
        title: string;
      };
      format: string;
    } | null;
  }>;
  delivery?: DeliveryTracking | null;
  onSuccess?: () => void;
}

export default function DeliveryForm({
  orderId,
  orderLineItems = [],
  delivery,
  onSuccess,
}: DeliveryFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const isEdit = !!delivery;

  const form = useForm<TCreateDeliveryTrackingSchema | TUpdateDeliveryTrackingSchema>({
    resolver: zodResolver(
      isEdit ? updateDeliveryTrackingSchema : createDeliveryTrackingSchema
    ),
    defaultValues: isEdit
      ? {
          id: delivery.id,
          carrier: delivery.carrier,
          service_level: delivery.service_level || undefined,
          tracking_number: delivery.tracking_number,
          tracking_url: delivery.tracking_url || undefined,
          estimated_delivery_at: delivery.estimated_delivery_at
            ? new Date(delivery.estimated_delivery_at)
            : undefined,
          status: delivery.status as any,
        }
      : {
          order_id: orderId,
          carrier: "",
          service_level: undefined,
          tracking_number: "",
          tracking_url: undefined,
          estimated_delivery_at: undefined,
          status: "pending",
        },
  });

  const createDelivery = trpc.createDeliveryTracking.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Delivery tracking created successfully",
      });
      await utils.getDeliveriesByOrder.invalidate({ order_id: orderId });
      await utils.getOrdersNeedingShipping.invalidate();
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        variant: "destructive",
        description: error.message || "Failed to create delivery tracking",
      });
    },
  });

  const updateDelivery = trpc.updateDeliveryTracking.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Delivery tracking updated successfully",
      });
      await utils.getDeliveriesByOrder.invalidate({ order_id: orderId });
      await utils.getOrdersNeedingShipping.invalidate();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        variant: "destructive",
        description: error.message || "Failed to update delivery tracking",
      });
    },
  });

  const onSubmit = (values: TCreateDeliveryTrackingSchema | TUpdateDeliveryTrackingSchema) => {
    if (isEdit) {
      updateDelivery.mutate(values as TUpdateDeliveryTrackingSchema);
    } else {
      // Convert "none" to undefined for order_lineitem_id
      const createValues = {
        ...values,
        order_lineitem_id: (values as any).order_lineitem_id === "none" 
          ? undefined 
          : ((values as any).order_lineitem_id as string | undefined),
      } as TCreateDeliveryTrackingSchema;
      createDelivery.mutate(createValues);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          {isEdit ? "Edit Delivery" : "Create Delivery Tracking"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Delivery Tracking" : "Create Delivery Tracking"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {orderLineItems.length > 1 && !isEdit && (
              <FormField
                control={form.control}
                name="order_lineitem_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Line Item (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item (leave empty for entire order)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Entire Order</SelectItem>
                        {orderLineItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.book_variant?.book?.title || "Unknown"} -{" "}
                            {item.book_variant?.format || "N/A"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="carrier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carrier *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., DHL, FedEx, UPS, Local Courier" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="express">Express</SelectItem>
                      <SelectItem value="overnight">Overnight</SelectItem>
                      <SelectItem value="economy">Economy</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tracking_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter tracking number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tracking_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://tracking.example.com/..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimated_delivery_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Delivery Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => {
                        field.onChange(e.target.value ? new Date(e.target.value) : undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEdit
                  ? "Update"
                  : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

