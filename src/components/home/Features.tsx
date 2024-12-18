import { Truck, RotateCcw, Wallet, HeadphonesIcon } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Free Shipping Item",
    description: "Orders over $500",
  },
  {
    icon: RotateCcw,
    title: "Money Back Guarantee",
    description: "100% money back",
  },
  {
    icon: Wallet,
    title: "Cash On Delivery",
    description: "Lorem ipsum dolor amet",
  },
  {
    icon: HeadphonesIcon,
    title: "Help & Support",
    description: "Call us : + 0123.4567.89",
  },
];

export default function Features () {
  return (
    <div className="container px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-4 bg-white rounded-lg border"
          >
            <feature.icon className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-medium">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
