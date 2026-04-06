import * as React from "react";
import {
  Body, Button, Container, Head, Heading,
  Hr, Html, Preview, Section, Text, Row, Column,
} from "@react-email/components";

// No "use client" — email templates are server-only

interface OrderItem {
  title:    string;
  type:     string;
  quantity: number;
  price:    number;
}

interface OrderConfirmationTemplateProps {
  firstName:     string;
  orderNumber:   string;
  orderDate:     string;       // pre-formatted, e.g. "28 March 2026"
  items:         OrderItem[];
  subtotal:      number;
  shippingCost:  number;
  total:         number;
  isDigitalOnly: boolean;
  deliveryState?: string;      // e.g. "Lagos" — only for physical orders
  shippingZone?:  string;      // e.g. "Z4"
  dashboardUrl:  string;
}

export function OrderConfirmationTemplate({
  firstName,
  orderNumber,
  orderDate,
  items,
  subtotal,
  shippingCost,
  total,
  isDigitalOnly,
  deliveryState,
  shippingZone,
  dashboardUrl,
}: OrderConfirmationTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Order confirmed — {orderNumber}. Your books are on their way!</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>IWACUMO.</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Order Confirmed<span style={{ color: "#FFD700" }}>.</span></Heading>

            <Text style={paragraph}>
              Hey <strong>{firstName}</strong>, your order is confirmed and payment has been received.
              {isDigitalOnly
                ? " Your digital books are ready to read in your library."
                : " We'll get your physical copies dispatched shortly."}
            </Text>

            {/* Order meta */}
            <Section style={metaBox}>
              <Row>
                <Column style={metaCol}>
                  <Text style={metaLabel}>ORDER NUMBER</Text>
                  <Text style={metaValue}>{orderNumber}</Text>
                </Column>
                <Column style={metaCol}>
                  <Text style={metaLabel}>DATE</Text>
                  <Text style={metaValue}>{orderDate}</Text>
                </Column>
                {!isDigitalOnly && deliveryState && (
                  <Column style={metaCol}>
                    <Text style={metaLabel}>SHIP TO</Text>
                    <Text style={metaValue}>
                      {deliveryState}
                      {shippingZone ? ` (${shippingZone})` : ""}
                    </Text>
                  </Column>
                )}
              </Row>
            </Section>

            <Hr style={hr} />

            {/* Line items */}
            <Text style={sectionTitle}>ITEMS</Text>
            {items.map((item, i) => (
              <Row key={i} style={itemRow}>
                <Column style={{ width: "60%" }}>
                  <Text style={itemTitle}>{item.title}</Text>
                  <Text style={itemMeta}>
                    {item.type} · Qty {item.quantity}
                  </Text>
                </Column>
                <Column style={{ width: "40%", textAlign: "right" }}>
                  <Text style={itemPrice}>₦{(item.price * item.quantity).toLocaleString()}</Text>
                </Column>
              </Row>
            ))}

            <Hr style={hr} />

            {/* Totals */}
            <Row style={totalRow}>
              <Column style={{ width: "60%" }}>
                <Text style={totalLabel}>Subtotal</Text>
              </Column>
              <Column style={{ width: "40%", textAlign: "right" }}>
                <Text style={totalValue}>₦{subtotal.toLocaleString()}</Text>
              </Column>
            </Row>

            <Row style={totalRow}>
              <Column style={{ width: "60%" }}>
                <Text style={totalLabel}>Shipping</Text>
              </Column>
              <Column style={{ width: "40%", textAlign: "right" }}>
                <Text style={totalValue}>
                  {isDigitalOnly ? "Free (digital)" : `₦${shippingCost.toLocaleString()}`}
                </Text>
              </Column>
            </Row>

            <Row style={{ ...totalRow, borderTop: "2px solid #000", paddingTop: "12px" }}>
              <Column style={{ width: "60%" }}>
                <Text style={{ ...totalLabel, fontWeight: "900", fontSize: "16px" }}>TOTAL PAID</Text>
              </Column>
              <Column style={{ width: "40%", textAlign: "right" }}>
                <Text style={{ ...totalValue, fontWeight: "900", fontSize: "20px", fontStyle: "italic" }}>
                  ₦{total.toLocaleString()}
                </Text>
              </Column>
            </Row>

            <Hr style={hr} />

            {/* CTA */}
            <Text style={paragraph}>
              {isDigitalOnly
                ? "Head to your dashboard to start reading immediately."
                : "You'll receive a shipping notification with your tracking number once your order is dispatched."}
            </Text>

            <Section style={buttonContainer}>
              <Button href={dashboardUrl} style={button}>
                {isDigitalOnly ? "READ MY BOOKS" : "TRACK MY ORDER"}
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Questions? Reply to this email or visit our support page.
              This confirmation was sent to you because you placed an order on IWACUMO.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: "#FAF9F6",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};
const container: React.CSSProperties = {
  margin: "0 auto", padding: "20px 0 48px", width: "560px", maxWidth: "100%",
};
const header: React.CSSProperties = {
  backgroundColor: "#000000", padding: "24px 40px",
};
const logo: React.CSSProperties = {
  color: "#FFD700", fontSize: "28px", fontWeight: "900",
  fontStyle: "italic", letterSpacing: "-1px", margin: "0",
};
const content: React.CSSProperties = {
  backgroundColor: "#ffffff", border: "2px solid #000000", padding: "40px",
};
const h1: React.CSSProperties = {
  color: "#0A0A0A", fontSize: "32px", fontWeight: "900",
  fontStyle: "italic", textTransform: "uppercase", margin: "0 0 16px",
};
const paragraph: React.CSSProperties = {
  color: "#444444", fontSize: "15px", lineHeight: "1.6", margin: "0 0 16px",
};
const metaBox: React.CSSProperties = {
  backgroundColor: "#FAF9F6", border: "1px solid #E5E5E5",
  padding: "16px", margin: "16px 0",
};
const metaCol: React.CSSProperties = { paddingRight: "24px" };
const metaLabel: React.CSSProperties = {
  color: "#999", fontSize: "9px", fontWeight: "900",
  textTransform: "uppercase", letterSpacing: "2px", margin: "0 0 4px",
};
const metaValue: React.CSSProperties = {
  color: "#000", fontSize: "13px", fontWeight: "700", margin: "0",
};
const sectionTitle: React.CSSProperties = {
  color: "#000", fontSize: "10px", fontWeight: "900",
  textTransform: "uppercase", letterSpacing: "3px", margin: "0 0 12px",
};
const itemRow: React.CSSProperties = {
  borderBottom: "1px solid #F0F0F0", paddingBottom: "12px", marginBottom: "12px",
};
const itemTitle: React.CSSProperties = {
  color: "#000", fontSize: "14px", fontWeight: "700",
  fontStyle: "italic", margin: "0 0 2px",
};
const itemMeta: React.CSSProperties = {
  color: "#999", fontSize: "10px", fontWeight: "700",
  textTransform: "uppercase", letterSpacing: "1px", margin: "0",
};
const itemPrice: React.CSSProperties = {
  color: "#000", fontSize: "14px", fontWeight: "900", margin: "0",
};
const totalRow: React.CSSProperties = { marginBottom: "8px" };
const totalLabel: React.CSSProperties = {
  color: "#666", fontSize: "12px", fontWeight: "700",
  textTransform: "uppercase", letterSpacing: "1px", margin: "0",
};
const totalValue: React.CSSProperties = {
  color: "#000", fontSize: "13px", fontWeight: "700", margin: "0",
};
const buttonContainer: React.CSSProperties = { textAlign: "center", margin: "28px 0" };
const button: React.CSSProperties = {
  backgroundColor: "#FFD700", border: "2px solid #000000", color: "#000000",
  display: "inline-block", fontSize: "13px", fontWeight: "900",
  letterSpacing: "2px", padding: "16px 40px",
  textDecoration: "none", textTransform: "uppercase",
};
const hr: React.CSSProperties = {
  border: "none", borderTop: "1px solid #E5E5E5", margin: "24px 0",
};
const footer: React.CSSProperties = {
  color: "#999999", fontSize: "12px", lineHeight: "1.5",
};