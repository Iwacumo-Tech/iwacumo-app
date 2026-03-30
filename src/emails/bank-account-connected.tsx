import * as React from "react";
import {
  Body, Container, Head, Heading, Hr,
  Html, Preview, Section, Text,
} from "@react-email/components";

// No "use client" — server-only

interface BankAccountConnectedTemplateProps {
  firstName:     string;
  bankName:      string;
  accountName:   string;
  accountNumber: string; // already masked by caller e.g. "****1234"
}

export function BankAccountConnectedTemplate({
  firstName,
  bankName,
  accountName,
  accountNumber,
}: BankAccountConnectedTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Your payout account has been connected — {bankName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>BOOKA.</Heading>
          </Section>
          <Section style={content}>
            <Heading style={h1}>Payout Account Connected<span style={{ color: "#FFD700" }}>.</span></Heading>

            <Text style={paragraph}>
              Hey <strong>{firstName}</strong>, your bank account has been successfully verified
              and connected for payouts.
            </Text>

            <Section style={detailBox}>
              <Text style={detailLabel}>BANK</Text>
              <Text style={detailValue}>{bankName}</Text>
              <Hr style={detailDivider} />
              <Text style={detailLabel}>ACCOUNT NAME</Text>
              <Text style={detailValue}>{accountName}</Text>
              <Hr style={detailDivider} />
              <Text style={detailLabel}>ACCOUNT NUMBER</Text>
              <Text style={detailValue}>{accountNumber}</Text>
            </Section>

            <Text style={paragraph}>
              Your earnings from book sales will now be routed to this account automatically
              whenever a payment is processed. If you did not make this change, please
              contact support immediately.
            </Text>

            <Hr style={hr} />
            <Text style={footer}>
              This notification was sent because a payout account was added or updated on your Booka profile.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#FAF9F6",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};
const container: React.CSSProperties = {
  margin: "0 auto", padding: "20px 0 48px", width: "560px", maxWidth: "100%",
};
const header: React.CSSProperties = { backgroundColor: "#000000", padding: "24px 40px" };
const logo: React.CSSProperties = {
  color: "#FFD700", fontSize: "28px", fontWeight: "900",
  fontStyle: "italic", letterSpacing: "-1px", margin: "0",
};
const content: React.CSSProperties = {
  backgroundColor: "#ffffff", border: "2px solid #000000", padding: "40px",
};
const h1: React.CSSProperties = {
  color: "#0A0A0A", fontSize: "28px", fontWeight: "900",
  fontStyle: "italic", textTransform: "uppercase", margin: "0 0 20px",
};
const paragraph: React.CSSProperties = {
  color: "#444444", fontSize: "15px", lineHeight: "1.6", margin: "0 0 16px",
};
const detailBox: React.CSSProperties = {
  backgroundColor: "#FAF9F6", border: "1px solid #E5E5E5",
  padding: "20px 24px", margin: "20px 0",
};
const detailLabel: React.CSSProperties = {
  color: "#999", fontSize: "9px", fontWeight: "900",
  textTransform: "uppercase", letterSpacing: "2px", margin: "0 0 4px",
};
const detailValue: React.CSSProperties = {
  color: "#000", fontSize: "15px", fontWeight: "700", margin: "0",
};
const detailDivider: React.CSSProperties = {
  border: "none", borderTop: "1px solid #E5E5E5", margin: "12px 0",
};
const hr: React.CSSProperties = {
  border: "none", borderTop: "1px solid #E5E5E5", margin: "24px 0",
};
const footer: React.CSSProperties = { color: "#999999", fontSize: "12px", lineHeight: "1.5" };